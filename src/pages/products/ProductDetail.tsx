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
  Box, 
  Play, 
  HelpCircle, 
  MessageSquare,
  Rocket,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

import { db } from '../../firebase/config';
import { getProductById, getProductBySlug, getProducts } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import type { Product } from '../../types/product';
import ProductReviews from '../../components/product/ProductReviews';

interface ProductQuestionItem {
  id: string;
  productId: string;
  question: string;
  answer?: string;
  userName: string;
  createdAt?: unknown;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'qa'>('description');

  // ১. এইচডি ইমেজ জুম স্টেট (#2)
  const [zoomStyle, setZoomStyle] = useState<{ display: string; backgroundPosition: string; backgroundSize: string }>({
    display: 'none',
    backgroundPosition: '0% 0%',
    backgroundSize: '220%',
  });

  // ২. রিস্টক নোটিফিকেশন মোডাল (#8)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);
  const [restockPhone, setRestockPhone] = useState<string>('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState<boolean>(false);

  // ৩. প্রোডাক্ট ভিডিও মোডাল (#3)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);

  // ৪. Frequently Bought Together বান্ডেল স্টেট (#7)
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);

  // ৫. প্রোডাক্ট প্রশ্নোত্তর (Q&A) স্টেট ও অ্যাডমিন উত্তর ইনপুট (#21)
  const [questionsList, setQuestionsList] = useState<ProductQuestionItem[]>([]);
  const [newQuestionText, setNewQuestionText] = useState<string>('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState<boolean>(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(null);

  // ৬. কামিং সুন লঞ্চিং কাউন্টডাউন স্টেট (#11)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isLaunched: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLaunched: true,
  });

  const { addItem: addItemToCart, clearCart } = useCartStore();
  const { freeShippingMinAmount } = useSettingsStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchProductAndRelated = async () => {
      if (!id) return;

      try {
        let data = await getProductBySlug(id);
        if (!data) {
          data = await getProductById(id);
        }

        if (isMounted && data) {
          setProduct(data);

          try {
            const allProducts = await getProducts({ categoryId: data.categoryId });
            const filtered = allProducts.filter(p => p.id !== data.id && p.stock > 0).slice(0, 2);
            setRelatedProducts(filtered);
            setSelectedBundleIds(filtered.map(p => p.id));
          } catch {
            setRelatedProducts([]);
          }

          try {
            const qSnap = await getDocs(query(collection(db, 'product_questions'), where('productId', '==', data.id)));
            const qList = qSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ProductQuestionItem[];
            setQuestionsList(qList);
          } catch {
            setQuestionsList([]);
          }
        }
      } catch (err) {
        console.error('Error loading product:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProductAndRelated();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // কামিং সুন কাউন্টডাউন টাইমার
  useEffect(() => {
    const launchDateStr = (product as { launchDate?: string })?.launchDate;
    if (!launchDateStr) return;

    const targetTime = new Date(launchDateStr).getTime();
    if (isNaN(targetTime)) return;

    const updateCountdown = () => {
      const difference = targetTime - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isLaunched: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isLaunched: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [product]);

  // রিয়েল ডিসপ্যাচ মেসেজ (#5)
  const dispatchMessage = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const cutoffHour = 14;

    if (currentHour < cutoffHour) {
      const hoursLeft = cutoffHour - currentHour - 1;
      const minsLeft = 60 - now.getMinutes();
      return `আজ দুপুর ২টার মধ্যে অর্ডার করলে আজকেই পার্সেল কুরিয়ারে যাবে! (বাকি ${hoursLeft}ঘণ্টা ${minsLeft}মি.)`;
    }
    return `আজকের সব পার্সেল কুরিয়ারে চলে গেছে। এখন অর্ডার করলে আগামীকাল সকাল ১০টায় কুরিয়ারে যাবে!`;
  }, []);

  // ফ্রি শিপিং মাইলস্টোন হিসাব (#10)
  const minFreeAmount = Number(freeShippingMinAmount) || 5000;
  const currentTotal = (product?.price || 0) * quantity;
  const freeShippingDifference = Math.max(0, minFreeAmount - currentTotal);
  const freeShippingProgress = Math.min(100, Math.round((currentTotal / minFreeAmount) * 100));

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

  const handleAddBundleToCart = () => {
    if (!product) return;
    addItemToCart(product, 1);
    relatedProducts
      .filter(p => selectedBundleIds.includes(p.id))
      .forEach(p => addItemToCart(p, 1));

    toast.success('Awesome! Complete bundle package added to Cart!');
  };

  const toggleBundleSelection = (pId: string) => {
    setSelectedBundleIds(prev => 
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const bundleTotal = useMemo(() => {
    if (!product) return 0;
    const base = product.price;
    const extra = relatedProducts
      .filter(p => selectedBundleIds.includes(p.id))
      .reduce((sum, p) => sum + p.price, 0);
    return base + extra;
  }, [product, relatedProducts, selectedBundleIds]);

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
      console.warn('Restock request error:', err);
      toast.error('Could not submit alert request.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // কাস্টমার প্রশ্ন সাবমিট
  const handleSubmitQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    try {
      setIsSubmittingQuestion(true);
      const newQ = {
        productId: product?.id || '',
        question: newQuestionText.trim(),
        userName: user?.displayName || 'Customer',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'product_questions'), newQ);
      toast.success('Your question has been submitted! Our team will answer shortly.');
      setQuestionsList(prev => [{ ...newQ, id: docRef.id }, ...prev]);
      setNewQuestionText('');
    } catch (err) {
      console.error('Question submit error:', err);
      toast.error('Failed to submit question.');
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // 💬 অ্যাডমিন সরাসরি প্রশ্নের উত্তর দেওয়ার হ্যান্ডলার (#21)
  const handleAdminReplySubmit = async (questionId: string) => {
    const replyText = replyInputs[questionId]?.trim();
    if (!replyText) {
      toast.error('Please write an answer before submitting');
      return;
    }

    try {
      setUpdatingQuestionId(questionId);
      const qRef = doc(db, 'product_questions', questionId);
      await updateDoc(qRef, {
        answer: replyText,
        answeredAt: serverTimestamp(),
      });

      setQuestionsList(prev => prev.map(q => q.id === questionId ? { ...q, answer: replyText } : q));
      setReplyInputs(prev => ({ ...prev, [questionId]: '' }));
      toast.success('Official reply published successfully!');
    } catch (err) {
      console.error('Admin reply error:', err);
      toast.error('Failed to publish answer.');
    } finally {
      setUpdatingQuestionId(null);
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
  const hasProductVideo = Boolean((product as { videoUrl?: string })?.videoUrl);
  const isComingSoonActive = Boolean((product as { isComingSoon?: boolean })?.isComingSoon) && !timeLeft.isLaunched;

  return (
    <div className="bg-secondary min-h-screen py-6 md:py-10">
      <Helmet>
        <title>{`${product.name} | ISAR`}</title>
        <meta name="description" content={product.shortDescription || product.name} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl pb-12 space-y-8">
        
        {/* Breadcrumb Trail (#37) */}
        <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-2 flex-wrap font-medium">
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
        <div className="bg-white rounded-3xl shadow-modern-lg p-5 sm:p-8 md:p-10 border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
            
            {/* Left Column: Image Gallery with HD Zoom Lens (#2) */}
            <div className="space-y-4">
              <div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative aspect-square max-h-115 rounded-3xl overflow-hidden bg-gray-50/50 border border-gray-100 shadow-inner flex items-center justify-center p-6 group cursor-crosshair"
              >
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 filter drop-shadow-md"
                />

                {/* HD Zoom Lens */}
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

                {/* Video Play Button (#3) */}
                {hasProductVideo && (
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(true)}
                    className="absolute bottom-4 left-4 px-3.5 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-black rounded-xl shadow-lg backdrop-blur-xs flex items-center gap-1.5 transition-all z-30 cursor-pointer hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-brand-gold" />
                    <span>Watch Video</span>
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={handleShare}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-md backdrop-blur-sm transition-all border border-gray-100 hover:scale-110 cursor-pointer z-30"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Thumbnails */}
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

            {/* Right Column */}
            <div className="flex flex-col space-y-5">
              
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Link
                  to={`/products?category=${encodeURIComponent((product as { categorySlug?: string }).categorySlug || product.categoryId || 'all')}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" /> {categoryTag}
                </Link>

                {isComingSoonActive ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-900 bg-amber-100 px-3.5 py-1 rounded-full border border-amber-300">
                    <Rocket className="w-3.5 h-3.5 text-amber-600" /> Coming Soon
                  </span>
                ) : !isOutOfStock ? (
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
                  <span>Verified Authentic • 100% Original Brand QC</span>
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

              {/* কামিং সুন কাউন্টডাউন */}
              {isComingSoonActive && (
                <div className="p-4 bg-linear-to-r from-amber-500/15 via-primary/10 to-brand-gold/15 rounded-2xl border border-amber-400/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Rocket className="w-4 h-4 text-amber-600" /> Launching In (লঞ্চ হতে বাকি):
                    </span>
                    <span className="text-[10px] bg-amber-500 text-white font-black px-2 py-0.5 rounded-md uppercase">
                      Official Launch
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center font-mono">
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-lg font-black text-navy block">{timeLeft.days}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Days</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-lg font-black text-navy block">{timeLeft.hours}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Hours</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-lg font-black text-navy block">{timeLeft.minutes}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Mins</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-lg font-black text-amber-600 block">{timeLeft.seconds}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Secs</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Dispatch Cutoff Badge (#5) */}
              {!isComingSoonActive && (
                <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-950 font-bold">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>{dispatchMessage}</span>
                </div>
              )}

              {/* Free Shipping Milestone (#10) */}
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
              {!isOutOfStock && !isComingSoonActive && product.stock >= 2 && (
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

              {/* Action Buttons */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange('decrease')}
                      disabled={quantity <= 1 || isOutOfStock || isComingSoonActive}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-navy font-mono">{quantity}</span>
                    <button 
                      type="button"
                      onClick={() => handleQuantityChange('increase')}
                      disabled={quantity >= product.stock || isOutOfStock || isComingSoonActive}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {isComingSoonActive ? (
                    <button
                      type="button"
                      onClick={() => setIsRestockModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-lg transition-all cursor-pointer hover:scale-[1.01]"
                    >
                      <Rocket className="w-5 h-5" />
                      <span>Pre-Book / Notify When Launched</span>
                    </button>
                  ) : !isOutOfStock ? (
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

              {/* 3 Genuine Bangladeshi Guarantee Boxes */}
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

        {/* Frequently Bought Together Cross-Sell (#7) */}
        {relatedProducts.length > 0 && !isOutOfStock && !isComingSoonActive && (
          <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-navy font-black text-base sm:text-lg">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              <span>Frequently Bought Together (একসাথে কিনুন ও সাশ্রয় করুন)</span>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pt-2">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                  <img src={product.images[0]} alt={product.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1" />
                  <div>
                    <p className="text-xs font-extrabold text-navy truncate max-w-40">{product.name}</p>
                    <p className="text-xs font-bold text-primary font-mono">{product.price.toLocaleString()} BDT</p>
                  </div>
                </div>

                {relatedProducts.map((rel) => {
                  const isChecked = selectedBundleIds.includes(rel.id);

                  return (
                    <div key={rel.id} className="flex items-center gap-2">
                      <span className="text-gray-400 font-black">+</span>
                      <label className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${isChecked ? 'bg-primary/5 border-primary shadow-2xs' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBundleSelection(rel.id)}
                          className="w-4 h-4 text-primary rounded cursor-pointer"
                        />
                        <img src={rel.images[0]} alt={rel.name} className="w-12 h-12 rounded-xl object-contain bg-white p-1" />
                        <div>
                          <p className="text-xs font-extrabold text-navy truncate max-w-36">{rel.name}</p>
                          <p className="text-xs font-bold text-primary font-mono">{rel.price.toLocaleString()} BDT</p>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 w-full lg:w-auto justify-between lg:justify-end">
                <div>
                  <span className="text-[11px] text-gray-500 font-bold block">Total Bundle Price:</span>
                  <span className="text-xl font-black text-primary font-mono">{bundleTotal.toLocaleString()} BDT</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBundleToCart}
                  className="px-6 py-3 bg-navy hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102"
                >
                  <ShoppingBag className="w-4 h-4" /> Add Bundle to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Section with Q&A and 💬 Admin Direct Reply Engine (#21) */}
        <div className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden">
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
            <button
              type="button"
              onClick={() => setActiveTab('qa')}
              className={`px-6 py-4 font-extrabold text-xs sm:text-sm transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'qa' 
                  ? 'border-primary text-primary bg-white' 
                  : 'border-transparent text-gray-500 hover:text-navy'
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Questions & Answers ({questionsList.length})
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'description' && (
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.description || '<p>No detailed description available for this product.</p>' }}
              />
            )}

            {activeTab === 'specifications' && (
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

            {/* Q&A সেকশন এবং অ্যাডমিন সরাসরি রিপ্লাই দেওয়ার বক্স */}
            {activeTab === 'qa' && (
              <div className="space-y-6 max-w-3xl">
                <form onSubmit={handleSubmitQuestion} className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                  <label className="text-xs font-black text-navy flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" /> Have a question about this product? Ask below:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="e.g. Is this bag waterproof? / Can it fit a 15.6 inch laptop?"
                      className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-xs text-navy focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingQuestion}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask Question'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  {questionsList.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No questions asked yet. Be the first to ask!</p>
                  ) : (
                    questionsList.map((q) => (
                      <div key={q.id} className="p-4 rounded-2xl border border-gray-100 space-y-3 bg-gray-50/60">
                        <div className="flex items-start gap-2 text-xs font-black text-navy">
                          <span className="text-primary font-bold">Q:</span>
                          <p>{q.question}</p>
                        </div>
                        
                        {q.answer ? (
                          <div className="flex items-start gap-2 text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-100">
                            <span className="text-brand-green font-bold">A:</span>
                            <div>
                              <p className="leading-relaxed font-medium">{q.answer}</p>
                              <span className="text-[10px] font-bold text-brand-green mt-1 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Official ISAR Response
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-600 font-semibold italic pl-4">
                            ⌛ Answer pending from ISAR store team...
                          </p>
                        )}

                        {/* 💬 অ্যাডমিন সরাসরি উত্তর দেওয়ার বক্স (শুধু অ্যাডমিন দেখতে পাবে) */}
                        {isAdmin && !q.answer && (
                          <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2">
                            <input
                              type="text"
                              value={replyInputs[q.id] || ''}
                              onChange={(e) => setReplyInputs({ ...replyInputs, [q.id]: e.target.value })}
                              placeholder="অ্যাডমিন হিসেবে এই প্রশ্নের উত্তর লিখুন..."
                              className="flex-1 px-3 py-1.5 border border-primary/40 rounded-xl bg-white text-xs text-navy focus:outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => handleAdminReplySubmit(q.id)}
                              disabled={updatingQuestionId === q.id}
                              className="px-4 py-1.5 bg-brand-green hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {updatingQuestionId === q.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              <span>Reply</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
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

      {/* Product Video Modal (#3) */}
      {isVideoModalOpen && (product as { videoUrl?: string })?.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl relative border border-gray-100">
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-navy rounded-full shadow-md hover:bg-gray-100 cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              <iframe
                src={(product as { videoUrl?: string }).videoUrl}
                title="Product Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}