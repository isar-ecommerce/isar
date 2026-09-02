import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  SlidersHorizontal, 
  X, 
  ShoppingBag, 
  Loader2, 
  ChevronDown, 
  Star, 
  RefreshCw,
  Heart,
  Check,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getProducts, getCategories } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import type { Product, Category } from '../../types/product';

// প্রাথমিক সবকটি ক্যাটাগরি তালিকা (Category Management এর সাথে সিঙ্কড)
const INITIAL_CATEGORIES: Category[] = [
  { id: 'smartphones', name: 'Smartphones & Mobile', slug: 'smartphones', status: 'active', order: 1 },
  { id: 'laptops', name: 'Laptops & Computers', slug: 'laptops', status: 'active', order: 2 },
  { id: 'watches', name: 'Smart Watches & Bands', slug: 'watches', status: 'active', order: 3 },
  { id: 'audio', name: 'Headphones & Audio', slug: 'audio', status: 'active', order: 4 },
  { id: 'cameras', name: 'Cameras & Photography', slug: 'cameras', status: 'active', order: 5 },
  { id: 'fashion', name: 'Men & Women Fashion', slug: 'fashion', status: 'active', order: 6 },
];

// ফলব্যাক প্রোডাক্টস
const FALLBACK_PRODUCTS: Product[] = [
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

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  // ফিল্টারিং স্টেট
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const [sortBy, setSortBy] = useState<string>('default');

  // অ্যাডভান্সড ফিল্টার স্টেট
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const addItemToCart = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // ফায়ারস্টোর টাইমস্ট্যাম্প মিলি-সেকেন্ড কনভার্টার (Type Safe)
  const getTimestampMs = (val: unknown): number => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const ms = new Date(val).getTime();
      return isNaN(ms) ? 0 : ms;
    }
    if (typeof val === 'object' && val !== null) {
      if ('toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
        return (val as { toDate: () => Date }).toDate().getTime();
      }
      if ('seconds' in val && typeof (val as { seconds: number }).seconds === 'number') {
        return (val as { seconds: number }).seconds * 1000;
      }
    }
    return 0;
  };

  // ফায়ারস্টোর থেকে ডেটা লোড করা (React 19 সেফ)
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getProducts().catch(() => []),
          getCategories().catch(() => [])
        ]);

        if (isMounted) {
          if (fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }

          const merged = [
            ...INITIAL_CATEGORIES.filter(ic => !fetchedCategories.some(fc => fc.slug === ic.slug)),
            ...fetchedCategories
          ].sort((a, b) => (a.order || 0) - (b.order || 0));

          setCategories(merged);
        }
      } catch (error) {
        console.error("Error loading shop data:", error);
        if (isMounted) {
          setProducts(FALLBACK_PRODUCTS);
          setCategories(INITIAL_CATEGORIES);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchData();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // প্রতিটি ক্যাটাগরির প্রোডাক্ট সংখ্যা গণনা
  const getCategoryCount = (categoryId: string) => {
    if (!categoryId) return products.length;
    return products.filter(
      p => p.categoryId === categoryId || p.categoryId?.toLowerCase() === categoryId.toLowerCase()
    ).length;
  };

  // ফিল্টার এবং সার্চ লজিক
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // ১. ক্যাটাগরি ফিল্টার
        if (selectedCategory && selectedCategory !== 'all') {
          const matchCategory = 
            product.categoryId === selectedCategory ||
            product.categoryId?.toLowerCase() === selectedCategory.toLowerCase();
          if (!matchCategory) return false;
        }

        // ২. সার্চ কুয়েরি ফিল্টার
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matches = 
            product.name.toLowerCase().includes(query) ||
            product.shortDescription?.toLowerCase().includes(query);
          if (!matches) return false;
        }

        // ৩. প্রাইস ফিল্টার
        if (minPrice && product.price < Number(minPrice)) {
          return false;
        }
        if (maxPrice && product.price > Number(maxPrice)) {
          return false;
        }

        // ৪. ইন-স্টক ফিল্টার
        if (inStockOnly && product.stock <= 0) {
          return false;
        }

        // ৫. রেটিং ফিল্টার
        if (selectedRating !== null && (product.rating || 0) < selectedRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'newest') return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
        return 0;
      });
  }, [products, selectedCategory, searchQuery, minPrice, maxPrice, inStockOnly, selectedRating, sortBy]);

  const handleCategorySelect = (categoryId: string) => {
    if (selectedCategory === categoryId || !categoryId) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
    setIsFilterDrawerOpen(false);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSortBy('default');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSelectedRating(null);
    setIsFilterDrawerOpen(false);
  };

  const handleQuickAddToCart = (e: MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) {
      toast.error('This product is currently out of stock');
      return;
    }
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  const handleToggleWishlist = (e: MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(product);
    if (added) {
      toast.success('Added to Wishlist!');
    } else {
      toast.success('Removed from Wishlist!');
    }
  };

  const hasActiveFilters = Boolean(
    selectedCategory || searchQuery || minPrice || maxPrice || inStockOnly || selectedRating !== null
  );

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>Shop Products | ISAR Marketplace</title>
        <meta name="description" content="Browse and shop high-quality electronics, fashion, and lifestyle products at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-navy">Shop Authentic Products</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Showing <span className="font-bold text-navy">{filteredProducts.length}</span> items {searchQuery && `for "${searchQuery}"`}
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-white rounded-xl shadow-xs border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl shadow-modern p-4 flex flex-wrap items-center justify-between gap-4 border border-gray-100">
          
          {/* Mobile Filter Button */}
          <button 
            onClick={() => setIsFilterDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasActiveFilters && '(Active)'}
          </button>

          {/* Active Tags Strip */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                <button onClick={() => handleCategorySelect('')} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Search: {searchQuery}
                <button onClick={() => { searchParams.delete('search'); setSearchParams(searchParams); }} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold border border-brand-green/20">
                In Stock Only
                <button onClick={() => setInStockOnly(false)} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold border border-amber-500/20">
                ৳{minPrice || '0'} - ৳{maxPrice || 'Any'}
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {selectedRating !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/15 text-navy text-xs font-bold border border-brand-gold/30">
                {selectedRating}★ & Above
                <button onClick={() => setSelectedRating(null)} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <label htmlFor="sortBy" className="text-xs font-bold text-gray-500 hidden sm:block">Sort By:</label>
            <div className="relative">
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-navy text-xs md:text-sm font-bold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="default">Default Sorting</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Arrivals</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-modern p-6 border border-gray-100 space-y-6 sticky top-24">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-base font-black text-navy flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button 
                    onClick={clearFilters} 
                    className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>

              {/* 1. Category Filter Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-navy uppercase tracking-wider">Categories</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  <button
                    onClick={() => handleCategorySelect('')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      !selectedCategory ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>All Categories</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${!selectedCategory ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                      {products.length}
                    </span>
                  </button>

                  {categories.map((cat) => {
                    const count = getCategoryCount(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          selectedCategory === cat.id ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate pr-2">{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${selectedCategory === cat.id ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Price Range Filter */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-extrabold text-navy uppercase tracking-wider">Price Range (৳)</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Quick Price Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    onClick={() => { setMinPrice('0'); setMaxPrice('1500'); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    Under ৳1.5K
                  </button>
                  <button
                    onClick={() => { setMinPrice('1500'); setMaxPrice('5000'); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    ৳1.5K - ৳5K
                  </button>
                  <button
                    onClick={() => { setMinPrice('5000'); setMaxPrice(''); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    ৳5K+
                  </button>
                </div>
              </div>

              {/* 3. Availability Filter (In-Stock Only) */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                  />
                  <span className="text-xs font-bold text-navy">In Stock Only</span>
                </label>
              </div>

              {/* 4. Rating Filter */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-extrabold text-navy uppercase tracking-wider">Customer Rating</h4>
                <div className="space-y-1">
                  {[4, 3].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        selectedRating === star ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex text-brand-gold">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < star ? 'fill-current' : 'text-gray-200 fill-gray-200'}`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-semibold text-navy ml-1">& Up</span>
                      </div>
                      {selectedRating === star && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-100 bg-white rounded-3xl p-12 border border-gray-100 shadow-modern">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-sm text-gray-500 font-bold">Loading authentic products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-modern p-12 text-center border border-gray-100 space-y-4">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto" />
                <h3 className="text-xl font-black text-navy">No Matching Products Found</h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                  We couldn't find any products matching your current filters. Try adjusting price or clearing filters.
                </p>
                <button 
                  onClick={clearFilters}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-2xl transition-all shadow-md cursor-pointer hover:scale-102"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const wishlisted = isInWishlist(product.id);

                  return (
                    <div 
                      key={product.id} 
                      className="bg-white rounded-3xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col h-full relative"
                    >
                      {/* Product Image Box */}
                      <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-3 flex items-center justify-center">
                        
                        {/* New Badge */}
                        {product.isNewArrival && (
                          <span className="absolute top-3 left-3 z-10 bg-brand-green text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                            New
                          </span>
                        )}

                        {/* Discount Badge */}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                            -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                          </span>
                        )}

                        {/* Wishlist Button */}
                        <button
                          onClick={(e) => handleToggleWishlist(e, product)}
                          className={`absolute bottom-3 right-3 z-10 p-2 rounded-full shadow-md backdrop-blur-xs transition-all cursor-pointer ${
                            wishlisted 
                              ? 'bg-red-50 text-red-500 scale-105' 
                              : 'bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white hover:scale-110'
                          }`}
                          aria-label="Wishlist"
                        >
                          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                        </button>

                        <img 
                          src={product.images[0] || 'https://via.placeholder.com/400'} 
                          alt={product.name} 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 filter drop-shadow-xs"
                        />
                      </Link>

                      {/* Product Info Box */}
                      <div className="p-4 sm:p-5 flex flex-col grow">
                        
                        {/* Rating */}
                        {product.rating ? (
                          <div className="flex items-center gap-1 mb-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-extrabold text-navy">{product.rating}</span>
                            <span className="text-[10px] text-gray-400 font-medium">({product.reviewCount || 0})</span>
                          </div>
                        ) : null}

                        {/* Title */}
                        <Link 
                          to={`/products/${product.id}`} 
                          className="hover:text-primary transition-colors line-clamp-2 text-xs sm:text-sm font-extrabold text-navy mb-2 grow"
                        >
                          {product.name}
                        </Link>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-base sm:text-lg font-black text-primary font-mono block">
                              ৳{product.price.toLocaleString()}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-[11px] text-gray-400 line-through font-semibold font-mono">
                                ৳{product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <button 
                            onClick={(e) => handleQuickAddToCart(e, product)}
                            disabled={product.stock === 0}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white p-2.5 sm:p-3 rounded-2xl transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                            title={product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Mobile Filter Drawer Modal */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs" onClick={() => setIsFilterDrawerOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col z-10 space-y-5">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-navy flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Filters
              </h3>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="p-1 text-gray-400 hover:text-navy cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Categories */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider">Categories</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    !selectedCategory ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[10px]">{products.length}</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat.id ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate pr-2">{cat.name}</span>
                    <span className="text-[10px]">{getCategoryCount(cat.id)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Price */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider">Price Range (৳)</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-navy bg-gray-50"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-navy bg-gray-50"
                />
              </div>
            </div>

            {/* Mobile Availability */}
            <div className="pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 text-brand-green rounded border-gray-300"
                />
                <span className="text-xs font-bold text-navy">In Stock Only</span>
              </label>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-gray-100 mt-auto flex gap-3">
              <button
                onClick={clearFilters}
                className="w-1/2 py-3 border border-gray-300 text-navy font-extrabold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-1/2 py-3 bg-primary text-white font-extrabold text-xs rounded-xl hover:bg-primary-dark transition-colors shadow-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}