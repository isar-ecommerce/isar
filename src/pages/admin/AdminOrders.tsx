import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingCart, 
  Search, 
  MapPin, 
  Loader2, 
  RefreshCw, 
  Eye, 
  User, 
  X, 
  Send, 
  Truck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Printer
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { sendOrderToCourier } from '../../services/courierService';
import type { Order, OrderStatus } from '../../types/order';

const getCollectableCOD = (order: Order): number => {
  if (typeof order.dueAmount === 'number') {
    return order.dueAmount;
  }
  if (order.paymentStatus === 'paid') {
    return 0;
  }
  if (order.paymentStatus === 'partial_paid') {
    const paid = order.paidAmount || order.deliveryFee || 0;
    return Math.max(0, order.totalAmount - paid);
  }
  return order.totalAmount || 0;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

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

  const handleDispatchCourier = async (order: Order) => {
    try {
      setDispatchingId(order.id);
      const finalCodToCollect = getCollectableCOD(order);

      const orderToDispatch: Order = {
        ...order,
        totalAmount: finalCodToCollect,
        dueAmount: finalCodToCollect,
      };

      const result = await sendOrderToCourier(orderToDispatch, 'Steadfast');

      const updatedFields = {
        status: 'shipped' as OrderStatus,
        courierName: 'Steadfast',
        trackingCode: result.trackingCode,
        consignmentId: result.consignmentId,
        shippedAt: new Date().toISOString(),
      };

      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        ...updatedFields,
        updatedAt: serverTimestamp(),
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, ...updatedFields } : o))
      );

      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, ...updatedFields } : null));
      }

      toast.success(`Steadfast Booked! Collectable COD: ${finalCodToCollect} BDT`);
    } catch (error: unknown) {
      console.error('Courier dispatch error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to dispatch courier parcel');
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
            <Truck className="w-3 h-3 shrink-0" /> Steadfast
          </span>
        );
      default:
        return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
    }
  };

  const getPaymentBadge = (order: Order) => {
    const codDue = getCollectableCOD(order);

    if (order.paymentStatus === 'paid' || codDue === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-brand-green bg-brand-green/10 border border-brand-green/20 px-2 py-0.5 rounded-md">
          <CheckCircle2 className="w-3 h-3 shrink-0" /> Full Paid
        </span>
      );
    }

    if (order.paymentStatus === 'partial_paid' || (order.paidAmount && order.paidAmount > 0)) {
      return (
        <div className="space-y-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
            Adv. {order.paidAmount || order.deliveryFee} BDT Paid
          </span>
          <span className="block text-[10px] font-bold text-[#E2136E]">
            COD Due: {codDue} BDT
          </span>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" /> Unpaid COD ({order.totalAmount} BDT)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Order Management | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy">Order Management & Dispatch</h1>
          <p className="text-xs text-gray-500 mt-1">
            Monitor advance payments, collectable COD dues, and 1-click dispatch to Steadfast Courier
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
            placeholder="Search by Order ID, customer name, phone, or tracking code..."
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
            <span className="text-xs text-gray-500 font-medium">Loading orders from database...</span>
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
                  <th className="py-3 px-4">Customer & Address</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Payment & COD Due</th>
                  <th className="py-3 px-4">Status & Tracking</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => {
                  const collectable = getCollectableCOD(order);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono font-black text-navy">
                        <div>{order.orderNumber}</div>
                        {order.transactionId && (
                          <span className="text-[9px] text-[#E2136E] font-bold block">
                            Trx: {order.transactionId}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-navy block">{order.customerName}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">{order.customerPhone}</span>
                        <span className="text-[10px] text-gray-500 block truncate max-w-48">
                          {order.shippingAddress?.district}, {order.shippingAddress?.division}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-black text-slate-900 font-mono block">
                          {order.totalAmount?.toLocaleString()} BDT
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {order.items?.length || 0} Item(s) ({order.totalWeight || 0.5} kg)
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {getPaymentBadge(order)}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(order.status)}
                            {updatingId === order.id && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                          </div>

                          {order.trackingCode && (
                            <a
                              href={`https://steadfast.com.bd/t/${order.trackingCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline font-mono"
                              title="Track on Steadfast"
                            >
                              <span>{order.trackingCode}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => handleDispatchCourier(order)}
                              disabled={dispatchingId === order.id}
                              className="px-3 py-1.5 bg-brand-green hover:bg-emerald-600 text-white rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer hover:scale-105"
                              title={`1-Click Dispatch to Steadfast (Collect: ${collectable} BDT)`}
                            >
                              {dispatchingId === order.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Send ({collectable} BDT)
                            </button>
                          )}

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

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (() => {
        const collectableCOD = getCollectableCOD(selectedOrder);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 p-6 sm:p-8 space-y-5 relative">
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase">Order Summary</span>
                  <h3 className="text-xl font-black text-navy">{selectedOrder.orderNumber}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 text-navy hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
                    title="Print Packing Slip"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {selectedOrder.trackingCode && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Steadfast Tracking Code: <strong className="font-mono">{selectedOrder.trackingCode}</strong></span>
                  </div>
                  <a
                    href={`https://steadfast.com.bd/t/${selectedOrder.trackingCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 hover:bg-purple-700 transition-colors font-mono"
                  >
                    Track Parcel <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                  <h4 className="font-black text-navy flex items-center gap-1.5 text-xs">
                    <User className="w-3.5 h-3.5 text-primary" /> Customer Info
                  </h4>
                  <p className="font-bold text-navy">{selectedOrder.customerName}</p>
                  <p className="text-gray-600 font-mono">{selectedOrder.customerPhone}</p>
                  <p className="text-gray-500 truncate">{selectedOrder.customerEmail}</p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5">
                  <h4 className="font-black text-navy flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-brand-green" /> Shipping Address
                  </h4>
                  <p className="font-bold text-navy">{selectedOrder.shippingAddress?.fullName}</p>
                  <p className="text-gray-600 leading-relaxed">{selectedOrder.shippingAddress?.fullAddress}</p>
                  <p className="text-gray-500 font-semibold">
                    {selectedOrder.shippingAddress?.upazila}, {selectedOrder.shippingAddress?.district}, {selectedOrder.shippingAddress?.division}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-black text-navy text-[11px] uppercase tracking-wider mb-2">Purchased Items</h4>
                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.image || 'https://via.placeholder.com/60'}
                          alt={item.productName}
                          className="w-10 h-10 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-navy">{item.productName}</p>
                          <p className="text-gray-400 text-[10px] font-mono">Qty: {item.quantity} × {item.price?.toLocaleString()} BDT</p>
                        </div>
                      </div>
                      <span className="font-black text-navy font-mono">{((item.price || 0) * (item.quantity || 1))?.toLocaleString()} BDT</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Product Subtotal:</span>
                  <span className="font-mono font-bold">{selectedOrder.subtotal?.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Delivery Charge:</span>
                  <span className="font-mono font-bold">{selectedOrder.deliveryFee?.toLocaleString()} BDT</span>
                </div>

                {(selectedOrder.paidAmount && selectedOrder.paidAmount > 0) && (
                  <div className="flex justify-between text-[#E2136E] font-bold pt-1 border-t border-slate-800">
                    <span>Advance Received (bKash):</span>
                    <span className="font-mono">-{selectedOrder.paidAmount?.toLocaleString()} BDT</span>
                  </div>
                )}

                {selectedOrder.transactionId && (
                  <div className="text-[11px] text-pink-300 font-mono">
                    bKash TrxID: {selectedOrder.transactionId}
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-700">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Truck className="w-4 h-4" /> Steadfast Cash to Collect (Due COD):
                  </span>
                  <span className="text-amber-400 font-mono font-black text-base">
                    {collectableCOD.toLocaleString()} BDT
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                {selectedOrder.status !== 'shipped' && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' ? (
                  <button
                    onClick={() => handleDispatchCourier(selectedOrder)}
                    disabled={dispatchingId === selectedOrder.id}
                    className="px-5 py-2.5 bg-brand-green hover:bg-emerald-600 text-white font-black text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer hover:scale-105"
                  >
                    {dispatchingId === selectedOrder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Dispatch to Steadfast (Collect: {collectableCOD} BDT)
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}