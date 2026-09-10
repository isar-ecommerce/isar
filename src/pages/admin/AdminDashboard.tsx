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
  RefreshCw,
  BarChart3,
  Calendar,
  Sparkles,
  Award,
  MapPin,
  Clock
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Order } from '../../types/order';

interface DailySaleData {
  dayLabel: string;
  dateStr: string;
  revenue: number;
  orders: number;
  heightPercent: number;
}

interface TopProductStat {
  name: string;
  soldCount: number;
  totalRevenue: number;
  image?: string;
}

interface DistrictStat {
  district: string;
  orderCount: number;
  totalAmount: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    todayOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<DailySaleData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductStat[]>([]);
  const [districtStats, setDistrictStats] = useState<DistrictStat[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [ordersSnap, productsSnap, usersSnap, recentOrdersSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5)))
      ]);

      const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      const validOrders = allOrders.filter(order => order.status !== 'cancelled');
      const revenue = validOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      const recentList = recentOrdersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];

      const getOrderTimeMs = (val: unknown): number => {
        if (!val) return 0;
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime();
        if (typeof val === 'object' && val !== null && 'toDate' in val) {
          return ((val as { toDate: () => Date }).toDate()).getTime();
        }
        return 0;
      };

      // ১. 💰 আজকের লাইভ সেলস মিটার হিসাব (#47)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();

      const todayValidOrders = validOrders.filter(o => getOrderTimeMs(o.createdAt) >= startOfTodayMs);
      const todayRev = todayValidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // ২. 🥇 টপ সেলিং প্রোডাক্টস লিডারবোর্ড হিসাব (#48)
      const productSalesMap: Record<string, TopProductStat> = {};
      validOrders.forEach(order => {
        order.items?.forEach(item => {
          if (!productSalesMap[item.productName]) {
            productSalesMap[item.productName] = {
              name: item.productName,
              soldCount: 0,
              totalRevenue: 0,
              image: item.image,
            };
          }
          productSalesMap[item.productName].soldCount += (item.quantity || 1);
          productSalesMap[item.productName].totalRevenue += ((item.price || 0) * (item.quantity || 1));
        });
      });

      const sortedTopProducts = Object.values(productSalesMap)
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 5);

      // ৩. 📊 শীর্ষ জেলা ভিত্তিক কুরিয়ার সেলস অ্যানালিটিক্স (#30)
      const districtMap: Record<string, DistrictStat> = {};
      validOrders.forEach(order => {
        const dist = order.shippingAddress?.district || 'Dhaka';
        if (!districtMap[dist]) {
          districtMap[dist] = { district: dist, orderCount: 0, totalAmount: 0 };
        }
        districtMap[dist].orderCount += 1;
        districtMap[dist].totalAmount += (order.totalAmount || 0);
      });

      const sortedDistricts = Object.values(districtMap)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      // ৪. গত ৭ দিনের রিয়েল সেলস চার্ট
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days: DailySaleData[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const targetDay = new Date();
        targetDay.setDate(today.getDate() - i);
        targetDay.setHours(0, 0, 0, 0);

        const nextDay = new Date(targetDay);
        nextDay.setDate(targetDay.getDate() + 1);

        const dayLabel = days[targetDay.getDay()];
        const dateStr = targetDay.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        const dayOrders = validOrders.filter(o => {
          const ms = getOrderTimeMs(o.createdAt);
          return ms >= targetDay.getTime() && ms < nextDay.getTime();
        });

        const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        last7Days.push({
          dayLabel,
          dateStr,
          revenue: dayRevenue,
          orders: dayOrders.length,
          heightPercent: 15,
        });
      }

      const maxRev = Math.max(...last7Days.map(d => d.revenue), 1000);
      const scaledChartData = last7Days.map(d => ({
        ...d,
        heightPercent: Math.max(12, Math.round((d.revenue / maxRev) * 100)),
      }));

      setStats({
        totalRevenue: revenue,
        totalOrders: ordersSnap.size,
        totalProducts: productsSnap.size,
        totalCustomers: usersSnap.size,
        todayRevenue: todayRev,
        todayOrders: todayValidOrders.length,
      });

      setRecentOrders(recentList);
      setChartData(scaledChartData);
      setTopProducts(sortedTopProducts);
      setDistrictStats(sortedDistricts);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="space-y-8 pb-10">
      <Helmet>
        <title>Admin Dashboard | ISAR Marketplace</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 mt-1">Welcome back! Live business insights for ISAR Marketplace.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchDashboardData()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
          
          <Link
            to="/admin/products/add"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* 💰 আজকের লাইভ সেলস মিটার (#47) + মোট পরিসংখ্যান গ্রিড */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        
        {/* Today's Sales Live Meter */}
        <div className="bg-linear-to-br from-primary to-navy text-white p-5 rounded-3xl shadow-modern flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-gold" /> Today's Sales (আজকের সেল)
            </span>
            <span className="text-2xl font-black font-mono block pt-1">৳{stats.todayRevenue.toLocaleString()}</span>
          </div>
          <span className="text-[11px] text-brand-gold font-extrabold flex items-center gap-1 mt-3">
            <Sparkles className="w-3 h-3" /> {stats.todayOrders} Live Order(s) Today
          </span>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Total Revenue</span>
            <span className="text-xl font-black text-navy font-mono">৳{stats.totalRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-brand-green font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Verified Sales
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-3xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Total Orders</span>
            <span className="text-xl font-black text-navy font-mono">{stats.totalOrders}</span>
            <span className="text-[11px] text-primary font-semibold block mt-1">
              All Purchases
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Active Products */}
        <div className="bg-white p-5 rounded-3xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Active Products</span>
            <span className="text-xl font-black text-navy font-mono">{stats.totalProducts}</span>
            <span className="text-[11px] text-gray-500 block mt-1">
              In Inventory
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white p-5 rounded-3xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Registered Users</span>
            <span className="text-xl font-black text-navy font-mono">{stats.totalCustomers}</span>
            <span className="text-[11px] text-brand-gold font-semibold block mt-1">
              Accounts
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
            <Users className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Visual Sales 7-Day Bar Chart */}
      <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy">Sales & Revenue Analytics</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real 7-day revenue trends based on actual customer orders</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last 7 Days (Live)</span>
          </div>
        </div>

        <div className="pt-4 pb-2">
          <div className="h-52 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-6">
            {chartData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-navy text-white text-[10px] font-bold py-1 px-2 rounded-md pointer-events-none mb-1 text-center whitespace-nowrap shadow-md">
                  <p>৳{item.revenue.toLocaleString()}</p>
                  <p className="text-gray-300 font-normal">{item.orders} Order(s)</p>
                </div>

                <div className="w-full max-w-10 bg-gray-100 rounded-t-xl overflow-hidden relative flex items-end h-full">
                  <div
                    style={{ height: `${item.heightPercent}%` }}
                    className="w-full bg-linear-to-t from-primary to-primary-light group-hover:from-brand-green group-hover:to-emerald-400 rounded-t-xl transition-all duration-500 shadow-sm"
                  />
                </div>

                <span className="text-[11px] font-bold text-navy mt-2">{item.dayLabel}</span>
                <span className="text-[9px] text-gray-400 font-semibold">{item.dateStr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🥇 টপ সেলিং প্রোডাক্টস (#48) & 📊 জেলা ভিত্তিক সেলস অ্যানালিটিক্স (#30) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Selling Leaderboard */}
        <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-gold" /> Top Selling Products (সেরা বিক্রিত পণ্য)
            </h3>
            <span className="text-xs font-bold text-gray-400">Ranked #1-#5</span>
          </div>

          <div className="divide-y divide-gray-100">
            {topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Product sales rankings will appear as orders are delivered.</p>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-white shadow-xs' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      #{idx + 1}
                    </span>
                    <img src={p.image || 'https://via.placeholder.com/40'} alt={p.name} className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 shrink-0" />
                    <span className="font-extrabold text-navy truncate max-w-44">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-primary font-mono block">৳{p.totalRevenue.toLocaleString()}</span>
                    <span className="text-[10px] text-brand-green font-bold">{p.soldCount} Pcs Sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* District Wise Analytics (#30) */}
        <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-base font-black text-navy flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Top Delivery Districts (শীর্ষ জেলাসমূহ)
            </h3>
            <span className="text-xs font-bold text-gray-400">Regional Demand</span>
          </div>

          <div className="divide-y divide-gray-100">
            {districtStats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Regional district delivery data will appear here.</p>
            ) : (
              districtStats.map((d, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-extrabold text-navy block">{d.district}</span>
                      <span className="text-[10px] text-gray-400">{d.orderCount} Successful Orders</span>
                    </div>
                  </div>
                  <span className="font-black text-navy font-mono text-sm">৳{d.totalAmount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy">Recent Orders</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest customer orders placed on the platform</p>
          </div>
          <Link
            to="/admin/orders"
            className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
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
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
            <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-navy">No Orders Found Yet</p>
            <p className="text-xs text-gray-500">When customers place orders, they will appear right here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-black text-[10px]">
                  <th className="pb-3 px-3">Order ID</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Items</th>
                  <th className="pb-3 px-3">Total Amount</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-3 font-black text-navy font-mono">{order.orderNumber}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-navy block">{order.customerName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{order.customerPhone}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{order.items?.length || 0} Item(s)</td>
                    <td className="py-3 px-3 font-extrabold text-primary font-mono">৳{order.totalAmount?.toLocaleString()}</td>
                    <td className="py-3 px-3">{getStatusBadge(order.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to="/admin/orders"
                        className="px-3 py-1.5 bg-gray-100 hover:bg-primary hover:text-white rounded-xl text-[11px] font-bold text-navy transition-colors inline-block cursor-pointer"
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