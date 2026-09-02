import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  ChevronDown, 
  Package, 
  LogOut, 
  X, 
  Loader2 
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { logoutUser } from '../../firebase/auth';
import { getProducts } from '../../services/productService';
import BrandLogo from '../common/BrandLogo';
import type { Product } from '../../types/product';

// ডেটাবেস খালি থাকলে লাইভ সার্চ সচল রাখার জন্য ফলব্যাক ক্যাটালগ
const FALLBACK_SEARCH_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones with Active Noise Cancelling',
    slug: 'wireless-headphones',
    shortDescription: 'High quality audio with crystal clear bass.',
    description: 'Enjoy high-fidelity sound with deep bass and active noise cancellation.',
    price: 4500,
    originalPrice: 6000,
    stock: 15,
    lowStockAlert: 2,
    sku: 'AUDIO-01',
    categoryId: 'audio',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    rating: 4.8,
    reviewCount: 124,
    sellerId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Smart Watch Series 8 - Midnight Aluminum Case',
    slug: 'smart-watch',
    shortDescription: 'Track your health in real-time.',
    description: 'Monitors heart rate, steps, sleep, and blood oxygen levels.',
    price: 3200,
    originalPrice: 4000,
    stock: 8,
    lowStockAlert: 2,
    sku: 'WATCH-01',
    categoryId: 'gadgets',
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
    rating: 4.5,
    reviewCount: 89,
    sellerId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Ultra HD 4K Action Camera with Waterproof Case',
    slug: 'action-camera',
    shortDescription: 'Waterproof 4K recording camera.',
    description: 'Capture your adventure moments with ultra-smooth 4K stabilization.',
    price: 8500,
    originalPrice: 9500,
    stock: 5,
    lowStockAlert: 1,
    sku: 'CAM-01',
    categoryId: 'cameras',
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
    rating: 4.9,
    reviewCount: 210,
    sellerId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Minimalist Leather Backpack for Men & Women',
    slug: 'leather-backpack',
    shortDescription: 'Water-resistant premium leather backpack.',
    description: 'Designed for daily commute and carrying 15.6 inch laptops safely.',
    price: 2100,
    originalPrice: 2500,
    stock: 20,
    lowStockAlert: 5,
    sku: 'BAG-01',
    categoryId: 'fashion',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    rating: 4.6,
    reviewCount: 56,
    sellerId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export default function Header() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();
  const itemCount = useCartStore((state) => state.getItemCount());

  // লাইভ সার্চ ডিবাইন্সড ইফেক্ট (React 19 সেফ)
  useEffect(() => {
    if (!searchQuery.trim()) {
      Promise.resolve().then(() => {
        setSearchResults([]);
        setIsSearching(false);
        setShowSearchDropdown(false);
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        let allProducts: Product[] = [];
        try {
          allProducts = await getProducts();
        } catch {
          allProducts = [];
        }

        if (allProducts.length === 0) {
          allProducts = FALLBACK_SEARCH_PRODUCTS;
        }

        const query = searchQuery.toLowerCase().trim();
        const matches = allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.shortDescription?.toLowerCase().includes(query) ||
            p.categoryId?.toLowerCase().includes(query)
        );
        setSearchResults(matches.slice(0, 5));
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setShowSearchDropdown(true);
    } else {
      setShowSearchDropdown(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-xs pt-safe-top">
      <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Left: Dynamic Brand Logo (3-Line Hamburger Menu removed for clean Daraz-style UI) */}
        <div className="flex items-center">
          <BrandLogo to="/" />
        </div>

        {/* Middle: Desktop Search Bar with Live Autocomplete Suggestions */}
        <div className="hidden md:flex flex-1 max-w-2xl relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="w-full relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
              placeholder="Search for products, brands and more..."
              className="w-full h-11 pl-4 pr-12 rounded-full border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm text-navy placeholder:text-gray-400"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                className="absolute right-12 top-0 h-11 w-8 flex items-center justify-center text-gray-400 hover:text-navy cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="submit"
              className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-500 hover:text-primary rounded-r-full transition-colors cursor-pointer"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Live Search Suggestions Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" /> Searching products...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500">
                  No products found for "{searchQuery}"
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <div className="px-4 py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Instant Search Results
                  </div>
                  {searchResults.map((product) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors group cursor-pointer"
                    >
                      <img
                        src={product.images[0] || 'https://via.placeholder.com/60'}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-navy group-hover:text-primary transition-colors line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          Cat: {product.categoryId || 'General'}
                        </p>
                      </div>
                      <span className="text-xs font-extrabold text-primary shrink-0">
                        ৳{product.price.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                  <button
                    onClick={handleSearch}
                    className="w-full p-2.5 bg-gray-50 hover:bg-primary hover:text-white text-xs font-bold text-navy text-center transition-colors block cursor-pointer"
                  >
                    View All Results for "{searchQuery}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions (Account, Cart) */}
        <div className="flex items-center gap-3 sm:gap-5">
          
          {/* User Account / Profile Dropdown */}
          {isAuthenticated && user ? (
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-sm font-medium text-navy hover:text-primary transition-colors focus:outline-none cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <span className="hidden lg:block max-w-25 truncate font-semibold">
                  {user.displayName?.split(' ')[0] || 'Account'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-modern-lg border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
                  <div className="px-4 py-3 border-b border-gray-100 mb-2">
                    <p className="text-sm font-bold text-navy truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                  </div>
                  
                  {/* Admin বা Seller হলে ড্যাশবোর্ডের লিংক দেখাবে */}
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <Link
                      to="/admin"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {user.role === 'seller' && (
                    <Link
                      to="/seller"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      Seller Dashboard
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                  >
                    <User className="w-4 h-4" /> My Profile
                  </Link>
                  
                  <Link
                    to="/orders"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                  >
                    <Package className="w-4 h-4" /> My Orders
                  </Link>
                  
                  <div className="h-px bg-gray-100 my-2"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link 
              to="/login" 
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-navy hover:text-primary transition-colors group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <User className="w-5 h-5 text-gray-600 group-hover:text-primary" />
              </div>
              <span className="hidden lg:block font-semibold">Login / Sign Up</span>
            </Link>
          )}

          {/* Dynamic Cart Icon with Badge */}
          <Link 
            to="/cart" 
            className="relative p-2 text-navy hover:text-primary transition-colors group cursor-pointer"
            aria-label="Cart"
          >
            <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="w-full relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search products..."
            className="w-full h-10 pl-4 pr-10 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-primary transition-all text-xs text-navy placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-gray-500 hover:text-primary transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}