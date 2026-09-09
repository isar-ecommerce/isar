import { useState, useEffect, useMemo, type FormEvent, type MouseEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Star, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Check, 
  Minus, 
  Plus, 
  Loader2, 
  ArrowLeft, 
  Share2, 
  Zap, 
  Tag, 
  RotateCcw,
  Sparkles,
  Clock,
  Bell,
  X,
  Layers,
  Box
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '../../firebase/config';
import { getProductById, getProductBySlug } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { Product } from '../../types/product';
import ProductReviews from '../../components/product/ProductReviews';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description');

  // ১. এইচডি ইমেজ জুম স্টেট
  const [zoomStyle, setZoomStyle] = useState<{ display: string; backgroundPosition: string; backgroundSize: string }>({
    display: 'none',
    backgroundPosition: '0% 0%',
    backgroundSize: '220%',
  });

  // ২. রিস্টক নোটিফিকেশন মোডাল স্টেট
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [restockPhone, setRestockPhone] = useState<string>('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState<boolean>(false);

  const { addItem: addItemToCart, clearCart } = useCartStore();
  const { freeShippingMinAmount } = useSettingsStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      if (!id) return;

      try {
        let data = await getProductBySlug(id);
        if (!data) {
          data = await getProductById(id);
        }

        if (isMounted && data) {
          setProduct(data);
        }
      } catch (err) {
        console.error('Error loading product:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // রিয়েল সিস্টেম টাইম ভিত্তিক ডিসপ্যাচ মেসেজ
  const dispatchMessage = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const cutoffHour = 14; // দুপুর ২টা পর্যন্ত আজকের ডিসপ্যাচ

    if (currentHour < cutoffHour) {
      const hoursLeft = cutoffHour - currentHour - 1;
      const minsLeft = 60 - now.getMinutes();
      return `আজ দুপুর ২টার মধ্যে অর্ডার করলে আজকেই পার্সেল কুরিয়ারে যাবে! (বাকি ${hoursLeft}ঘণ্টা ${minsLeft}মি.)`;
    }
    return `আজকের সব পার্সেল কুরিয়ারে চলে গেছে। এখন অর্ডার করলে আগামীকাল সকাল ১০টায় কুরিয়ারে যাবে!`;
  }, []);

  // ফ্রি শিপিং প্রগ্রেস হিসাব
  const minFreeAmount = Number(freeShippingMinAmount) || 5000;
  const currentTotal = (product?.price || 0) * quantity;
  const freeShippingDifference = Math.max(0, minFreeAmount - currentTotal);
  const freeShippingProgress = Math.min(100, Math.round((currentTotal / minFreeAmount) * 100));

  // ইমেজ জুম হ্যান্ডলার
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '220%',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle(prev => ({ ...prev, display: 'none' }));
  };

  const handleQuantityChange = (type: 'increase' | 'decrease') => {
    if (!product) return;
    if (type === 'increase' && quantity < product.stock) {
      setQuantity(prev => prev + 1);
    } else if (type === 'decrease' && quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    addItemToCart(product, quantity);
    toast.success(`Added ${quantity} item(s) to Cart!`);
  };

  const handleOrderNow = () => {
    if (!product) return;
    if (product.stock <= 0 || product.status === 'out-of-stock') {
      toast.error('This item is currently sold out');
      return;
    }
    clearCart();
    addItemToCart(product, quantity);
    navigate('/checkout', {
      state: { from: product.name, path: `/products/${product.slug || product.id}` },
    });
  };

  // রিয়েল রিস্টক অ্যালার্ট ফায়ারস্টোরে সেভ করা
  const handleRestockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = restockPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      toast.error('Please enter a valid 11-digit mobile number');
      return;
    }

    try {
      setIsSubmittingRestock(true);
      await addDoc(collection(db, 'restock_requests'), {
        productId: product?.id,
        productName: product?.name,
        customerPhone: cleanPhone,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('ধন্যবাদ! প্রোডাক্টটি স্টকে আসামাত্র আপনাকে সরাসরি ফোনে জানানো হবে।');
      setRestockPhone('');
      setIsRestockModalOpen(false);
    } catch (err) {
      console.warn('Restock request note:', err);
      toast.error('Could not submit request. Please try again.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
        <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary p-4">
        <h2 className="text-2xl font-bold text-navy mb-2">Product Not Found</h2>
        <p className="text-gray-500 text-sm mb-6">The product you are looking for does not exist or has been removed.</p>
        <Link to="/products" className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    );
  }

  const rawCat = (product as { categoryName?: string }).categoryName || product.categoryId || '';
  const categoryTag = (rawCat.length > 18 || rawCat.includes('1') || rawCat.includes('2') || rawCat.includes('Z')) 
    ? 'AUTHENTIC ITEM' 
    : rawCat.toUpperCase();

  const hasReviews = (product.reviewCount || 0) > 0;
  const isOutOfStock = product.stock <= 0 || product.status === 'out-of-stock';
  const activeImage = product.images[selectedImageIndex] || product.images[0] || 'https://via.placeholder.com/600';

  return (
    <div className="bg-secondary min-h-screen py-6 md:py-10">
      <Helmet>
        <title>{`${product.name} | ISAR`}</title>
        <meta name="description" content={product.shortDescription || product.name} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl pb-12">
        
        {/* Breadcrumb Trail (#37) */}
        <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-6 flex-wrap font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          <span>/</span>
          <Link 
            to={`/products?category=${encodeURIComponent((product as { categorySlug?: string }).categorySlug || product.categoryId || 'all')}`}
            className="hover:text-primary transition-colors capitalize"
          >
            {categoryTag.toLowerCase()}
          </Link>
          <span>/</span>
          <span className="text-navy font-bold truncate max-w-50 md:max-w-none">{product.name}</span>
        </nav>

        {/* Main Product Card */}
        <div className="bg-white rounded-3xl shadow-modern-lg p-5 sm:p-8 md:p-10 border border-gray-100 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
            
            {/* Left Column: Image Gallery with HD Zoom Lens (#2) */}
            <div className="space-y-4">
              <div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative aspect-square max-h-115 rounded-3xl overflow-hidden bg-gray-50/50 border border-gray-100 shadow-inner flex items-center justify-center p-6 group cursor-crosshair"
              >
                {/* Regular Image */}
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 filter drop-shadow-md"
                />

                {/* HD Zoom Lens Box */}
                <div 
                  style={{
                    display: zoomStyle.display,
                    backgroundImage: `url(${activeImage})`,
                    backgroundPosition: zoomStyle.backgroundPosition,
                    backgroundSize: zoomStyle.backgroundSize,
                    backgroundRepeat: 'no-repeat',
                  }}
                  className="absolute inset-0 z-20 pointer-events-none rounded-3xl bg-white transition-opacity duration-150 shadow-2xl"
                />
                
                <button 
                  type="button"
                  onClick={handleShare}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-md backdrop-blur-sm transition-all border border-gray-100 hover:scale-110 cursor-pointer z-30"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Thumbnail Selector */}
              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-2xl overflow-hidden bg-white p-2 border-2 transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                        selectedImageIndex === idx 
                          ? 'border-primary shadow-md scale-105' 
                          : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Information & Interactive Purchasing */}
            <div className="flex flex-col space-y-5">
              
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Link
                  to={`/products?category=${encodeURIComponent((product as { categorySlug?: string }).categorySlug || product.categoryId || 'all')}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" /> {categoryTag}
                </Link>
                
                {!isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green bg-brand-green/10 px-3.5 py-1 rounded-full border border-brand-green/20">
                    <Check className="w-3.5 h-3.5" /> In Stock ({product.stock} Pcs)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1 rounded-full border border-red-200">
                    Stock Out
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-navy leading-snug">
                {product.name}
              </h1>

              {hasReviews ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="ml-1 text-sm font-bold text-navy">{product.rating}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-500 font-medium">
                    {product.reviewCount} Verified Customer Review{product.reviewCount > 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Verified Authentic • 100% Original Brand Warranty</span>
                </div>
              )}

              {/* Price Banner */}
              <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-baseline gap-3 flex-wrap shadow-inner">
                <span className="text-3xl sm:text-4xl font-black text-primary font-mono">
                  {(product.price * quantity).toLocaleString()} BDT
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through font-semibold font-mono">
                      {(product.originalPrice * quantity).toLocaleString()} BDT
                    </span>
                    <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Real-time Dispatch Cutoff Badge (#5) */}
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-950 font-bold">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>{dispatchMessage}</span>
              </div>

              {/* Free Shipping Milestone Progress Bar (#10) */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-brand-green" /> Free Delivery Milestone
                  </span>
                  <span>
                    {freeShippingDifference === 0 
                      ? '🎉 আপনি ফ্রি ডেলিভারি পাচ্ছেন!' 
                      : `আর ৳${freeShippingDifference.toLocaleString()} টাকার শপিংয়ে ডেলিভারি ফ্রি!`}
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${freeShippingProgress}%` }}
                    className="h-full bg-brand-green rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Tiered Quantity Bundle Selector (#1) */}
              {!isOutOfStock && product.stock >= 2 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Select Package & Save More:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(1)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        quantity === 1 
                          ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-black text-navy block">১টি কিনুন</span>
                      <span className="text-[11px] text-gray-500 font-mono font-bold">{product.price.toLocaleString()} BDT</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(product.stock, 2))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        quantity === 2 
                          ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 bg-brand-green text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        POPULAR
                      </span>
                      <span className="text-xs font-black text-navy block">২টি কিনুন (বান্ডেল)</span>
                      <span className="text-[11px] text-gray-500 font-mono font-bold">{(product.price * 2).toLocaleString()} BDT</span>
                    </button>

                    {product.stock >= 3 && (
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(product.stock, 3))}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer sm:col-span-1 col-span-2 ${
                          quantity === 3 
                            ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xs font-black text-navy block">৩টি কিনুন (ফ্যামিলি)</span>
                        <span className="text-[11px] text-gray-500 font-mono font-bold">{(product.price * 3).toLocaleString()} BDT</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {product.shortDescription && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed pt-1">
                  {product.shortDescription}
                </p>
              )}

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange('decrease')}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-navy font-mono">{quantity}</span>
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange('increase')}
                      disabled={quantity >= product.stock || isOutOfStock}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {!isOutOfStock ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOrderNow}
                        className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-primary via-primary-dark to-navy hover:from-blue-700 hover:to-slate-900 text-white py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
                      >
                        <Zap className="w-5 h-5 fill-brand-gold text-brand-gold" />
                        <span>Order Now (Cash on Delivery)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-navy border-2 border-gray-200 hover:border-primary/50 py-3.5 px-6 rounded-2xl font-extrabold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        Add to Cart
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRestockModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-md cursor-pointer hover:scale-101"
                    >
                      <Bell className="w-4 h-4" />
                      <span>স্টকে আসলে আমাকে জানান (Notify When In Stock)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3 Genuine Bangladeshi Trust & Guarantee Boxes (#20, #22, #23) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-gray-100">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-navy text-[11px] block leading-tight">Open Box Delivery</span>
                    <span className="text-[10px] text-gray-400 block">দেখে নেওয়ার ১০০% সুবিধা</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-navy text-[11px] block leading-tight">QC Tested Quality</span>
                    <span className="text-[10px] text-gray-400 block">১০০% ভেরিফাইড ব্র্যান্ড</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-navy text-[11px] block leading-tight">৭ দিনের সহজ রিটার্ন</span>
                    <span className="text-[10px] text-gray-400 block">ত্রুটি পেলে সাথে সাথে এক্সচেঞ্জ</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden mb-10">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`px-6 py-4 font-extrabold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer ${
                activeTab === 'description' 
                  ? 'border-primary text-primary bg-white' 
                  : 'border-transparent text-gray-500 hover:text-navy'
              }`}
            >
              Full Description
            </button>
            {product.specifications && product.specifications.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('specifications')}
                className={`px-6 py-4 font-extrabold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'specifications' 
                    ? 'border-primary text-primary bg-white' 
                    : 'border-transparent text-gray-500 hover:text-navy'
                }`}
              >
                Specifications
              </button>
            )}
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'description' ? (
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description || '<p>No detailed description available for this product.</p>' }}
              />
            ) : (
              <div className="max-w-2xl">
                <table className="w-full text-xs sm:text-sm text-left">
                  <tbody>
                    {product.specifications?.map((spec, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4 font-bold text-navy bg-gray-50/50 w-1/3 rounded-l-lg">{spec.key}</td>
                        <td className="py-3 px-4 text-gray-700 font-medium">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Real Customer Reviews Component (#24) */}
        <ProductReviews 
          productId={product.id} 
          productName={product.name} 
        />

      </div>

      {/* Restock Notification Modal (#8) */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 relative">
            <button
              type="button"
              onClick={() => setIsRestockModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-navy hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-5">
              <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2">
                <Bell className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black text-navy">স্টকে আসলে আমাকে জানান</h3>
              <p className="text-xs text-gray-500">
                "{product.name}" প্রোডাক্টটি পুনরায় স্টকে আসার সাথে সাথে আপনার ফোনে সরাসরি কনফার্মেশন পাঠানো হবে।
              </p>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">আপনার মোবাইল নম্বর (১১ ডিজিট) *</label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={restockPhone}
                  onChange={(e) => setRestockPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold font-mono text-navy focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingRestock}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingRestock ? <Loader2 className="w-4 h-4 animate-spin" /> : 'অ্যালার্ট নিশ্চিত করুন'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}