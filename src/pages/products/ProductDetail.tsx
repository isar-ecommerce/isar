import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Star, 
  ShoppingBag, 
  Heart, 
  Truck, 
  ShieldCheck, 
  Check, 
  Minus, 
  Plus, 
  Loader2, 
  ArrowLeft, 
  Share2, 
  CreditCard, 
  Zap, 
  Tag, 
  RotateCcw 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getProductById } from '../../services/productService';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import type { Product } from '../../types/product';
import ExpressOrderModal from '../../components/product/ExpressOrderModal';
import ProductReviews from '../../components/product/ProductReviews';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description');
  
  const [isExpressModalOpen, setIsExpressModalOpen] = useState<boolean>(false);

  const addItemToCart = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  // স্ক্রোলিং বাগ ফিক্স: পেজ ওপেন হওয়ামাত্রই একদম ওপর থেকে লোড হবে
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      if (!id) return;

      try {
        const data = await getProductById(id);
        if (isMounted && data) {
          setProduct(data);
        }
      } catch (err) {
        console.error("Error loading product:", err);
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

  const isWishlisted = product ? isInWishlist(product.id) : false;

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
    addItemToCart(product, quantity);
    toast.success(`Added ${quantity} item(s) to Cart!`);
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    const added = toggleWishlist(product);
    if (added) {
      toast.success('Added to Wishlist!');
    } else {
      toast.success('Removed from Wishlist!');
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

  const categoryTag = ((product as { categoryName?: string }).categoryName || product.categoryId || 'Authentic Gear').toUpperCase();

  return (
    <div className="bg-secondary min-h-screen py-6 md:py-10">
      <Helmet>
        <title>{`${product.name} | ISAR`}</title>
        <meta name="description" content={product.shortDescription || product.name} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl pb-12">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          <span>/</span>
          <span className="text-navy font-semibold truncate max-w-50 md:max-w-none">{product.name}</span>
        </nav>

        {/* Main Product Showcase Card */}
        <div className="bg-white rounded-3xl shadow-modern-lg p-5 sm:p-8 md:p-10 border border-gray-100 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
            
            {/* Left Column: Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square max-h-115 rounded-3xl overflow-hidden bg-gray-50/50 border border-gray-100 shadow-inner flex items-center justify-center p-6 group">
                <img 
                  src={product.images[selectedImageIndex] || product.images[0] || 'https://via.placeholder.com/600'} 
                  alt={product.name} 
                  className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-md"
                />
                
                <button 
                  onClick={handleShare}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-md backdrop-blur-sm transition-all border border-gray-100 hover:scale-110 cursor-pointer"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
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

            {/* Right Column: Product Information & Order Actions */}
            <div className="flex flex-col space-y-5">
              
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20">
                  <Tag className="w-3.5 h-3.5" /> {categoryTag}
                </span>
                
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green bg-brand-green/10 px-3.5 py-1 rounded-full border border-brand-green/20">
                    <Check className="w-3.5 h-3.5" /> In Stock ({product.stock})
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3.5 py-1 rounded-full border border-red-200">
                    Out of Stock
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-navy leading-snug">
                {product.name}
              </h1>

              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 text-sm font-bold text-navy">{product.rating || 5}</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500 font-medium">{product.reviewCount || 1} Verified Customer Review(s)</span>
              </div>

              {/* Price Box in Clean BDT */}
              <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-baseline gap-3 flex-wrap shadow-inner">
                <span className="text-3xl sm:text-4xl font-black text-primary font-mono">
                  {product.price.toLocaleString()} BDT
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through font-semibold font-mono">
                      {product.originalPrice.toLocaleString()} BDT
                    </span>
                    <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {product.shortDescription && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {product.shortDescription}
                </p>
              )}

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">Quantity:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                    <button 
                      onClick={() => handleQuantityChange('decrease')}
                      disabled={quantity <= 1}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-navy font-mono">{quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange('increase')}
                      disabled={quantity >= product.stock}
                      className="p-2.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {/* High-Converting Order Now Button */}
                  <button
                    onClick={() => setIsExpressModalOpen(true)}
                    disabled={product.stock === 0}
                    className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-primary via-primary-dark to-navy hover:from-blue-700 hover:to-slate-900 text-white py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-brand-gold text-brand-gold" />
                    <span>Order Now</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                      className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-navy border-2 border-gray-200 hover:border-primary/50 py-3.5 px-6 rounded-2xl font-extrabold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 text-primary" />
                      Add to Cart
                    </button>

                    <button
                      onClick={handleToggleWishlist}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isWishlisted 
                          ? 'border-red-200 bg-red-50 text-red-500 shadow-xs' 
                          : 'border-gray-200 bg-white text-gray-600 hover:text-red-500 hover:bg-gray-50'
                      }`}
                      aria-label="Wishlist"
                    >
                      <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Trust Badges */}
              <div className="grid grid-cols-4 gap-2 pt-6 border-t border-gray-100 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold text-navy leading-tight">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-brand-green" />
                  <span className="text-[10px] font-bold text-navy leading-tight">100% Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <CreditCard className="w-5 h-5 text-brand-gold" />
                  <span className="text-[10px] font-bold text-navy leading-tight">Cash on Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <RotateCcw className="w-5 h-5 text-purple-600" />
                  <span className="text-[10px] font-bold text-navy leading-tight">7 Days Return</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-3xl shadow-modern border border-gray-100 overflow-hidden mb-10">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            <button
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

        {/* 2-Column Responsive Verified Reviews */}
        <ProductReviews 
          productId={product.id} 
          productName={product.name} 
        />

      </div>

      {product && (
        <ExpressOrderModal 
          product={product} 
          isOpen={isExpressModalOpen} 
          onClose={() => setIsExpressModalOpen(false)} 
        />
      )}

    </div>
  );
}