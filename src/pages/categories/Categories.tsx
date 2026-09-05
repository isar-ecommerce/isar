import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Search, 
  Loader2, 
  LayoutGrid, 
  ShoppingBag, 
  Star, 
  Sparkles,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { getCategories, getProducts } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import type { Category, Product } from '../../types/product';

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: 'All Products', slug: 'all', status: 'active', order: 0 },
  { id: 'backpacks', name: 'Bags & Backpacks', slug: 'backpacks', status: 'active', order: 1 },
  { id: 'phone-accessories', name: 'Phone Accessories', slug: 'phone-accessories', status: 'active', order: 2 },
  { id: 'audio-gadgets', name: 'Audio & Earphones', slug: 'audio-gadgets', status: 'active', order: 3 },
  { id: 'smart-gear', name: 'Smart Watches & Bands', slug: 'smart-gear', status: 'active', order: 4 },
  { id: 'chargers', name: 'Cables & Chargers', slug: 'chargers', status: 'active', order: 5 },
  { id: 'travel-lifestyle', name: 'Travel & Lifestyle', slug: 'travel-lifestyle', status: 'active', order: 6 },
];

export default function Categories() {
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
          if (fetchedCategories.length > 0) {
            const activeCustom = fetchedCategories.filter(c => c.status === 'active');
            setCategories([
              { id: 'all', name: 'All Products', slug: 'all', status: 'active', order: 0 },
              ...activeCustom.sort((a, b) => (a.order || 0) - (b.order || 0))
            ]);
          }

          if (fetchedProducts.length > 0) {
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

  // TypeScript Safe Category & Search Filter
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const customCategoryName = (product as { categoryName?: string }).categoryName || '';
      
      const matchesCategory = 
        selectedCategoryId === 'all' || 
        product.categoryId === selectedCategoryId || 
        product.categoryId?.toLowerCase() === selectedCategoryId.toLowerCase() ||
        customCategoryName.toLowerCase() === selectedCategoryId.toLowerCase();

      const matchesSearch = 
        !searchQuery.trim() || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  const handleQuickAddToCart = (product: Product) => {
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  const selectedCategoryObj = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="bg-secondary min-h-screen py-6 md:py-10">
      <Helmet>
        <title>Categories & Catalog | ISAR</title>
        <meta name="description" content="Explore all bags, smartphone accessories, and lifestyle collections at ISAR." />
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

          {/* Search Input */}
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

        {/* 1. Horizontal Category Tab Bar */}
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

        {/* 2. Active Category Title & Live Item Count */}
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

        {/* 3. Products Responsive Grid */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col"
              >
                {/* Product Image Frame */}
                <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-2.5 sm:p-3 flex items-center justify-center">
                  {product.isNewArrival && (
                    <span className="absolute top-2 left-2 z-10 bg-brand-green text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      New
                    </span>
                  )}
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  )}
                  <img 
                    src={product.images[0] || 'https://via.placeholder.com/400'} 
                    alt={product.name} 
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Product Info */}
                <div className="p-3 sm:p-3.5 flex flex-col grow">
                  {product.rating ? (
                    <div className="flex items-center gap-1 mb-1 text-amber-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[11px] font-bold text-navy">{product.rating}</span>
                      <span className="text-[9px] text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                  ) : null}

                  <Link to={`/products/${product.id}`} className="hover:text-primary transition-colors line-clamp-2 text-xs font-bold text-navy mb-2 grow">
                    {product.name}
                  </Link>
                  
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                    <div>
                      <span className="text-xs sm:text-sm font-black text-primary font-mono">{product.price.toLocaleString()} BDT</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[9px] text-gray-400 line-through ml-1 block sm:inline font-mono">{product.originalPrice.toLocaleString()} BDT</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleQuickAddToCart(product)}
                      className="bg-primary/10 hover:bg-primary text-primary hover:text-white p-1.5 rounded-xl transition-colors shrink-0 cursor-pointer"
                      title="Add to Cart"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}