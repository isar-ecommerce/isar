import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  PlusCircle, 
  ShoppingCart, 
  FolderTree, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  FileText,
  Ticket,
  PhoneCall,
  Loader2,
  Bell,
  Download,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../firebase/config';
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../firebase/auth';
import BrandLogo from '../components/common/BrandLogo';
import type { Product } from '../types/product';

export default function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // 🔔 লো-স্টক নোটিফিকেশন স্টেট (#29)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isBellOpen, setIsBellOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const bellDropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast.error('Access Denied: You do not have admin privileges');
    }
  }, [isLoading, isAuthenticated, isAdmin]);

  // ফায়ারস্টোর থেকে লো-স্টক প্রোডাক্ট চেক (#29)
  useEffect(() => {
    let isMounted = true;
    if (!isAdmin) return;

    const checkLowStock = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
        const lowList = list.filter(p => p.stock <= (p.lowStockAlert || 5));
        if (isMounted) {
          setLowStockProducts(lowList);
        }
      } catch (err) {
        console.warn('Low stock check note:', err);
      }
    };

    checkLowStock();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  // ক্লিক আউটসাইড ড্রপডাউন ক্লোজ
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellDropdownRef.current && !bellDropdownRef.current.contains(e.target as Node)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  // 💾 ওয়ান-ক্লিক ডাটাবেজ ব্যাকআপ (#60)
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const toastId = toast.loading('Exporting database backup...');

      const [productsSnap, ordersSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'categories')),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        site: 'ISAR Marketplace',
        products: productsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        orders: ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        categories: categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ISAR_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.dismiss(toastId);
      toast.success('Database backup downloaded successfully!');
    } catch (err) {
      console.error('Backup error:', err);
      toast.error('Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
    { name: 'Manage Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Abandoned Carts', path: '/admin/abandoned-carts', icon: PhoneCall },
    { name: 'Promo Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'All Products', path: '/admin/products', icon: ShoppingBag, end: true },
    { name: 'Add Product', path: '/admin/products/add', icon: PlusCircle },
    { name: 'Categories', path: '/admin/categories', icon: FolderTree },
    { name: 'Manage Sellers', path: '/admin/sellers', icon: Users },
    { name: 'Legal Pages CMS', path: '/admin/legal', icon: FileText },
    { name: 'Website Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-secondary flex">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy text-white border-r border-navy-light shrink-0">
        
        {/* Admin Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-navy-light bg-navy-light/30">
          <div className="flex items-center gap-2">
            <BrandLogo adminMode={true} to="/admin" />
            <span className="text-[10px] uppercase font-bold bg-primary text-white px-2 py-0.5 rounded">Admin</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-gray-300 hover:bg-navy-light hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-navy-light">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary-light" /> Live Store
            </span>
            <span className="text-[10px] text-gray-400">View site</span>
          </Link>
        </div>

      </aside>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <aside className="relative w-64 bg-navy text-white h-full flex flex-col z-10 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-6 border-b border-navy-light">
              <BrandLogo adminMode={true} to="/admin" />
              <button onClick={() => setIsMobileSidebarOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                        isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-navy-light'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 shadow-sm flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-navy hover:text-primary transition-colors cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-navy hidden sm:block">Control Panel</h1>
          </div>

          {/* Action Items: Backup, Low-Stock Bell & Profile */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* 💾 One-Click Database Backup (#60) */}
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-navy transition-all cursor-pointer disabled:opacity-50"
              title="Download entire database backup (JSON)"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-primary" />}
              <span>Backup Data</span>
            </button>

            {/* 🔔 Low Stock Notification Bell Dropdown (#29) */}
            <div className="relative" ref={bellDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBellOpen(!isBellOpen)}
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-navy transition-all relative cursor-pointer"
                title="Low Stock Notifications"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {lowStockProducts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {isBellOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-black text-navy uppercase tracking-wider">Inventory Stock Alerts</h4>
                    </div>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {lowStockProducts.length} Alert(s)
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 py-1">
                    {lowStockProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">All products have sufficient inventory! 🎉</p>
                    ) : (
                      lowStockProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/admin/products/edit/${prod.id}`}
                          onClick={() => setIsBellOpen(false)}
                          className="p-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 rounded-xl transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={prod.images[0] || 'https://via.placeholder.com/40'} alt={prod.name} className="w-9 h-9 rounded-lg object-contain bg-white border border-gray-100 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-navy group-hover:text-primary transition-colors truncate max-w-44">{prod.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">SKU: {prod.sku || 'N/A'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${prod.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-800'}`}>
                            {prod.stock <= 0 ? 'Out of stock' : `${prod.stock} left`}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-sm">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-bold text-navy">{user?.displayName || 'Admin'}</span>
                <span className="text-[10px] font-semibold text-brand-green flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>

      </div>

    </div>
  );
}