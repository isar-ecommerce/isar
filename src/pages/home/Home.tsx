import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Clock, 
  Star, 
  Loader2,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { getProducts, getCategories } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import FlashSaleTimer from '../../components/home/FlashSaleTimer';
import type { Product, Category } from '../../types/product';

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const addItemToCart = useCartStore((state) => state.addItem);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getProducts().catch(() => []),
          getCategories().catch(() => [])
        ]);

        if (isMounted) {
          if (fetchedProducts && fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          }

          if (fetchedCategories && fetchedCategories.length > 0) {
            const activeOnly = fetchedCategories
              .filter(c => c.status === 'active')
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            setCategories(activeOnly);
          }
        }
      } catch (error) {
        console.error("Error loading homepage live data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Buy Now: সরাসরি কার্টে আইটেম যুক্ত করে /checkout পেজে নিয়ে যাবে
  const handleBuyNow = (product: Product) => {
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    navigate('/checkout');
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  return (
    <div className="w-full bg-secondary min-h-screen pb-12">
      <Helmet>
        <title>ISAR | Premium Bags, Smart Accessories & Lifestyle Gear</title>
        <meta name="description" content="Shop authentic bags, smartphone accessories, and everyday lifestyle gear at ISAR with fast delivery across Bangladesh." />
      </Helmet>

      {/* Hero Banner Section */}
      <section className="bg-white">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 md:py-8">
          <div className="relative bg-navy rounded-3xl overflow-hidden shadow-modern-lg">
            <div className="absolute inset-0 bg-linear-to-r from-navy via-navy to-primary/80 z-0"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 md:p-12">
              <div className="w-full md:w-3/5 space-y-3 sm:space-y-4 text-center md:text-left">
                <span className="inline-block py-1 px-3.5 rounded-full bg-primary/20 text-primary-light text-[11px] sm:text-xs font-black border border-primary/30 tracking-wide uppercase">
                  Premium Bags & Smart Accessories
                </span>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                  Upgrade Your <br className="hidden sm:inline" />
                  <span className="text-brand-gold">Everyday Carry</span>
                </h1>
                <p className="text-gray-300 text-xs sm:text-sm max-w-md mx-auto md:mx-0 line-clamp-2 sm:line-clamp-none">
                  Discover premium bags, sleek smartphone accessories, and lifestyle essentials delivered across Bangladesh.
                </p>
                <div className="pt-1 sm:pt-2">
                  <Link 
                    to="/products" 
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                    Shop Collection
                  </Link>
                </div>
              </div>

              <div className="hidden md:block w-2/5 relative mt-4 md:mt-0">
                <div className="w-48 h-48 lg:w-60 lg:h-60 mx-auto rounded-3xl bg-linear-to-tr from-primary/30 to-brand-gold/20 border border-white/10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-xs">
                  <span className="text-2xl font-black text-brand-gold tracking-widest">ISAR</span>
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Official Store</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-6 overflow-x-auto no-scrollbar py-1">
            
            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">Fast Delivery</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">All Bangladesh</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">100% Authentic</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Quality Verified</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">Cash on Delivery</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Pay on Delivery</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">24/7 Support</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Helpline Care</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Flash Sale Banner */}
      <section className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <FlashSaleTimer />
      </section>

      {/* Dynamic Categories Section */}
      {categories.length > 0 && (
        <section className="pt-5 pb-4 container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-xl font-black text-navy">Categories</h2>
            <Link to="/categories" className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group">
              See All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex sm:grid sm:grid-cols-3 md:grid-cols-6 gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map((category) => {
              const { icon: Icon, color } = getCategoryIconConfig(category.name || category.slug);
              
              return (
                <Link 
                  key={category.id} 
                  to={`/products?category=${category.id}`}
                  className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-modern hover:shadow-modern-lg transition-all border border-gray-100 group w-28 sm:w-auto shrink-0 min-h-24 cursor-pointer"
                >
                  <div className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-navy text-center line-clamp-1">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Trending Products Section with Buy Now & Add to Cart */}
      <section className="py-6 container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-xl font-black text-navy">Trending Products</h2>
            <p className="text-[11px] sm:text-xs text-gray-500">Popular & newly added items</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollSlider('left')}
              className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-sm hidden sm:block cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => scrollSlider('right')}
              className="p-1.5 sm:p-2 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-sm hidden sm:block cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <Link to="/products" className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group">
              View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading live products...</span>
          </div>
        ) : (
          <div 
            ref={sliderRef}
            className="flex gap-3 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar"
          >
            {products.map((product) => {
              const isOutOfStock = (product.stock <= 0) || (product.status === 'out-of-stock');
              const discountPercent = (product.originalPrice && product.originalPrice > product.price)
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              return (
                <div 
                  key={product.id} 
                  className="w-44 sm:w-56 md:w-64 bg-white rounded-3xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col shrink-0"
                >
                  <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-3 flex items-center justify-center">
                    
                    {/* Sold Out Watermark */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
                        <span className="text-red-500 font-black text-base sm:text-xl tracking-widest uppercase border-2 border-red-500 py-1 px-3 rounded-xl rotate-[-15deg] shadow-2xl bg-white/95">
                          SOLD OUT
                        </span>
                      </div>
                    )}

                    {!isOutOfStock && product.isNewArrival && (
                      <span className="absolute top-2 left-2 z-10 bg-brand-green text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        New
                      </span>
                    )}

                    {!isOutOfStock && discountPercent > 0 && (
                      <span className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                        SAVE {discountPercent}%
                      </span>
                    )}

                    <img 
                      src={product.images[0] || 'https://via.placeholder.com/400'} 
                      alt={product.name} 
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  <div className="p-3 sm:p-4 flex flex-col grow">
                    {product.rating ? (
                      <div className="flex items-center gap-1 mb-1 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[11px] font-bold text-navy">{product.rating}</span>
                        <span className="text-[9px] text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                    ) : null}

                    <Link to={`/products/${product.id}`} className="hover:text-primary transition-colors line-clamp-2 text-xs sm:text-sm font-black text-navy mb-2 grow">
                      {product.name}
                    </Link>
                    
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="text-xs sm:text-sm font-black text-primary font-mono">{product.price.toLocaleString()} BDT</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[9px] text-gray-400 line-through font-mono">{product.originalPrice.toLocaleString()} BDT</span>
                      )}
                    </div>
                    
                    {/* Buy Now & Add to Cart Dual Buttons */}
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
                            onClick={() => handleBuyNow(product)}
                            className="py-1.5 sm:py-2 px-1 bg-navy hover:bg-slate-800 text-white font-black text-[9px] sm:text-[10px] rounded-lg shadow-xs transition-all hover:scale-[1.02] active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-0.5"
                          >
                            <Zap className="w-2.5 h-2.5 fill-brand-gold text-brand-gold" />
                            <span>Buy Now</span>
                          </button>

                          <button 
                            onClick={() => handleAddToCart(product)}
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
      </section>

    </div>
  );
}