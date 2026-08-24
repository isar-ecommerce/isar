import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

export default function MobileNav() {
  const { isAuthenticated } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Categories', path: '/categories', icon: LayoutGrid },
    { name: 'Cart', path: '/cart', icon: ShoppingCart },
    { 
      name: isAuthenticated ? 'Profile' : 'Account', 
      path: isAuthenticated ? '/profile' : '/login', 
      icon: User 
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-navy'
                }`
              }
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.name}</span>
              
              {/* Dynamic Cart Badge */}
              {item.name === 'Cart' && itemCount > 0 && (
                <span className="absolute top-1.5 right-1/4 translate-x-2.5 -translate-y-1 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-primary rounded-full border border-white">
                  {itemCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}