import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Tag, 
  X, 
  ArrowLeft, 
  Truck,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';

export default function Cart() {
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState<string>('');

  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getDiscount,
    getTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    deliveryFee,
    setDeliveryFee,
  } = useCartStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();

  // কুপন সাবমিট হ্যান্ডলার
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const code = couponInput.trim().toUpperCase();

    // টেস্টের জন্য ডামি কুপন লজিক
    if (code === 'ISAR10') {
      const success = applyCoupon({
        code: 'ISAR10',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: 500,
      });
      if (success) {
        toast.success('Coupon ISAR10 applied! (10% Off)');
        setCouponInput('');
      }
    } else if (code === 'WELCOME100') {
      if (subtotal < 500) {
        toast.error('Minimum order of ৳500 required for WELCOME100');
        return;
      }
      const success = applyCoupon({
        code: 'WELCOME100',
        discountType: 'fixed',
        discountValue: 100,
        minOrderAmount: 500,
      });
      if (success) {
        toast.success('Coupon WELCOME100 applied! (৳100 Off)');
        setCouponInput('');
      }
    } else {
      toast.error('Invalid coupon code. Try "ISAR10" or "WELCOME100"');
    }
  };

  const handleDeliveryChange = (fee: number) => {
    setDeliveryFee(fee);
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }
    navigate('/checkout');
  };

  // কার্ট খালি থাকলে এই স্টেট দেখাবে
  if (items.length === 0) {
    return (
      <div className="bg-secondary min-h-[75vh] flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Shopping Cart | ISAR Marketplace</title>
        </Helmet>

        <div className="bg-white rounded-2xl shadow-modern p-8 md:p-12 text-center max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Looks like you haven't added anything to your cart yet. Explore our products and find something you love!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-md w-full"
          >
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>{`Shopping Cart (${items.length}) | ISAR Marketplace`}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            
            {items.map((item, index) => (
              <div 
                key={`${item.product.id}-${item.selectedVariantId || index}`}
                className="bg-white rounded-2xl p-4 md:p-6 shadow-modern border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-modern-lg"
              >
                {/* Product Thumbnail */}
                <Link to={`/products/${item.product.id}`} className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                  <img
                    src={item.product.images[0] || 'https://via.placeholder.com/150'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                {/* Product Information */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/products/${item.product.id}`}
                    className="text-sm md:text-base font-bold text-navy hover:text-primary transition-colors line-clamp-2 mb-1"
                  >
                    {item.product.name}
                  </Link>

                  <p className="text-xs text-gray-500 mb-2">
                    Unit Price: <span className="font-semibold text-navy">৳{item.product.price.toLocaleString()}</span>
                  </p>

                  <div className="flex items-center gap-3">
                    {/* Quantity Control */}
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                        className="p-1.5 text-navy hover:text-primary transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-navy">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1.5 text-navy hover:text-primary disabled:opacity-40 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id, item.selectedVariantId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Total Price */}
                <div className="text-right sm:self-center ml-auto">
                  <span className="text-base md:text-lg font-extrabold text-primary">
                    ৳{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Continue Shopping
              </Link>
            </div>

          </div>

          {/* Right Side: Order Summary & Coupon */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl p-6 shadow-modern border border-gray-100 space-y-6">
              <h2 className="text-lg font-bold text-navy pb-4 border-b border-gray-100">Order Summary</h2>

              {/* Delivery Area Selector (BD specific) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" /> Delivery Zone:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDeliveryChange(60)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                      deliveryFee === 60 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Inside Dhaka (৳60)
                  </button>
                  <button
                    onClick={() => handleDeliveryChange(120)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                      deliveryFee === 120 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Outside Dhaka (৳120)
                  </button>
                </div>
              </div>

              {/* Coupon Form */}
              <div className="pt-2">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-brand-green/10 rounded-xl border border-brand-green/20">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-brand-green" />
                      <div>
                        <span className="text-xs font-bold text-brand-green">{appliedCoupon.code}</span>
                        <p className="text-[10px] text-gray-500">Coupon applied successfully</p>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Coupon Code (e.g. ISAR10)"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:outline-none focus:border-primary uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-navy hover:bg-navy-light text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-navy">৳{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge</span>
                  <span className="font-bold text-navy">৳{deliveryFee.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-brand-green font-semibold">
                    <span>Discount</span>
                    <span>-৳{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-extrabold text-navy pt-3 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-primary">৳{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
                <ShieldCheck className="w-4 h-4 text-brand-green" />
                <span>100% Safe & Secure Checkout</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}