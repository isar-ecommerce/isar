import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
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
  Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { getProducts, getCategories } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import FlashSaleTimer from '../../components/home/FlashSaleTimer';
import type { Product, Category } from '../../types/product';

const INITIAL_CATEGORIES: Category[] = [
  { id: 'smartphones', name: 'Smartphones', slug: 'smartphones', status: 'active', order: 1 },
  { id: 'laptops', name: 'Laptops', slug: 'laptops', status: 'active', order: 2 },
  { id: 'watches', name: 'Watches', slug: 'watches', status: 'active', order: 3 },
  { id: 'audio', name: 'Audio', slug: 'audio', status: 'active', order: 4 },
  { id: 'cameras', name: 'Cameras', slug: 'cameras', status: 'active', order: 5 },
  { id: 'fashion', name: 'Fashion', slug: 'fashion', status: 'active', order: 6 },
];

const FALLBACK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones with Active Noise Cancelling',
    slug: 'wireless-headphones',
    shortDescription: 'High quality audio with crystal clear bass.',
    description: 'Enjoy high-fidelity sound with deep bass and active noise cancellation.',
    price: 4500,
    originalPrice: 6000,
    rating: 4.8,
    reviewCount: 124,
    stock: 15,
    lowStockAlert: 2,
    sku: 'AUDIO-01',
    categoryId: 'audio',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
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
    rating: 4.5,
    reviewCount: 89,
    stock: 8,
    lowStockAlert: 2,
    sku: 'WATCH-01',
    categoryId: 'gadgets',
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: false,
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
    rating: 4.9,
    reviewCount: 210,
    stock: 5,
    lowStockAlert: 1,
    sku: 'CAM-01',
    categoryId: 'cameras',
    images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: true,
    isTrending: true,
    isNewArrival: true,
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
    rating: 4.6,
    reviewCount: 56,
    stock: 20,
    lowStockAlert: 5,
    sku: 'BAG-01',
    categoryId: 'fashion',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80'],
    status: 'active',
    isFeatured: false,
    isTrending: false,
    isNewArrival: true,
    sellerId: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  
  const sliderRef = useRef<HTMLDivElement>(null);
  const addItemToCart = useCartStore((state) => state.addItem);

  // ফায়ারস্টোর থেকে লাইভ ডেটা লোড করা
  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async () => {
      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getProducts().catch(() => []),
          getCategories().catch(() => [])
        ]);

        if (isMounted) {
          // যদি ফায়ারস্টোরে অ্যাডমিনের আপলোড করা প্রোডাক্ট (যেমন: Emran Bags) থাকে, তবে তা লাইভ দেখাবে
          if (fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }

          // ক্যাটাগরি তালিকা মার্জ করা (যাতে Bag সহ সব কাস্টম ক্যাটাগরি থাকে)
          const merged = [
            ...INITIAL_CATEGORIES.filter(ic => !fetchedCategories.some(fc => fc.slug === ic.slug)),
            ...fetchedCategories
          ].sort((a, b) => (a.order || 0) - (b.order || 0));

          setCategories(merged);
        }
      } catch (error) {
        console.error("Error loading homepage live data:", error);
        if (isMounted) {
          setProducts(FALLBACK_PRODUCTS);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(() => {
      loadHomeData();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // হরাইজন্টাল স্লাইডার স্ক্রোলিং ফাংশন (ডানে/বামে স্লাইড করা)
  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleQuickAddToCart = (product: Product) => {
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  return (
    <div className="w-full bg-secondary min-h-screen pb-12">
      <Helmet>
        <title>ISAR | Bangladesh's Premium E-commerce Marketplace</title>
        <meta name="description" content="Shop smartphones, fashion, electronics and more at ISAR. Authentic products with fast delivery in Bangladesh." />
      </Helmet>

      {/* Hero Banner Section */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-6 md:py-10">
          <div className="relative bg-navy rounded-2xl overflow-hidden shadow-modern-lg">
            <div className="absolute inset-0 bg-linear-to-r from-navy via-navy to-primary/80 z-0"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-8 md:p-12 lg:p-16">
              <div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
                <span className="inline-block py-1 px-3 rounded-full bg-primary/20 text-primary-light text-sm font-semibold border border-primary/30">
                  New Arrival Collection
                </span>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                  Discover Premium <br/>
                  <span className="text-brand-gold">Quality Products</span>
                </h1>
                <p className="text-gray-300 text-sm md:text-base max-w-md mx-auto md:mx-0">
                  Shop the latest electronics, fashion, and lifestyle products with exclusive discounts and fast delivery across Bangladesh.
                </p>
                <div className="pt-2">
                  <Link 
                    to="/products" 
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-8 py-3.5 rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(0,86,179,0.4)] hover:shadow-[0_0_25px_rgba(0,86,179,0.6)]"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Shop Now
                  </Link>
                </div>
              </div>
              <div className="hidden md:block w-full md:w-1/2 relative mt-8 md:mt-0">
                <div className="w-full max-w-md mx-auto aspect-square bg-linear-to-tr from-primary/20 to-brand-gold/20 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <ShoppingBag className="w-32 h-32 text-white/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy">Fast Delivery</h4>
                <p className="text-xs text-gray-500">Across Bangladesh</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy">Authentic Brand</h4>
                <p className="text-xs text-gray-500">100% Genuine</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy">Secure Payment</h4>
                <p className="text-xs text-gray-500">bKash, Nagad, Card</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy">24/7 Support</h4>
                <p className="text-xs text-gray-500">Dedicated Help</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sale Countdown Timer Banner */}
      <section className="container mx-auto px-4 pt-4">
        <FlashSaleTimer targetHours={24} />
      </section>

      {/* Top Categories Section (Auto-Icon Engine Enabled) */}
      <section className="pt-6 pb-6 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-navy">Top Categories</h2>
          <Link to="/categories" className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1 group">
            See All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 sm:gap-4">
          {categories.slice(0, 7).map((category) => {
            // নাম অনুযায়ী অটোমেটিক আইকন ও ব্যাকগ্রাউন্ড কালার নির্ধারণ
            const { icon: Icon, color } = getCategoryIconConfig(category.name || category.slug);
            
            return (
              <Link 
                key={category.id} 
                to={`/products?category=${category.id}`}
                className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between text-center gap-2 shadow-modern hover:shadow-modern-lg transition-all border border-transparent hover:border-primary/10 group min-h-28 sm:min-h-32"
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-navy text-center line-clamp-1 wrap-break-word">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Horizontal Sliding Products Section */}
      <section className="py-8 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-navy">Trending Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">Explore our most popular and newly added products</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollSlider('left')}
              className="p-2 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollSlider('right')}
              className="p-2 rounded-xl bg-white hover:bg-primary hover:text-white border border-gray-200 text-navy transition-all shadow-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <Link to="/products" className="text-xs md:text-sm font-bold text-primary hover:text-primary-dark flex items-center gap-1 group ml-2">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading live products...</span>
          </div>
        ) : (
          <div 
            ref={sliderRef}
            className="flex gap-4 md:gap-6 overflow-x-auto pb-4 pt-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product) => (
              <div 
                key={product.id} 
                className="w-60 sm:w-64 md:w-72 bg-white rounded-2xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col shrink-0"
              >
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
                    <div className="flex items-center gap-1 mb-1.5 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs font-bold text-navy">{product.rating}</span>
                      <span className="text-[10px] text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                  ) : null}

                  <Link to={`/products/${product.id}`} className="hover:text-primary transition-colors line-clamp-2 text-xs md:text-sm font-semibold text-navy mb-2 grow">
                    {product.name}
                  </Link>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-base md:text-lg font-extrabold text-primary">৳{product.price.toLocaleString()}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[11px] text-gray-400 line-through ml-1.5">৳{product.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleQuickAddToCart(product)}
                      className="bg-primary/10 hover:bg-primary text-primary hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
                      title="Add to Cart"
                    >
                      <ShoppingBag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}