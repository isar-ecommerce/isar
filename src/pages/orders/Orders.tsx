import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  AlertCircle, 
  Search, 
  Printer, 
  ShieldCheck, 
  Calendar 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { getUserOrders, cancelOrder } from '../../services/orderService';
import type { Order, OrderStatus } from '../../types/order';

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
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
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        fetchOrders();
      }
    });
    return () => {
      isMounted = false;
    };
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

  const handleViewInvoice = (order: Order) => {
    navigate('/order-success', {
      state: { order },
    });
  };

  // তারিখ ফরম্যাট হেল্পার
  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return 'Recent';
    try {
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
        const dateObj = (timestamp as { toDate: () => Date }).toDate();
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      return 'Recent';
    }
    return 'Recent';
  };

  // স্ট্যাটাস স্টেপ নাম্বার নির্ণয়
  const getStepProgress = (status: OrderStatus): number => {
    switch (status) {
      case 'pending':
        return 1;
      case 'confirmed':
      case 'processing':
      case 'packed':
        return 2;
      case 'shipped':
      case 'out_for_delivery':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return 0;
      default:
        return 1;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-brand-green/10 text-brand-green border border-brand-green/20">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-600 border border-red-200">
            <XCircle className="w-3.5 h-3.5 shrink-0" /> Cancelled
          </span>
        );
      case 'processing':
      case 'confirmed':
      case 'packed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" /> Processing
          </span>
        );
      case 'shipped':
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5 shrink-0" /> Out for Delivery
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Order Placed
          </span>
        );
    }
  };

  // সার্চ কুয়েরি অনুযায়ী ফিল্টার
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.orderNumber?.toLowerCase().includes(q) ||
      order.customerPhone?.toLowerCase().includes(q) ||
      order.shippingAddress?.fullName?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-bold">Loading your orders & live status...</p>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>My Orders & Live Tracking | ISAR Marketplace</title>
        <meta name="description" content="Track your parcel delivery timeline, view invoice, and manage your recent purchases at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-navy">My Orders & Live Tracking</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Real-time parcel delivery status, invoices, and purchase history</p>
          </div>
          
          <button 
            onClick={() => { setLoading(true); fetchOrders(); }}
            className="px-4 py-2.5 bg-white rounded-2xl shadow-xs border border-gray-200 text-navy hover:text-primary transition-all flex items-center gap-2 text-xs font-bold cursor-pointer hover:border-primary"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
          </button>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID (e.g. ISAR-2026-XXXX) or Phone Number..."
            className="w-full text-xs sm:text-sm text-navy bg-transparent focus:outline-none placeholder-gray-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-gray-400 hover:text-navy px-2 py-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Orders List / Empty State */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-modern p-8 md:p-12 text-center border border-gray-100 max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto">
              <Package className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-navy">
              {searchQuery ? 'No Matching Order Found' : 'No Orders Found Yet'}
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              {searchQuery 
                ? 'Please check your Order Tracking ID and try searching again.' 
                : "You haven't placed any orders yet. Start shopping authentic products today!"}
            </p>
            {!searchQuery && (
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-extrabold py-3.5 px-8 rounded-2xl text-xs sm:text-sm transition-all shadow-md w-full cursor-pointer hover:scale-102"
              >
                Start Shopping <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const currentStep = getStepProgress(order.status);
              const isCancelled = order.status === 'cancelled';

              return (
                <div 
                  key={order.id}
                  className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden transition-all"
                >
                  {/* Order Summary Header Bar */}
                  <div 
                    onClick={() => toggleExpand(order.id)}
                    className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-black text-navy text-sm sm:text-base tracking-wide">
                            {order.orderNumber}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                          <span>{order.items?.length || 0} Item(s)</span>
                          <span>•</span>
                          <span className="font-bold text-primary">৳{order.totalAmount?.toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-bold text-navy block uppercase">
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'bKash Online'}
                        </span>
                        <span className="text-[11px] text-gray-400 block font-medium">
                          {order.paymentStatus === 'paid' ? '✓ Paid' : 'Payment on Delivery'}
                        </span>
                      </div>
                      <div className="p-2 text-gray-400 hover:text-navy transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Accordion Content */}
                  {isExpanded && (
                    <div className="px-5 sm:px-8 pb-8 pt-4 border-t border-gray-100 bg-gray-50/40 space-y-6">
                      
                      {/* 1. Live Visual Order Tracking Timeline Stepper */}
                      {!isCancelled ? (
                        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-gray-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-2">
                              <Truck className="w-4 h-4 text-primary" /> Live Delivery Timeline
                            </h4>
                            <span className="text-[11px] font-bold text-gray-400">
                              Estimated Delivery: 2-3 Days
                            </span>
                          </div>

                          {/* Stepper Graphic */}
                          <div className="grid grid-cols-4 gap-2 pt-2 text-center relative">
                            
                            {/* Step 1: Placed */}
                            <div className="flex flex-col items-center gap-2 relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 1 ? 'bg-brand-green text-white shadow-md shadow-brand-green/20' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`text-[11px] sm:text-xs font-bold block ${currentStep >= 1 ? 'text-navy' : 'text-gray-400'}`}>
                                  Order Placed
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium hidden sm:block">Received</span>
                              </div>
                            </div>

                            {/* Step 2: Packed */}
                            <div className="flex flex-col items-center gap-2 relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 2 ? 'bg-brand-green text-white shadow-md shadow-brand-green/20' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`text-[11px] sm:text-xs font-bold block ${currentStep >= 2 ? 'text-navy' : 'text-gray-400'}`}>
                                  Packed & Ready
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium hidden sm:block">QC Verified</span>
                              </div>
                            </div>

                            {/* Step 3: Shipped */}
                            <div className="flex flex-col items-center gap-2 relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 3 ? 'bg-brand-green text-white shadow-md shadow-brand-green/20' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <Truck className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`text-[11px] sm:text-xs font-bold block ${currentStep >= 3 ? 'text-navy' : 'text-gray-400'}`}>
                                  With Courier
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium hidden sm:block">Steadfast/Pathao</span>
                              </div>
                            </div>

                            {/* Step 4: Delivered */}
                            <div className="flex flex-col items-center gap-2 relative z-10">
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                currentStep >= 4 ? 'bg-brand-green text-white shadow-md shadow-brand-green/20' : 'bg-gray-100 text-gray-400'
                              }`}>
                                <ShieldCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`text-[11px] sm:text-xs font-bold block ${currentStep >= 4 ? 'text-brand-green font-extrabold' : 'text-gray-400'}`}>
                                  Delivered
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium hidden sm:block">To Customer</span>
                              </div>
                            </div>

                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-center gap-3 text-red-700 text-xs font-bold">
                          <XCircle className="w-5 h-5 shrink-0" />
                          <span>This order was cancelled. If you need any assistance, please contact our support team.</span>
                        </div>
                      )}

                      {/* 2. Order Items List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-navy uppercase tracking-wider">Purchased Products</h4>
                        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <img 
                                  src={item.image || 'https://via.placeholder.com/80'} 
                                  alt={item.productName} 
                                  className="w-14 h-14 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                                />
                                <div className="min-w-0">
                                  <Link 
                                    to={`/products/${item.productId}`} 
                                    className="text-xs sm:text-sm font-extrabold text-navy hover:text-primary transition-colors line-clamp-1 block"
                                  >
                                    {item.productName}
                                  </Link>
                                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                    Qty: {item.quantity} × ৳{item.price?.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs sm:text-sm font-black text-navy shrink-0 font-mono">
                                ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3. Delivery Address & Payment Breakdown Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        
                        {/* Address */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-2.5">
                          <h4 className="font-black text-navy flex items-center gap-2 text-xs sm:text-sm">
                            <MapPin className="w-4 h-4 text-primary" /> Delivery Address
                          </h4>
                          <div className="space-y-1 text-gray-600 font-medium">
                            <p className="font-bold text-navy text-xs sm:text-sm">{order.shippingAddress?.fullName}</p>
                            <p>{order.shippingAddress?.phone}</p>
                            <p className="leading-relaxed">
                              {order.shippingAddress?.fullAddress}, {order.shippingAddress?.upazila}, {order.shippingAddress?.district}, {order.shippingAddress?.division}
                            </p>
                            {order.shippingAddress?.deliveryNotes && (
                              <p className="text-[11px] text-gray-400 italic pt-1">
                                Note: {order.shippingAddress.deliveryNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-2.5">
                          <h4 className="font-black text-navy flex items-center gap-2 text-xs sm:text-sm">
                            <CreditCard className="w-4 h-4 text-brand-green" /> Payment Breakdown
                          </h4>
                          <div className="space-y-1.5 text-gray-600 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-bold text-navy font-mono">৳{order.subtotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Delivery Fee:</span>
                              <span className="font-bold text-navy font-mono">৳{order.deliveryFee?.toLocaleString()}</span>
                            </div>
                            {(order.discount || 0) > 0 && (
                              <div className="flex justify-between text-brand-green">
                                <span>Coupon Discount:</span>
                                <span className="font-bold font-mono">-৳{order.discount?.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm sm:text-base font-black text-navy pt-2 border-t border-gray-100">
                              <span>Total Payable:</span>
                              <span className="text-primary font-mono font-black">৳{order.totalAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* 4. Action Buttons Bar (View Invoice & Cancel Order) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          onClick={() => handleViewInvoice(order)}
                          className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer hover:scale-102"
                        >
                          <Printer className="w-3.5 h-3.5" /> View & Print Cash Memo
                        </button>

                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingId === order.id}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-colors border border-red-200 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                        )}
                      </div>

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