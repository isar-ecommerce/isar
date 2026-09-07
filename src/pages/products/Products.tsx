import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  SlidersHorizontal, 
  X, 
  ShoppingBag, 
  Loader2, 
  ChevronDown, 
  Star, 
  RefreshCw, 
  Check, 
  Filter, 
  Zap 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getProducts, getCategories } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import type { Product, Category } from '../../types/product';

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);

  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const [sortBy, setSortBy] = useState<string>('default');

  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const addItemToCart = useCartStore((state) => state.addItem);

  const getTimestampMs = (val: unknown): number => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const ms = new Date(val).getTime();
      return isNaN(ms) ? 0 : ms;
    }
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return ((val as { toDate: () => Date }).toDate()).getTime();
    }
    return 0;
  };

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
          }

          if (fetchedCategories.length > 0) {
            const activeOnly = fetchedCategories.filter(c => c.status === 'active');
            setCategories(activeOnly.sort((a, b) => (a.order || 0) - (b.order || 0)));
          } else {
            setCategories([]);
          }
        }
      } catch (error) {
        console.error('Error loading shop data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // আল্ট্রা-স্মার্ট সেলফ-হিলিং ক্যাটাগরি ম্যাচিং ইঞ্জিন (স্ল্যাগ ও আইডি উভয় সমর্থন করে)
  const isProductInCategory = (product: Product, cat: Category | string) => {
    const clean = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const pCatId = clean(product.categoryId);
    const pCatName = clean((product as { categoryName?: string }).categoryName);
    const pName = clean(product.name);

    const targetId = typeof cat === 'string' ? clean(cat) : clean(cat.id);
    const targetSlug = typeof cat === 'string' ? clean(cat) : clean(cat.slug);
    const targetName = typeof cat === 'string' ? clean(cat) : clean(cat.name);

    if (pCatId && (pCatId === targetId || pCatId === targetSlug)) return true;
    if (targetSlug && pCatId && (pCatId.includes(targetSlug) || targetSlug.includes(pCatId))) return true;
    if (targetName && pCatName && (pCatName.includes(targetName) || targetName.includes(pCatName))) return true;
    if (targetName.length >= 4 && pName.includes(targetName)) return true;
    if (targetSlug.length >= 4 && pName.includes(targetSlug)) return true;

    return false;
  };

  const getCategoryCount = (category: Category) => {
    return products.filter(p => isProductInCategory(p, category)).length;
  };

  const filteredProducts = useMemo(() => {
    const selectedCatObj = categories.find(
      c => c.id.toLowerCase() === selectedCategory.toLowerCase() || 
           c.slug.toLowerCase() === selectedCategory.toLowerCase()
    );

    return products
      .filter((product) => {
        if (selectedCategory && selectedCategory !== 'all') {
          const matched = selectedCatObj 
            ? isProductInCategory(product, selectedCatObj)
            : isProductInCategory(product, selectedCategory);
          if (!matched) return false;
        }

        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matches = 
            product.name.toLowerCase().includes(query) ||
            product.shortDescription?.toLowerCase().includes(query);
          if (!matches) return false;
        }

        if (minPrice && product.price < Number(minPrice)) return false;
        if (maxPrice && product.price > Number(maxPrice)) return false;
        if (inStockOnly && product.stock <= 0) return false;
        if (selectedRating !== null && (product.rating || 0) < selectedRating) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'newest') return getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
        return 0;
      });
  }, [products, selectedCategory, categories, searchQuery, minPrice, maxPrice, inStockOnly, selectedRating, sortBy]);

  // Point 7: ক্লিন Slug URL হ্যান্ডলার
  const handleCategorySelect = (categoryTarget: string) => {
    if (selectedCategory === categoryTarget || !categoryTarget) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryTarget);
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

  // Point 12: Buy Now - চেকআউটে ডায়নামিক প্রোডাক্ট নাম সহ ব্যাক লিংক পাস করা
  const handleBuyNow = (e: MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    navigate('/checkout', {
      state: { from: product.name, path: `/products/${product.id}` },
    });
  };

  const handleAddToCart = (e: MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  const hasActiveFilters = Boolean(
    selectedCategory || searchQuery || minPrice || maxPrice || inStockOnly || selectedRating !== null
  );

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>Shop Products | ISAR</title>
        <meta name="description" content="Browse authentic backpacks, smartphone accessories, and lifestyle gear at ISAR." />
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
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-white rounded-xl shadow-xs border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>

        {/* Top Controls */}
        <div className="bg-white rounded-2xl shadow-modern p-4 flex flex-wrap items-center justify-between gap-4 border border-gray-100">
          
          <button 
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters {hasActiveFilters && '(Active)'}
          </button>

          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Category: {categories.find(c => c.slug === selectedCategory || c.id === selectedCategory)?.name || selectedCategory}
                <button type="button" onClick={() => handleCategorySelect('')} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                Search: {searchQuery}
                <button type="button" onClick={() => { searchParams.delete('search'); setSearchParams(searchParams); }} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold border border-brand-green/20">
                In Stock Only
                <button type="button" onClick={() => setInStockOnly(false)} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold border border-amber-500/20">
                {minPrice || '0'} BDT - {maxPrice ? `${maxPrice} BDT` : 'Any'}
                <button type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
            {selectedRating !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/15 text-navy text-xs font-bold border border-brand-gold/30">
                {selectedRating}★ & Above
                <button type="button" onClick={() => setSelectedRating(null)} className="hover:text-red-500 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

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
                    type="button"
                    onClick={clearFilters} 
                    className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>

              {/* 1. Category Filter Section (Point 7: Clean Slug Matching) */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-navy uppercase tracking-wider">Categories</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  <button
                    type="button"
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
                    const count = getCategoryCount(cat);
                    const categoryTarget = cat.slug || cat.id;
                    const isSelected = selectedCategory === cat.slug || selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(categoryTarget)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate pr-2">{cat.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${isSelected ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Price Range in BDT */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-extrabold text-navy uppercase tracking-wider">Price Range (BDT)</h4>
                
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

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setMinPrice('0'); setMaxPrice('1500'); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    Under 1.5K BDT
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice('1500'); setMaxPrice('5000'); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    1.5K - 5K BDT
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMinPrice('5000'); setMaxPrice(''); }}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                  >
                    5K+ BDT
                  </button>
                </div>
              </div>

              {/* 3. Availability Filter */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-brand-green rounded border-gray-300 focus:ring-brand-green cursor-pointer"
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
                      type="button"
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

          {/* Product Grid Area (Point 3 & Point 6 Polish Applied) */}
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
                  We couldn't find any products matching your current filters. Try selecting another category or clearing filters.
                </p>
                <button 
                  type="button"
                  onClick={clearFilters}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-2xl transition-all shadow-md cursor-pointer hover:scale-102"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
                {filteredProducts.map((product) => {
                  const isOutOfStock = (product.stock <= 0) || (product.status === 'out-of-stock');
                  const discountPercent = (product.originalPrice && product.originalPrice > product.price)
                    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                    : 0;

                  // Point 3: Hide rating if zero reviews
                  const hasReviews = (product.reviewCount || 0) > 0;

                  return (
                    <div 
                      key={product.id} 
                      className="bg-white rounded-3xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col h-full relative"
                    >
                      {/* Product Image Box */}
                      <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-2.5 flex items-center justify-center">
                        
                        {/* Sold Out Red Watermark Stamp */}
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
                            <span className="text-red-500 font-black text-xs sm:text-sm tracking-widest uppercase border-2 border-red-500 py-0.5 px-2 rounded-lg -rotate-12 shadow-lg bg-white/95">
                              SOLD OUT
                            </span>
                          </div>
                        )}

                        {/* New Badge */}
                        {!isOutOfStock && product.isNewArrival && (
                          <span className="absolute top-2.5 left-2.5 z-10 bg-brand-green text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                            New
                          </span>
                        )}

                        {/* Save Discount Badge */}
                        {!isOutOfStock && discountPercent > 0 && (
                          <span className="absolute top-2.5 right-2.5 z-10 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
                            SAVE {discountPercent}%
                          </span>
                        )}

                        <img 
                          src={product.images[0] || 'https://via.placeholder.com/400'} 
                          alt={product.name} 
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 filter drop-shadow-2xs"
                        />
                      </Link>

                      {/* Product Info & Compact Action Buttons (Point 6) */}
                      <div className="p-3 sm:p-4 flex flex-col grow">
                        
                        {/* Point 3: Only display rating if reviewCount > 0 */}
                        {hasReviews ? (
                          <div className="flex items-center gap-1 mb-1 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-extrabold text-navy">{product.rating}</span>
                            <span className="text-[10px] text-gray-400 font-medium">({product.reviewCount})</span>
                          </div>
                        ) : (
                          <div className="h-4 mb-1 text-[9px] text-gray-400 font-medium flex items-center">
                            Verified Authentic
                          </div>
                        )}

                        {/* Title */}
                        <Link 
                          to={`/products/${product.id}`} 
                          className="hover:text-primary transition-colors line-clamp-2 text-xs sm:text-sm font-black text-navy mb-1.5 grow leading-snug"
                        >
                          {product.name}
                        </Link>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 mb-3">
                          <span className="text-xs sm:text-sm font-black text-primary font-mono block">
                            {product.price.toLocaleString()} BDT
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[10px] text-gray-400 line-through font-semibold font-mono">
                              {product.originalPrice.toLocaleString()} BDT
                            </span>
                          )}
                        </div>

                        {/* Compact Action Buttons */}
                        <div className="mt-auto pt-2 border-t border-gray-100">
                          {isOutOfStock ? (
                            <button 
                              type="button"
                              disabled
                              className="w-full py-2 px-2 rounded-xl border border-red-500 text-red-500 font-black text-[11px] uppercase tracking-wider bg-red-50/50 cursor-not-allowed text-center"
                            >
                              Stock Out
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {/* 1-Click Buy Now (Point 12: Passes product title for dynamic back button) */}
                              <button 
                                type="button"
                                onClick={(e) => handleBuyNow(e, product)}
                                className="py-2 px-1 bg-navy hover:bg-slate-800 text-white font-black text-[10px] sm:text-xs rounded-xl shadow-2xs transition-all hover:scale-[1.02] active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Zap className="w-3 h-3 fill-brand-gold text-brand-gold" />
                                <span>Buy Now</span>
                              </button>

                              {/* Add to Cart */}
                              <button 
                                type="button"
                                onClick={(e) => handleAddToCart(e, product)}
                                className="py-2 px-1 bg-white hover:bg-gray-50 text-navy border border-gray-200 hover:border-primary font-black text-[10px] sm:text-xs rounded-xl transition-all active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ShoppingBag className="w-3 h-3 text-primary" />
                                <span>Add to Cart</span>
                              </button>
                            </div>
                          )}
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

      {/* Mobile Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-xs" onClick={() => setIsFilterDrawerOpen(false)} />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col z-10 space-y-5">
            
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-navy flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Filters
              </h3>
              <button type="button" onClick={() => setIsFilterDrawerOpen(false)} className="p-1 text-gray-400 hover:text-navy cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider">Categories</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    !selectedCategory ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[10px]">{products.length}</span>
                </button>
                {categories.map((cat) => {
                  const categoryTarget = cat.slug || cat.id;
                  const isSelected = selectedCategory === cat.slug || selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(categoryTarget)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="text-[10px]">{getCategoryCount(cat)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-black text-navy uppercase tracking-wider">Price Range (BDT)</h4>
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

            <div className="pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 text-brand-green rounded border-gray-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-navy">In Stock Only</span>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 mt-auto flex gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="w-1/2 py-3 border border-gray-300 text-navy font-extrabold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Reset All
              </button>
              <button
                type="button"
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