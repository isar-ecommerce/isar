import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  PhoneCall, 
  Mail, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Clock, 
  ShoppingCart, 
  MapPin 
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';

interface AbandonedCartItem {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalAmount: number;
  division?: string;
  district?: string;
  upazila?: string;
  fullAddress?: string;
  updatedAt?: unknown;
}

export default function AdminAbandonedCarts() {
  const [carts, setCarts] = useState<AbandonedCartItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // React 19 Pure Render Compliance: Date.now() স্টেট হিসেবে সেফলি সংরক্ষিত
  const [currentTime] = useState<number>(() => Date.now());

  const fetchAbandonedCarts = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'abandoned_carts'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as AbandonedCartItem[];

      setCarts(list);
    } catch (err) {
      console.error('Error fetching abandoned carts:', err);
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) fetchAbandonedCarts();
    });
    return () => {
      isMounted = false;
    };
  }, [fetchAbandonedCarts]);

  const handleDeleteCart = async (id: string, name: string) => {
    if (!window.confirm(`Delete abandoned cart for ${name}?`)) return;

    try {
      setDeletingId(id);
      await deleteDoc(doc(db, 'abandoned_carts', id));
      setCarts(prev => prev.filter(c => c.id !== id));
      toast.success('Abandoned cart removed');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendFreeEmail = async (cart: AbandonedCartItem) => {
    if (!cart.customerEmail) {
      toast.error('Customer email is missing for this cart');
      return;
    }

    try {
      setSendingEmailId(cart.id);
      const toastId = toast.loading('Sending free reminder email...');

      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'abandoned_cart_reminder',
          customerName: cart.customerName,
          customerEmail: cart.customerEmail,
          customerPhone: cart.customerPhone,
          items: cart.items,
          totalAmount: cart.totalAmount,
        }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (res.ok && data.success) {
        toast.success(`Free reminder email sent to ${cart.customerEmail}!`);
      } else {
        toast.error(data.message || 'Failed to send reminder email');
      }
    } catch (err) {
      console.error('Email send error:', err);
      toast.error('Could not send email reminder');
    } finally {
      setSendingEmailId(null);
    }
  };

  const formatTimeAgo = (timestamp: unknown): string => {
    if (!timestamp) return 'Recently';
    try {
      let date: Date | null = null;
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
        date = (timestamp as { toDate: () => Date }).toDate();
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      }

      if (!date) return 'Recently';
      const diffMinutes = Math.floor((currentTime - date.getTime()) / (1000 * 60));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      const hours = Math.floor(diffMinutes / 60);
      if (hours < 24) return `${hours} hour(s) ago`;
      return `${Math.floor(hours / 24)} day(s) ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Abandoned Carts | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-navy">Abandoned Carts Recovery</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
              {carts.length} Pending Carts
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Customers who typed their details but didn't confirm order. Call them or send a free email reminder!
          </p>
        </div>

        <button
          onClick={fetchAbandonedCarts}
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh List
        </button>
      </div>

      {/* Carts Table */}
      <div className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading abandoned carts...</span>
          </div>
        ) : carts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Abandoned Carts Right Now!</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Great news! All visitors who started checkout either placed their orders or haven't left draft items yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-black text-[10px]">
                  <th className="py-3 px-4">Customer & Phone</th>
                  <th className="py-3 px-4">Selected Products</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Abandoned Time</th>
                  <th className="py-3 px-4 text-right">Instant Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-gray-50/80 transition-colors">
                    
                    {/* Customer */}
                    <td className="py-4 px-4">
                      <span className="font-extrabold text-navy text-xs sm:text-sm block">{cart.customerName}</span>
                      <span className="font-mono text-xs font-bold text-primary block mt-0.5">{cart.customerPhone}</span>
                      {cart.customerEmail && (
                        <span className="text-[10px] text-gray-400 block truncate max-w-44">{cart.customerEmail}</span>
                      )}
                      {cart.district && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-brand-green" /> {cart.district}, {cart.division}
                        </span>
                      )}
                    </td>

                    {/* Products */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5 max-w-xs">
                        {cart.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <img
                              src={item.image || 'https://via.placeholder.com/40'}
                              alt={item.productName}
                              className="w-7 h-7 rounded-lg object-cover bg-gray-50 border border-gray-200 shrink-0"
                            />
                            <span className="text-navy font-bold truncate text-[11px]">{item.productName}</span>
                            <span className="text-gray-400 text-[10px] shrink-0 font-mono">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Total Value */}
                    <td className="py-4 px-4 font-black text-navy font-mono text-xs sm:text-sm">
                      ৳{cart.totalAmount?.toLocaleString()}
                    </td>

                    {/* Time */}
                    <td className="py-4 px-4 text-gray-500 font-semibold">
                      <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg w-fit text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {formatTimeAgo(cart.updatedAt)}
                      </span>
                    </td>

                    {/* Actions: Call & Free Email */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* 📞 1-Click Direct Phone Call */}
                        <a
                          href={`tel:${cart.customerPhone}`}
                          className="px-3 py-1.5 bg-brand-green hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer hover:scale-105"
                          title="Call Customer Directly"
                        >
                          <PhoneCall className="w-3.5 h-3.5" /> Call Customer
                        </a>

                        {/* ✉️ Send Free Email Reminder */}
                        {cart.customerEmail && (
                          <button
                            onClick={() => handleSendFreeEmail(cart)}
                            disabled={sendingEmailId === cart.id}
                            className="px-3 py-1.5 bg-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                            title="Send Free Email Reminder"
                          >
                            {sendingEmailId === cart.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5 text-brand-gold" />
                            )}
                            Email Reminder
                          </button>
                        )}

                        {/* Delete Draft */}
                        <button
                          onClick={() => handleDeleteCart(cart.id, cart.customerName)}
                          disabled={deletingId === cart.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Cart"
                        >
                          <Trash2 className="w-4 h-4" />
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

    </div>
  );
}