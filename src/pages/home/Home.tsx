import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Zap,
  Flame,
  Sparkles,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { useSettingsStore, type HeroBannerItem } from '../../store/settingsStore';
import { getProducts, getCategories } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import FlashSaleTimer from '../../components/home/FlashSaleTimer';
import type { Product, Category } from '../../types/product';

const DEFAULT_BANNERS: HeroBannerItem[] = [
  {
    id: 'banner-1',
    badge: 'Mega Anniversary Sale',
    title: 'Upgrade Your',
    highlightText: 'Everyday Carry',
    description: 'Discover premium backpacks, travel gear & everyday accessories across Bangladesh.',
    buttonText: 'Shop Collection',
    linkUrl: '/products',
    bgGradient: 'from-navy via-slate-900 to-primary/90',
  },
  {
    id: 'banner-2',
    badge: 'Trending Tech & Gear',
    title: 'Smart Gadgets &',
    highlightText: 'Mobile Accessories',
    description: 'High-speed chargers, sleek smartphone gear and audio essentials at unbeatable prices.',
    buttonText: 'Explore Gadgets',
    linkUrl: '/products?category=smart-phone',
    bgGradient: 'from-slate-950 via-blue-950 to-indigo-900',
  },
  {
    id: 'banner-3',
    badge: 'Express Fast Shipping',
    title: '100% Authentic Quality,',
    highlightText: 'Zero Cash Advance',
    description: 'Enjoy pure Cash on Delivery to all 64 districts with verified quality inspection.',
    buttonText: 'View All Products',
    linkUrl: '/products',
    bgGradient: 'from-navy via-navy-light to-slate-900',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [currentBannerIndex, setCurrentBannerIndex] = useState<number>(0);
  const [isBannerHovered, setIsBannerHovered] = useState<boolean>(false);

  const { heroBanners, siteName } = useSettingsStore();
  const banners = heroBanners && heroBanners.length > 0 ? heroBanners : DEFAULT_BANNERS;

  const trendingSliderRef = useRef<HTMLDivElement>(null);
  const { addItem: addItemToCart, clearCart } = useCartStore();

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
        console.error('Error loading homepage live data:', error);
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

  useEffect(() => {
    if (isBannerHovered || banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % banners.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isBannerHovered, banners.length]);

  const goToNextBanner = useCallback(() => {
    setCurrentBannerIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrevBanner = useCallback(() => {
    setCurrentBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const scrollSlider = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleBuyNow = (product: Product) => {
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    clearCart();
    addItemToCart(product, 1);
    navigate('/checkout', {
      state: { from: product.name, path: `/products/${product.id}` },
    });
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  const trendingProducts = useMemo(() => {
    const featured = products.filter(p => p.isTrending || p.isFeatured);
    return featured.length > 0 ? featured : products;
  }, [products]);

  const dynamicCustomSections = useMemo(() => {
    const sectionMap: Record<string, Product[]> = {};

    products.forEach((product) => {
      const section = (product as { customSection?: string })?.customSection?.trim();
      if (section) {
        if (!sectionMap[section]) {
          sectionMap[section] = [];
        }
        sectionMap[section].push(product);
      }
    });

    return Object.entries(sectionMap).map(([sectionTitle, items]) => ({
      title: sectionTitle,
      items,
    }));
  }, [products]);

  const activeBanner = banners[currentBannerIndex] || DEFAULT_BANNERS[0];

  const renderProductCard = (product: Product) => {
    const isOutOfStock = (product.stock <= 0) || (product.status === 'out-of-stock');
    const discountPercent = (product.originalPrice && product.originalPrice > product.price)
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    const hasReviews = (product.reviewCount || 0) > 0;

    return (
      <div 
        key={product.id} 
        className="w-44 sm:w-52 md:w-60 bg-white rounded-3xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col shrink-0"
      >
        <Link to={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-gray-50/50 p-2.5 flex items-center justify-center">
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
              <span className="text-red-500 font-black text-xs sm:text-sm tracking-widest uppercase border-2 border-red-500 py-0.5 px-2 rounded-lg -rotate-12 shadow-lg bg-white/95">
                SOLD OUT
              </span>
            </div>
          )}

          {!isOutOfStock && product.isNewArrival && (
            <span className="absolute top-2 left-2 z-10 bg-brand-green text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
              New
            </span>
          )}

          {!isOutOfStock && discountPercent > 0 && (
            <span className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs">
              -{discountPercent}%
            </span>
          )}

          <img 
            src={product.images[0] || 'https://via.placeholder.com/350'} 
            alt={product.name} 
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        <div className="p-3 flex flex-col grow">
          {hasReviews ? (
            <div className="flex items-center gap-1 mb-1 text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-[11px] font-bold text-navy">{product.rating}</span>
              <span className="text-[9px] text-gray-400 font-medium">({product.reviewCount})</span>
            </div>
          ) : (
            <div className="h-4 mb-1 text-[9px] text-gray-400 font-medium flex items-center">
              Verified Authentic
            </div>
          )}

          <Link to={`/products/${product.id}`} className="hover:text-primary transition-colors line-clamp-2 text-xs font-black text-navy mb-1.5 grow leading-snug">
            {product.name}
          </Link>
          
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="text-xs sm:text-sm font-black text-primary font-mono">{product.price.toLocaleString()} BDT</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] text-gray-400 line-through font-mono">{product.originalPrice.toLocaleString()} BDT</span>
            )}
          </div>
          
          <div className="mt-auto pt-2 border-t border-gray-100">
            {isOutOfStock ? (
              <button 
                type="button"
                disabled
                className="w-full py-1.5 px-2 rounded-xl border border-red-500 text-red-500 font-black text-[10px] uppercase tracking-wider bg-red-50/50 cursor-not-allowed text-center"
              >
                Stock Out
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button"
                  onClick={() => handleBuyNow(product)}
                  className="py-1.5 px-1 bg-navy hover:bg-slate-800 text-white font-black text-[10px] rounded-xl shadow-2xs transition-all hover:scale-[1.02] active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3 fill-brand-gold text-brand-gold" />
                  <span>Buy Now</span>
                </button>

                <button 
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  className="py-1.5 px-1 bg-white hover:bg-gray-50 text-navy border border-gray-200 hover:border-primary font-black text-[10px] rounded-xl transition-all active:scale-95 text-center uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1"
                >
                  <ShoppingBag className="w-3 h-3 text-primary" />
                  <span>Cart</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-secondary min-h-screen pb-12 space-y-4 sm:space-y-6">
      <Helmet>
        <title>{`${siteName || 'ISAR'} | Premium Bags, Smart Accessories & Lifestyle Gear`}</title>
        <meta 
          name="description" 
          content="Shop authentic backpacks, smartphone accessories, and everyday lifestyle gear at ISAR with fast delivery across Bangladesh." 
        />
      </Helmet>

      {/* Hero Banner Section */}
      <section className="bg-white pt-2 sm:pt-4">
        <div className="container mx-auto px-3 sm:px-4">
          <div 
            className="relative rounded-3xl overflow-hidden shadow-modern-lg min-h-55 sm:min-h-80 md:min-h-95 flex items-center group transition-all"
            onMouseEnter={() => setIsBannerHovered(true)}
            onMouseLeave={() => setIsBannerHovered(false)}
          >
            {activeBanner.imageUrl ? (
              <Link to={activeBanner.linkUrl || '/products'} className="w-full h-full absolute inset-0 z-10 cursor-pointer">
                <img 
                  src={activeBanner.imageUrl} 
                  alt={activeBanner.title || 'Promotional Banner'} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-101"
                />
              </Link>
            ) : (
              <>
                <div className={`absolute inset-0 bg-linear-to-r ${activeBanner.bgGradient || 'from-navy via-slate-900 to-primary/90'} transition-all duration-700 z-0`} />

                <Link 
                  to={activeBanner.linkUrl || '/products'}
                  className="relative z-10 w-full h-full p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer focus:outline-none"
                >
                  <div className="w-full md:w-3/5 space-y-2.5 sm:space-y-4 text-center md:text-left">
                    <span className="inline-block py-1 px-3 rounded-full bg-primary/25 text-brand-gold text-[10px] sm:text-xs font-black border border-brand-gold/30 tracking-wider uppercase">
                      {activeBanner.badge || 'Special Offer'}
                    </span>

                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
                      {activeBanner.title} <br className="hidden sm:inline" />
                      <span className="text-brand-gold">{activeBanner.highlightText}</span>
                    </h1>

                    <p className="text-gray-300 text-xs sm:text-sm max-w-md mx-auto md:mx-0 line-clamp-2 sm:line-clamp-none leading-relaxed">
                      {activeBanner.description}
                    </p>

                    <div className="pt-2">
                      <span className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-6 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-sm transition-all shadow-md group-hover:scale-105 active:scale-95">
                        <ShoppingBag className="w-4 h-4" />
                        {activeBanner.buttonText || 'Shop Collection'}
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>

                  <div className="hidden md:flex w-2/5 justify-end">
                    <div className="w-48 h-48 lg:w-56 lg:h-56 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center p-6 text-center shadow-2xl group-hover:scale-102 transition-transform">
                      <div className="w-12 h-12 rounded-2xl bg-brand-gold/20 flex items-center justify-center text-brand-gold mb-3">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <span className="text-2xl font-black text-white tracking-widest uppercase">{siteName || 'ISAR'}</span>
                      <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mt-1">Official Flagship Store</span>
                      <span className="text-[9px] text-gray-300 mt-2">100% Genuine • Fast Nationwide Shipping</span>
                    </div>
                  </div>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goToPrevBanner(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer shadow-md"
              aria-label="Previous Banner"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); goToNextBanner(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer shadow-md"
              aria-label="Next Banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setCurrentBannerIndex(idx); }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentBannerIndex === idx ? 'w-6 bg-brand-gold' : 'w-2 bg-white/50 hover:bg-white/90'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white border-y border-gray-100 py-3">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-6 overflow-x-auto no-scrollbar">
            
            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">Fast Delivery</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Nationwide 64 Districts</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">100% Authentic</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Verified Quality QC</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">Cash on Delivery</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">0 BDT Advance</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-gray-50/80 sm:bg-transparent">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy whitespace-nowrap">Dedicated Support</h4>
                <p className="text-[10px] text-gray-400 whitespace-nowrap">Helpline Care & WhatsApp</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Flash Sale Component */}
      <section className="container mx-auto px-3 sm:px-4">
        <FlashSaleTimer />
      </section>

      {/* Categories Horizontal Grid */}
      {categories.length > 0 && (
        <section className="container mx-auto px-3 sm:px-4 pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Product Categories
            </h2>
            <Link 
              to="/categories" 
              className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group"
            >
              See All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {categories.map((category) => {
              const { icon: Icon, color } = getCategoryIconConfig(category.name || category.slug);
              const categoryTarget = category.slug || category.id;
              
              return (
                <Link 
                  key={category.id} 
                  to={`/products?category=${encodeURIComponent(categoryTarget)}`}
                  className="bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 shadow-modern hover:shadow-modern-lg transition-all border border-gray-100 group w-28 sm:w-36 shrink-0 min-h-24 cursor-pointer hover:border-primary/40"
                >
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-2xs`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-navy text-center line-click-1">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Section: Trending Products */}
      <section className="container mx-auto px-3 sm:px-4 pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" /> Trending Products
            </h2>
            <p className="text-[11px] text-gray-500">Popular & frequently purchased gear</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSlider(trendingSliderRef, 'left')}
              className="p-1.5 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-2xs hidden sm:flex items-center justify-center cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollSlider(trendingSliderRef, 'right')}
              className="p-1.5 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-2xs hidden sm:flex items-center justify-center cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <Link to="/products" className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group">
              View All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading live products...</span>
          </div>
        ) : (
          <div 
            ref={trendingSliderRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar"
          >
            {trendingProducts.map((product) => renderProductCard(product))}
          </div>
        )}
      </section>

      {/* Point 4: Dynamic Custom Sections created by Admin */}
      {dynamicCustomSections.map((section) => (
        <section key={section.title} className="container mx-auto px-3 sm:px-4 pt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-navy flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> {section.title}
              </h2>
              <p className="text-[11px] text-gray-500">Special curated collection</p>
            </div>

            <Link 
              to={`/products?search=${encodeURIComponent(section.title)}`} 
              className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group"
            >
              See All <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar">
            {section.items.map((product) => renderProductCard(product))}
          </div>
        </section>
      ))}

    </div>
  );
}