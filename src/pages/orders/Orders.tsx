import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Package, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  CreditCard, 
  Loader2, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { getUserOrders, cancelOrder } from '../../services/orderService';
import type { Order, OrderStatus } from '../../types/order';

export default function Orders() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const userOrders = await getUserOrders(user.uid);
      setOrders(userOrders);
      if (userOrders.length > 0) {
        setExpandedOrderId(userOrders[0].id);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.resolve().then(() => {
      fetchOrders();
    });
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      setCancellingId(orderId);
      await cancelOrder(orderId, "Cancelled by customer");
      toast.success("Order cancelled successfully");
      await fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green border border-brand-green/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'processing':
      case 'confirmed':
      case 'packed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing
          </span>
        );
      case 'shipped':
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5" /> Out for Delivery
          </span>
        );
      default: // pending
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Order Placed (Pending)
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>My Orders | ISAR Marketplace</title>
        <meta name="description" content="View your order history and track order status at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-navy">My Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Track and manage your recent purchases</p>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchOrders(); }}
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-navy hover:text-primary transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-modern p-8 md:p-12 text-center border border-gray-100 max-w-md mx-auto">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
              <Package className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-navy mb-2">No Orders Found</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              You haven't placed any orders yet. Start shopping and your orders will appear right here!
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-md w-full"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order.id;

              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-2xl shadow-modern border border-gray-100 overflow-hidden transition-all"
                >
                  {/* Order Header / Bar */}
                  <div 
                    onClick={() => toggleExpand(order.id)}
                    className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-navy text-sm md:text-base">
                            {order.orderNumber}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Items: <span className="font-semibold text-navy">{order.items.length}</span> • Total: <span className="font-bold text-primary">৳{order.totalAmount.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-semibold text-navy block">
                          Payment: {order.paymentMethod.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-gray-400 block">
                          COD / Pay on Delivery
                        </span>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-navy transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Order Details Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 md:px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/30 space-y-6">
                      
                      {/* Order Items List */}
                      <div>
                        <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Order Items</h4>
                        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="p-3 md:p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <img 
                                  src={item.image || 'https://via.placeholder.com/80'} 
                                  alt={item.productName} 
                                  className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                                />
                                <div className="min-w-0">
                                  <Link to={`/products/${item.productId}`} className="text-xs md:text-sm font-semibold text-navy hover:text-primary transition-colors line-clamp-1">
                                    {item.productName}
                                  </Link>
                                  <p className="text-[11px] text-gray-500">Qty: {item.quantity} × ৳{item.price.toLocaleString()}</p>
                                </div>
                              </div>
                              <span className="text-xs md:text-sm font-extrabold text-navy">
                                ৳{(item.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Address & Summary Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        
                        {/* Address */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2">
                          <h4 className="font-bold text-navy flex items-center gap-1.5 text-sm">
                            <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                          </h4>
                          <p className="font-semibold text-navy">{order.shippingAddress.fullName}</p>
                          <p className="text-gray-600">{order.shippingAddress.phone}</p>
                          <p className="text-gray-600">{order.shippingAddress.fullAddress}, {order.shippingAddress.upazila}, {order.shippingAddress.district}, {order.shippingAddress.division}</p>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2">
                          <h4 className="font-bold text-navy flex items-center gap-1.5 text-sm">
                            <CreditCard className="w-4 h-4 text-brand-green" /> Payment Breakdown
                          </h4>
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-bold text-navy">৳{order.subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Delivery Fee:</span>
                            <span className="font-bold text-navy">৳{order.deliveryFee.toLocaleString()}</span>
                          </div>
                          {order.discount > 0 && (
                            <div className="flex justify-between text-brand-green">
                              <span>Discount:</span>
                              <span className="font-bold">-৳{order.discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-extrabold text-navy pt-2 border-t border-gray-100">
                            <span>Total Amount:</span>
                            <span className="text-primary">৳{order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                      </div>

                      {/* Action Buttons */}
                      {order.status === 'pending' && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingId === order.id}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors border border-red-200 flex items-center gap-2 disabled:opacity-50"
                          >
                            {cancellingId === order.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling...
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" /> Cancel Order
                              </>
                            )}
                          </button>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}