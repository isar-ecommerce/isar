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

// টেস্ট করার জন্য ফলব্যাক ক্যাটালগ
const MOCK_CATALOG: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones with Active Noise Cancelling',
    slug: 'wireless-headphones',
    shortDescription: 'High quality audio with crystal clear bass and active noise cancelling features.',
    description: '<p>Experience world-class sound quality with our Premium Wireless Headphones. Engineered for ultimate comfort, these headphones feature active noise cancelling, 30-hour battery life, and Bluetooth 5.3 connectivity.</p><br/><p>Whether you are traveling across Dhaka or working from home, enjoy uninterrupted audio performance with deep bass and clear voice calls.</p>',
    price: 4500,
    originalPrice: 6000,
    stock: 15,
    lowStockAlert: 2,
    sku: 'AUDIO-01',
    categoryId: 'audio',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: [
      { key: 'Brand', value: 'ISAR Audio' },
      { key: 'Model', value: 'ANC-Pro 2026' },
      { key: 'Connectivity', value: 'Bluetooth 5.3' },
      { key: 'Battery Life', value: 'Up to 30 Hours' },
      { key: 'Warranty', value: '1 Year Brand Warranty' },
    ],
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
    shortDescription: 'Track your health in real-time with heart rate and blood oxygen monitoring.',
    description: '<p>The Smart Watch Series 8 features an advanced always-on Retina display, durable crack-resistant front crystal, and comprehensive fitness tracking.</p><br/><p>Water resistant up to 50 meters, perfect for daily workouts and tracking sleep in Bangladesh weather.</p>',
    price: 3200,
    originalPrice: 4000,
    stock: 8,
    lowStockAlert: 2,
    sku: 'WATCH-01',
    categoryId: 'gadgets',
    images: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: [
      { key: 'Brand', value: 'ISAR Smart' },
      { key: 'Display', value: 'OLED Always-On' },
      { key: 'Sensors', value: 'Heart Rate, SpO2, Sleep Tracking' },
      { key: 'Water Resistance', value: '50M' },
    ],
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
    shortDescription: 'Waterproof 4K recording camera for extreme sports and outdoor adventures.',
    description: '<p>Capture your adventure moments with ultra-smooth 4K stabilization. Includes waterproof housing up to 30 meters depth and dual screens for crystal clear vlogging.</p>',
    price: 8500,
    originalPrice: 9500,
    stock: 5,
    lowStockAlert: 1,
    sku: 'CAM-01',
    categoryId: 'cameras',
    images: [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: [
      { key: 'Resolution', value: '4K Ultra HD @ 60fps' },
      { key: 'Waterproof Depth', value: '30 Meters' },
      { key: 'Battery', value: '1350mAh Dual Battery' },
    ],
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
    shortDescription: 'Water-resistant premium leather backpack for daily commute and carrying 15.6 inch laptops safely.',
    description: '<p>Designed for daily commute and carrying 15.6 inch laptops safely. Made with genuine water-resistant leather with multiple organizer pockets and comfortable shoulder straps.</p>',
    price: 2100,
    originalPrice: 2500,
    stock: 20,
    lowStockAlert: 5,
    sku: 'BAG-01',
    categoryId: 'fashion',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80'
    ],
    specifications: [
      { key: 'Material', value: 'Waterproof Synthetic Leather' },
      { key: 'Laptop Compartment', value: 'Up to 15.6 Inch' },
      { key: 'Capacity', value: '25 Liters' },
    ],
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI স্টেট
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications'>('description');
  
  // ১-ক্লিক এক্সপ্রেস অর্ডার মোডাল
  const [isExpressModalOpen, setIsExpressModalOpen] = useState<boolean>(false);

  const addItemToCart = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      if (!id) return;

      const mockItem = MOCK_CATALOG.find((p) => p.id === id || p.slug === id);

      try {
        const data = await getProductById(id);
        if (isMounted) {
          if (data) {
            setProduct(data);
          } else if (mockItem) {
            setProduct(mockItem);
          } else {
            setProduct(MOCK_CATALOG[0]);
          }
        }
      } catch {
        if (isMounted) {
          setProduct(mockItem || MOCK_CATALOG[0]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchProduct();
    });

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

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>{`${product.name} | ISAR Marketplace`}</title>
        <meta name="description" content={product.shortDescription || product.name} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          <span>/</span>
          <span className="text-navy font-semibold truncate max-w-50 md:max-w-none">{product.name}</span>
        </nav>

        {/* Main Product Showcase Card */}
        <div className="bg-white rounded-3xl shadow-modern-lg p-6 md:p-10 border border-gray-100 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
            
            {/* Left Column: Premium Framed Image Gallery */}
            <div className="space-y-4">
              
              {/* Main Product Frame */}
              <div className="relative aspect-square max-h-115 rounded-3xl overflow-hidden bg-gray-50/50 border border-gray-100 shadow-inner flex items-center justify-center p-6 group">
                <img 
                  src={product.images[selectedImageIndex] || product.images[0] || 'https://via.placeholder.com/600'} 
                  alt={product.name} 
                  className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-md"
                />
                
                {/* Top Share Button */}
                <button 
                  onClick={handleShare}
                  className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-md backdrop-blur-sm transition-all border border-gray-100 hover:scale-110 cursor-pointer"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Thumbnails Row */}
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

            {/* Right Column: Product Information, Pricing & High-Converting Actions */}
            <div className="flex flex-col space-y-6">
              
              {/* Category Tag & Stock Pill */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3.5 py-1 rounded-full border border-primary/20">
                  <Tag className="w-3.5 h-3.5" /> {product.categoryId?.toUpperCase() || 'GENERAL'}
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

              {/* Product Title */}
              <h1 className="text-2xl md:text-3xl font-black text-navy leading-snug">
                {product.name}
              </h1>

              {/* Rating & Reviews Bar */}
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 text-sm font-bold text-navy">{product.rating || 4.8}</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-500 font-medium">{product.reviewCount || 12} Verified Customer Reviews</span>
              </div>

              {/* Modern Pricing Box */}
              <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-baseline gap-3 flex-wrap shadow-inner">
                <span className="text-3xl sm:text-4xl font-black text-primary font-mono">
                  ৳{product.price.toLocaleString()}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through font-semibold">
                      ৳{product.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Short Summary Description */}
              {product.shortDescription && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {product.shortDescription}
                </p>
              )}

              {/* Quantity Selector & High-Converting Order Buttons */}
              <div className="space-y-4 pt-2">
                
                {/* Quantity Control */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-navy uppercase tracking-wider">পরিমাণ (Quantity):</span>
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

                {/* Primary High-Converting Buttons */}
                <div className="space-y-3 pt-2">
                  
                  {/* Luxury Royal Blue & Deep Navy Gradient "Order Now" Button */}
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

              {/* Luxury Trust Indicators */}
              <div className="grid grid-cols-4 gap-2 pt-6 border-t border-gray-100 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold text-navy leading-tight">Fast Delivery BD</span>
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

        {/* Tabs Section: Description & Specifications */}
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

        {/* Customer Verified Photo Reviews & 5-Star Ratings Section */}
        <ProductReviews 
          productId={product.id} 
          productName={product.name} 
        />

      </div>

      {/* Express 1-Click Order Modal */}
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