import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Store, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Wallet, 
  CreditCard, 
  Loader2, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import type { Order } from '../../types/order';
import type { Product } from '../../types/product';

export default function SellerDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  const fetchSellerData = async () => {
    if (!user) return;
    try {
      // ১. সেলারের নিজস্ব প্রোডাক্টসমূহ লোড করা
      const pQuery = query(collection(db, 'products'), where('sellerId', '==', user.uid));
      const pSnap = await getDocs(pQuery);
      const pList = pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setSellerProducts(pList);

      // ২. সেলারের অর্ডারসমূহ ফেস করা
      const oSnap = await getDocs(collection(db, 'orders'));
      const allOrders = oSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      
      let earnings = 0;
      const filteredOrders: Order[] = [];

      allOrders.forEach(order => {
        const sellerItems = order.items?.filter(item => item.sellerId === user.uid || item.sellerId === 'admin');
        if (sellerItems && sellerItems.length > 0) {
          filteredOrders.push(order);
          if (order.status !== 'cancelled') {
            const itemSales = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            earnings += itemSales;
          }
        }
      });

      setSellerOrders(filteredOrders);
      setTotalEarnings(earnings);
    } catch (error) {
      console.error("Error fetching seller dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSellerData();
    });
  }, [user]);

  const handleWithdrawalRequest = () => {
    toast.success("Payout withdrawal request submitted to ISAR Admin!");
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-4">
      <Helmet>
        <title>Seller Vendor Dashboard | ISAR Marketplace</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-navy">Seller Dashboard</h1>
              <span className="text-[10px] font-bold bg-brand-green/10 text-brand-green px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Vendor
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Welcome, {user?.displayName || 'Vendor Partner'}. Manage your store products & payout earnings.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchSellerData(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          <Link
            to="/admin/products/add"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Item
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-modern border border-gray-100 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <span className="text-xs text-gray-500 font-medium">Loading vendor analytics...</span>
        </div>
      ) : (
        <>
          {/* Analytics Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* Total Store Revenue */}
            <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">Total Store Sales</span>
                <span className="text-2xl font-extrabold text-navy">৳{totalEarnings.toLocaleString()}</span>
                <span className="text-[11px] text-brand-green font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> Live Firestore
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Net Earnings After Commission */}
            <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">Net Earnings (95%)</span>
                <span className="text-2xl font-extrabold text-primary">৳{(totalEarnings * 0.95).toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 block mt-1">
                  5% Platform Commission
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            {/* Vendor Products Count */}
            <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">Store Products</span>
                <span className="text-2xl font-extrabold text-navy">{sellerProducts.length}</span>
                <span className="text-[11px] text-gray-500 block mt-1">
                  In Marketplace
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>

            {/* Vendor Payout Withdrawal Box */}
            <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">Payout Action</span>
                <span className="text-xs font-bold text-navy block">Ready for Withdrawal</span>
              </div>
              <button
                onClick={handleWithdrawalRequest}
                className="mt-3 w-full py-2 px-3 bg-brand-green hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CreditCard className="w-4 h-4" /> Request Payout
              </button>
            </div>

          </div>

          {/* Vendor Products & Orders Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* My Listed Products */}
            <div className="bg-white rounded-2xl p-6 shadow-modern border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-navy text-sm">My Listed Products ({sellerProducts.length})</h3>
                <Link to="/admin/products" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  Manage All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {sellerProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No vendor products listed yet. Click "Add New Item" above.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sellerProducts.slice(0, 4).map((product) => (
                    <div key={product.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 border" />
                        <span className="font-semibold text-xs text-navy truncate">{product.name}</span>
                      </div>
                      <span className="font-bold text-xs text-primary">৳{product.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seller Product Orders */}
            <div className="bg-white rounded-2xl p-6 shadow-modern border border-gray-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-navy text-sm">Customer Orders ({sellerOrders.length})</h3>
                <Link to="/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                  View Orders <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {sellerOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No orders for your store products yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sellerOrders.slice(0, 4).map((order) => (
                    <div key={order.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-navy">{order.orderNumber}</span>
                        <span className="text-gray-400 block text-[10px]">{order.customerName}</span>
                      </div>
                      <span className="font-bold text-brand-green uppercase text-[10px] bg-brand-green/10 px-2 py-0.5 rounded">
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  );
}