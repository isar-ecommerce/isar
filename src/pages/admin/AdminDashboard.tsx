import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  DollarSign, 
  ShoppingBag, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Order } from '../../types/order';

export default function AdminDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  const fetchDashboardData = async () => {
    try {
      // ১. অর্ডারসমূহ ফেস করা
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      
      // মোট রেভিনিউ হিসাব (ক্যান্সেল অর্ডার বাদে)
      const revenue = allOrders
        .filter(order => order.status !== 'cancelled')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      // ২. প্রোডাক্টসমূহ গুনে দেখা
      const productsSnap = await getDocs(collection(db, 'products'));

      // ৩. ইউজারসমূহ গুনে দেখা
      const usersSnap = await getDocs(collection(db, 'users'));

      // ৪. সাম্প্রতিক ৫টি অর্ডার
      const recentOrdersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
      const recentOrdersSnap = await getDocs(recentOrdersQuery);
      const recentList = recentOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];

      setStats({
        totalRevenue: revenue,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        totalCustomers: usersSnap.size,
      });

      setRecentOrders(recentList);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.resolve().then(() => {
      fetchDashboardData();
    });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand-green/10 text-brand-green">Delivered</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-600">Cancelled</span>;
      case 'processing':
      case 'shipped':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Admin Dashboard | ISAR Marketplace</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 mt-1">Welcome back! Here is what is happening with ISAR today.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setLoading(true); fetchDashboardData(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
          
          <Link
            to="/admin/products/add"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Total Revenue</span>
            <span className="text-2xl font-extrabold text-navy">৳{stats.totalRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-brand-green font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Live Firestore
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Total Orders</span>
            <span className="text-2xl font-extrabold text-navy">{stats.totalOrders}</span>
            <span className="text-[11px] text-primary font-semibold block mt-1">
              Customer Purchases
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingCart className="w-6 h-6" />
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Active Products</span>
            <span className="text-2xl font-extrabold text-navy">{stats.totalProducts}</span>
            <span className="text-[11px] text-gray-500 block mt-1">
              In Inventory
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Registered Users</span>
            <span className="text-2xl font-extrabold text-navy">{stats.totalCustomers}</span>
            <span className="text-[11px] text-brand-gold font-semibold block mt-1">
              Platform Accounts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl shadow-modern border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">Recent Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest customer orders placed on the platform</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
          >
            View All Orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500">Loading dashboard data...</span>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-navy">No Orders Found Yet</p>
            <p className="text-xs text-gray-500">When customers place orders, they will appear right here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="pb-3 px-2">Order ID</th>
                  <th className="pb-3 px-2">Customer</th>
                  <th className="pb-3 px-2">Items</th>
                  <th className="pb-3 px-2">Total Amount</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-2 font-bold text-navy">{order.orderNumber}</td>
                    <td className="py-3 px-2">
                      <span className="font-semibold text-navy block">{order.customerName}</span>
                      <span className="text-[10px] text-gray-400">{order.customerPhone}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-600">{order.items?.length || 0} Item(s)</td>
                    <td className="py-3 px-2 font-extrabold text-primary">৳{order.totalAmount?.toLocaleString()}</td>
                    <td className="py-3 px-2">{getStatusBadge(order.status)}</td>
                    <td className="py-3 px-2 text-right">
                      <Link
                        to="/admin/orders"
                        className="px-3 py-1.5 bg-gray-100 hover:bg-primary hover:text-white rounded-lg text-[11px] font-bold text-navy transition-colors inline-block"
                      >
                        Manage
                      </Link>
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