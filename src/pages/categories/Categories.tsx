import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Search, 
  Loader2, 
  LayoutGrid, 
  ShoppingBag, 
  Star, 
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { getCategories, getProducts } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import type { Category, Product } from '../../types/product';

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: 'All Products', slug: 'all', status: 'active', order: 0 }
];

// স্ট্যাটিক ও পারফরম্যান্ট স্মার্ট ক্যাটাগরি ম্যাচিং ইঞ্জিন
const isProductInCategory = (product: Product, targetCatId: string, categories: Category[]) => {
  if (targetCatId === 'all') return true;

  const clean = (str?: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const pCatId = clean(product.categoryId);
  const pCatName = clean((product as { categoryName?: string }).categoryName);
  const pName = clean(product.name);

  const targetCatObj = categories.find(c => c.id === targetCatId);
  const targetId = clean(targetCatId);
  const targetSlug = clean(targetCatObj?.slug);
  const targetName = clean(targetCatObj?.name);

  if (pCatId && (pCatId === targetId || pCatId === targetSlug)) return true;
  if (targetSlug && pCatId && (pCatId.includes(targetSlug) || targetSlug.includes(pCatId))) return true;
  if (targetName && pCatName && (pCatName.includes(targetName) || targetName.includes(pCatName))) return true;
  if (targetName.length >= 4 && pName.includes(targetName)) return true;
  if (targetSlug.length >= 4 && pName.includes(targetSlug)) return true;

  return false;
};

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const addItemToCart = useCartStore((state) => state.addItem);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          getCategories().catch(() => []),
          getProducts().catch(() => [])
        ]);

        if (isMounted) {
          if (fetchedCategories && fetchedCategories.length > 0) {
            const activeCustom = fetchedCategories.filter(c => c.status === 'active');
            setCategories([
              { id: 'all', name: 'All Products', slug: 'all', status: 'active', order: 0 },
              ...activeCustom.sort((a, b) => (a.order || 0) - (b.order || 0))
            ]);
          }

          if (fetchedProducts && fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          }
        }
      } catch (error) {
        console.error("Error loading categories data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = isProductInCategory(product, selectedCategoryId, categories);

      const matchesSearch = 
        !searchQuery.trim() || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, categories, searchQuery]);

  const handleBuyNow = (e: MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    navigate('/checkout');
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

  const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="bg-secondary min-h-screen py-6 md:py-10">
      <Helmet>
        <title>Categories & Catalog | ISAR</title>
        <meta name="description" content="Explore product collections at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-navy">Product Categories</h1>
              <p className="text-xs text-gray-500">Select any collection to browse authentic products instantly</p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products in category..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-2xl bg-white text-xs text-navy focus:outline-none focus:border-primary transition-colors shadow-xs"
            />
          </div>
        </div>

        {/* Horizontal Category Tab Bar */}
        <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-modern border border-gray-100">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const { icon: Icon, color } = getCategoryIconConfig(cat.name || cat.slug);

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected 
                      ? 'bg-navy text-white shadow-md scale-102 ring-2 ring-primary/20' 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-navy'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/20 text-white' : color} shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Category Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-navy">
              {selectedCategoryObj?.name || 'All Products'}
            </span>
            <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full font-mono">
              {filteredProducts.length} Items
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            <span>Real-time Live Inventory</span>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading collection products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-modern border border-gray-100 space-y-3">
            <Layers className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-bold text-navy">No Products in this Category</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              We are adding new products to this collection soon. Try selecting another category above!
            </p>
            <button
              onClick={() => { setSelectedCategoryId('all'); setSearchQuery(''); }}
              className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-primary-dark transition-colors"
            >
              View All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = (product.stock <= 0) || (product.status === 'out-of-stock');
              const discountPercent = (product.originalPrice && product.originalPrice > product.price)
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col"
                >
                  {/* Product Image */}
                  <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-2.5 sm:p-3 flex items-center justify-center">
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <span className="text-red-500 font-black text-lg sm:text-xl tracking-widest uppercase border-3 border-red-500 py-1 px-3 rounded-xl rotate-[-15deg] shadow-2xl bg-white/95">
                          SOLD OUT
                        </span>
                      </div>
                    )}

                    {!isOutOfStock && product.isNewArrival && (
                      <span className="absolute top-2 left-2 z-10 bg-brand-green text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        New
                      </span>
                    )}

                    {!isOutOfStock && discountPercent > 0 && (
                      <span className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        SAVE {discountPercent}%
                      </span>
                    )}

                    <img 
                      src={product.images[0] || 'https://via.placeholder.com/400'} 
                      alt={product.name} 
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Product Info & Action Buttons */}
                  <div className="p-3 sm:p-3.5 flex flex-col grow">
                    {product.rating ? (
                      <div className="flex items-center gap-1 mb-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-bold text-navy">{product.rating}</span>
                        <span className="text-[9px] text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                    ) : null}

                    <Link to={`/products/${product.id}`} className="hover:text-primary transition-colors line-clamp-2 text-xs font-black text-navy mb-1.5 grow">
                      {product.name}
                    </Link>
                    
                    <div className="flex items-baseline gap-1.5 mb-2.5">
                      <span className="text-xs sm:text-sm font-black text-primary font-mono">{product.price.toLocaleString()} BDT</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[9px] text-gray-400 line-through font-mono">{product.originalPrice.toLocaleString()} BDT</span>
                      )}
                    </div>

                    <div className="mt-auto pt-2 border-t border-gray-100">
                      {isOutOfStock ? (
                        <button 
                          disabled
                          className="w-full py-2 px-2 rounded-xl border-2 border-red-500 text-red-500 font-black text-[11px] uppercase tracking-wider bg-red-50/50 cursor-not-allowed text-center"
                        >
                          STOCK OUT
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                          <button 
                            onClick={(e) => handleBuyNow(e, product)}
                            className="py-1.5 sm:py-2 px-1 bg-navy hover:bg-slate-800 text-white font-black text-[9px] sm:text-[10px] rounded-lg shadow-xs transition-all hover:scale-[1.02] active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <Zap className="w-2.5 h-2.5 fill-brand-gold text-brand-gold" />
                            <span>Buy Now</span>
                          </button>

                          <button 
                            onClick={(e) => handleAddToCart(e, product)}
                            className="py-1.5 sm:py-2 px-1 bg-white hover:bg-gray-50 text-navy border border-gray-200 hover:border-primary font-black text-[9px] sm:text-[10px] rounded-lg transition-all active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <ShoppingBag className="w-2.5 h-2.5 text-primary" />
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

      </div>
    </div>
  );
}