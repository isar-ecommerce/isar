import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingCart, 
  Search, 
  MapPin, 
  Loader2, 
  RefreshCw, 
  Eye, 
  Phone, 
  User, 
  X, 
  Send, 
  Truck,
  ExternalLink
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { sendOrderToCourier } from '../../services/courierService';
import type { Order, OrderStatus } from '../../types/order';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // ফায়ারস্টোর থেকে সব অর্ডার লোড করার ফাংশন
  const fetchOrders = useCallback(async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Order[];

      setOrders(list);
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // অর্ডারের স্ট্যাটাস ম্যানুয়াল আপডেট হ্যান্ডলার
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      const orderRef = doc(db, 'orders', orderId);

      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      toast.success(`Order status updated to ${newStatus.toUpperCase()}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ১-ক্লিক কুরিয়ারে পার্সেল বুকিং হ্যান্ডলার (Steadfast Real-Time Dispatch)
  const handleDispatchCourier = async (order: Order) => {
    try {
      setDispatchingId(order.id);
      const result = await sendOrderToCourier(order, 'Steadfast');

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: 'shipped',
                courierName: 'Steadfast',
                trackingCode: result.trackingCode,
                consignmentId: result.consignmentId,
              }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status: 'shipped',
                courierName: 'Steadfast',
                trackingCode: result.trackingCode,
                consignmentId: result.consignmentId,
              }
            : null
        );
      }

      toast.success(result.message);
    } catch (error: unknown) {
      console.error('Courier dispatch error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to book courier parcel');
    } finally {
      setDispatchingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      (order.trackingCode && order.trackingCode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20">Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-red-100 text-red-600 border border-red-200">Cancelled</span>;
      case 'processing':
      case 'confirmed':
      case 'packed':
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-blue-100 text-blue-700 border border-blue-200">Processing</span>;
      case 'shipped':
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
            <Truck className="w-3 h-3 shrink-0" /> With Courier
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Order Management | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Order Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage customer orders, update statuses and dispatch to Steadfast with 1-click
          </p>
        </div>

        <button
          onClick={() => { setLoading(true); fetchOrders(); }}
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Orders
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, Customer, Phone or Tracking Code..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="orderStatusFilter" className="text-xs font-bold text-gray-500">Status:</label>
          <select
            id="orderStatusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-navy text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading customer orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Orders Found</h3>
            <p className="text-xs text-gray-500">There are no orders matching your current search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-black text-[10px]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status & Courier</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Order ID */}
                    <td className="py-4 px-4 font-mono font-black text-navy">
                      {order.orderNumber}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-navy block">{order.customerName}</span>
                      <span className="text-[10px] text-gray-400 block">{order.customerPhone}</span>
                      <span className="text-[10px] text-gray-500 block truncate max-w-48">
                        {order.shippingAddress?.district}, {order.shippingAddress?.division}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4">
                      <span className="font-black text-primary font-mono block">
                        ৳{order.totalAmount?.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {order.items?.length || 0} Item(s)
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="py-4 px-4 font-bold text-gray-600 uppercase text-[11px]">
                      {order.paymentMethod === 'cod' ? (
                        <span className="text-navy">COD</span>
                      ) : (
                        <span className="text-[#E2136E]">bKash Paid</span>
                      )}
                    </td>

                    {/* Status & Courier Badge */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(order.status)}
                          {updatingId === order.id && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                        </div>

                        {/* Live Steadfast Tracking Badge */}
                        {order.trackingCode && (
                          <a
                            href={`https://steadfast.com.bd/t/${order.trackingCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                            title="Track on Steadfast"
                          >
                            <span>{order.courierName || 'Steadfast'}: {order.trackingCode}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* 1-Click Courier Dispatch Button */}
                        {order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleDispatchCourier(order)}
                            disabled={dispatchingId === order.id}
                            className="px-3 py-1.5 bg-brand-green hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer hover:scale-105"
                            title="1-Click Dispatch to Steadfast Courier"
                          >
                            {dispatchingId === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Send to Steadfast
                          </button>
                        )}

                        {/* Quick Status Select */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          disabled={updatingId === order.id}
                          className="bg-gray-50 border border-gray-200 text-[11px] font-bold text-navy rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        {/* View Details Button */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 p-6 sm:p-8 space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">Order Summary</span>
                <h3 className="text-xl font-black text-navy">{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Courier Dispatch Status Banner */}
            {selectedOrder.trackingCode && (
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Dispatched with {selectedOrder.courierName || 'Steadfast'}: <strong className="font-mono">{selectedOrder.trackingCode}</strong></span>
                </div>
                <a
                  href={`https://steadfast.com.bd/t/${selectedOrder.trackingCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-purple-700 transition-colors"
                >
                  Live Track <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Customer & Address Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <h4 className="font-black text-navy flex items-center gap-1.5 text-xs sm:text-sm">
                  <User className="w-4 h-4 text-primary" /> Customer Info
                </h4>
                <p className="font-bold text-navy text-xs sm:text-sm">{selectedOrder.customerName}</p>
                <p className="text-gray-600 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.customerPhone}
                </p>
                <p className="text-gray-600">{selectedOrder.customerEmail}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <h4 className="font-black text-navy flex items-center gap-1.5 text-xs sm:text-sm">
                  <MapPin className="w-4 h-4 text-brand-green" /> Delivery Address
                </h4>
                <p className="font-bold text-navy">{selectedOrder.shippingAddress?.fullName}</p>
                <p className="text-gray-600 leading-relaxed">{selectedOrder.shippingAddress?.fullAddress}</p>
                <p className="text-gray-600">Thana: {selectedOrder.shippingAddress?.upazila}, District: {selectedOrder.shippingAddress?.district}</p>
                <p className="text-gray-600">Division: {selectedOrder.shippingAddress?.division}</p>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div>
              <h4 className="font-black text-navy text-xs uppercase tracking-wider mb-3">Purchased Items</h4>
              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || 'https://via.placeholder.com/60'}
                        alt={item.productName}
                        className="w-11 h-11 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-navy">{item.productName}</p>
                        <p className="text-gray-400 text-[10px]">Qty: {item.quantity} × ৳{item.price?.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="font-black text-navy font-mono">৳{((item.price || 0) * (item.quantity || 1))?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-5 bg-navy text-white rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal:</span>
                <span className="font-mono">৳{selectedOrder.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Delivery Charge:</span>
                <span className="font-mono">৳{selectedOrder.deliveryFee?.toLocaleString()}</span>
              </div>
              {(selectedOrder.discount || 0) > 0 && (
                <div className="flex justify-between text-brand-green">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">-৳{selectedOrder.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-navy-light">
                <span>Total Amount:</span>
                <span className="text-brand-gold text-base font-mono">৳{selectedOrder.totalAmount?.toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
              {selectedOrder.status !== 'shipped' && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' ? (
                <button
                  onClick={() => handleDispatchCourier(selectedOrder)}
                  disabled={dispatchingId === selectedOrder.id}
                  className="px-5 py-2.5 bg-brand-green hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {dispatchingId === selectedOrder.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Dispatch to Steadfast Courier
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}