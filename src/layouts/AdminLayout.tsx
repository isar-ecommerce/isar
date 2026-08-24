import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
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
  FileText 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../firebase/auth';
import BrandLogo from '../components/common/BrandLogo';

export default function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
    { name: 'Manage Orders', path: '/admin/orders', icon: ShoppingCart },
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
        
        {/* Admin Brand Header with Dynamic Logo */}
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

        {/* Sidebar Footer / Quick Link to Store */}
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

      {/* Mobile Sidebar Modal / Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
          <aside className="relative w-64 bg-navy text-white h-full flex flex-col z-10 shadow-2xl">
            <div className="h-16 flex items-center justify-between px-6 border-b border-navy-light">
              <BrandLogo adminMode={true} to="/admin" />
              <button onClick={() => setIsMobileSidebarOpen(false)} className="text-gray-400 hover:text-white">
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
              className="lg:hidden p-2 text-navy hover:text-primary transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-navy hidden sm:block">Control Panel</h1>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-4">
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
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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