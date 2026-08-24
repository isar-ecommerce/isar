import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  SlidersHorizontal, 
  X, 
  ShoppingBag, 
  Loader2, 
  ChevronDown, 
  Star, 
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getProducts, getCategories } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
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

  const addItemToCart = useCartStore((state) => state.addItem);

  // ফায়ারস্টোর থেকে ডেটা লোড করা
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
          // রিয়েল ফায়ারস্টোর প্রোডাক্টস লোড
          if (fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }

          // ক্যাটাগরি তালিকা মার্জ করা (যাতে Bag সহ সব ক্যাটাগরি থাকে)
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

  // ফিল্টার এবং সার্চ এপ্লাই করা
  const filteredProducts = products
    .filter((product) => {
      // ক্যাটাগরি ফিল্টার
      if (selectedCategory && selectedCategory !== 'all') {
        const matchCategory = 
          product.categoryId === selectedCategory ||
          product.categoryId?.toLowerCase() === selectedCategory.toLowerCase();
        if (!matchCategory) return false;
      }

      // সার্চ টেস্ট
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.shortDescription?.toLowerCase().includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

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
    setIsFilterDrawerOpen(false);
  };

  const handleQuickAddToCart = (product: Product) => {
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  return (
    <div className="bg-secondary min-h-screen py-8">
      <Helmet>
        <title>Shop Products | ISAR Marketplace</title>
        <meta name="description" content="Browse and shop high-quality electronics, fashion, and lifestyle products at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy">Shop Products</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Showing {filteredProducts.length} items {searchQuery && `for "${searchQuery}"`}
          </p>
        </div>

        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl shadow-modern p-4 mb-6 flex flex-wrap items-center justify-between gap-4 border border-gray-100">
          
          {/* Mobile Filter Button */}
          <button 
            onClick={() => setIsFilterDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-navy border border-gray-200 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Filters
          </button>

          {/* Active Tags */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                <button onClick={() => handleCategorySelect('')} className="hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Search: {searchQuery}
                <button onClick={() => { searchParams.delete('search'); setSearchParams(searchParams); }} className="hover:text-red-500">
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
                className="appearance-none bg-gray-50 border border-gray-200 text-navy text-xs md:text-sm font-bold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="default">Default Sorting</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Desktop Filter Sidebar (All categories show here) */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-modern p-6 border border-gray-100 space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-navy flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  Categories
                </h3>
                {(selectedCategory || searchQuery) && (
                  <button 
                    onClick={clearFilters} 
                    className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* Categories Filter List */}
              <div className="space-y-1.5 max-h-125 overflow-y-auto pr-1">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    !selectedCategory ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedCategory === cat.id ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-100">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                <p className="text-sm text-gray-500 font-medium">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-modern p-12 text-center border border-gray-100">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-navy mb-2">No Products Found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                  We couldn't find any products matching your current category filter or search query.
                </p>
                <button 
                  onClick={clearFilters}
                  className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col h-full">
                    
                    {/* Product Image Box */}
                    <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50 block">
                      {product.isNewArrival && (
                        <span className="absolute top-3 left-3 z-10 bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
                          New
                        </span>
                      )}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="absolute top-3 right-3 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                          -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                        </span>
                      )}
                      <img 
                        src={product.images[0] || 'https://via.placeholder.com/400'} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* Product Info Box */}
                    <div className="p-4 flex flex-col grow">
                      {product.rating ? (
                        <div className="flex items-center gap-1 mb-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="text-xs font-bold text-navy">{product.rating}</span>
                          <span className="text-[10px] text-gray-400">({product.reviewCount || 0})</span>
                        </div>
                      ) : null}

                      <Link 
                        to={`/products/${product.id}`} 
                        className="hover:text-primary transition-colors line-clamp-2 text-xs md:text-sm font-semibold text-navy mb-2 grow"
                      >
                        {product.name}
                      </Link>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                        <div>
                          <span className="text-base md:text-lg font-extrabold text-primary">
                            ৳{product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="block text-[11px] text-gray-400 line-through">
                              ৳{product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleQuickAddToCart(product)}
                          className="bg-primary/10 hover:bg-primary text-primary hover:text-white p-2 md:p-2.5 rounded-full transition-colors shrink-0"
                          title="Add to cart"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Mobile Filter Drawer (Modal) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFilterDrawerOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-base font-bold text-navy">Filter Categories</h3>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="p-1 text-gray-500 hover:text-navy">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2 grow overflow-y-auto">
              <button
                onClick={() => handleCategorySelect('')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  !selectedCategory ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                    selectedCategory === cat.id ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 mt-auto flex gap-3">
              <button
                onClick={clearFilters}
                className="w-1/2 py-2.5 border border-gray-300 text-navy font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}