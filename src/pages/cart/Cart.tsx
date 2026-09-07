import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft,
  Tag,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCartStore } from '../../store/cartStore';
import { validateCouponCode } from '../../services/couponService';

export default function Cart() {
  const navigate = useNavigate();

  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getDiscount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setIsValidatingCoupon(true);
      const result = await validateCouponCode(couponInput, subtotal);

      if (result.isValid && result.coupon) {
        applyCoupon({
          code: result.coupon.code,
          discountType: result.coupon.discountType,
          discountValue: result.coupon.discountValue,
          minOrderAmount: result.coupon.minOrderAmount,
          maxDiscount: result.coupon.maxDiscountAmount || undefined,
        });
        toast.success(result.message);
        setCouponInput('');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      toast.error('Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Coupon removed');
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }
    navigate('/checkout', {
      state: { from: 'Shopping Cart', path: '/cart' },
    });
  };

  if (items.length === 0) {
    return (
      <div className="bg-secondary min-h-[75vh] flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Shopping Cart | ISAR Marketplace</title>
        </Helmet>

        <div className="bg-white rounded-3xl shadow-modern p-8 md:p-12 text-center max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-navy mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-8 leading-relaxed">
            Looks like you have not added anything to your cart yet. Explore our authentic products!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-3.5 px-8 rounded-2xl text-xs sm:text-sm transition-all shadow-md w-full cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Start Shopping
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
          <h1 className="text-2xl md:text-3xl font-black text-navy">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Items
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            
            {items.map((item, index) => {
              const maxStock = Math.max(1, item.product.stock || 1);
              const isAtMin = item.quantity <= 1;
              const isAtMax = item.quantity >= maxStock;

              return (
                <div 
                  key={`${item.product.id}-${item.selectedVariantId || index}`}
                  className="bg-white rounded-3xl p-4 md:p-6 shadow-modern border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-modern-lg relative group"
                >
                  {/* Point 11: Prominent Cross (X) Delete Button on Top Right */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id, item.selectedVariantId)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove product from cart"
                    aria-label="Remove product"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Product Thumbnail */}
                  <Link to={`/products/${item.product.id}`} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 p-1 flex items-center justify-center">
                    <img
                      src={item.product.images[0] || 'https://via.placeholder.com/150'}
                      alt={item.product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </Link>

                  {/* Product Information */}
                  <div className="flex-1 min-w-0 pr-6 sm:pr-8">
                    <Link 
                      to={`/products/${item.product.id}`}
                      className="text-sm md:text-base font-black text-navy hover:text-primary transition-colors line-clamp-1 mb-1 block"
                    >
                      {item.product.name}
                    </Link>

                    <p className="text-xs text-gray-500 mb-2">
                      Unit Price: <span className="font-bold text-navy font-mono">{item.product.price.toLocaleString()} BDT</span>
                    </p>

                    {/* Point 5: Quantity Lock (Min 1, Max stock) */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                          disabled={isAtMin}
                          className="p-1.5 text-navy hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                          title={isAtMin ? "Minimum quantity is 1" : "Decrease quantity"}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-navy font-mono">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isAtMax) {
                              toast.error(`Maximum available stock is ${maxStock}`);
                            } else {
                              updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId);
                            }
                          }}
                          disabled={isAtMax}
                          className="p-1.5 text-navy hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                          title={isAtMax ? `Maximum stock is ${maxStock}` : "Increase quantity"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-[11px] text-gray-400 font-medium">
                        {isAtMax ? `Max stock (${maxStock})` : `In stock: ${maxStock}`}
                      </span>
                    </div>
                  </div>

                  {/* Item Total Price */}
                  <div className="text-right sm:self-center ml-auto">
                    <span className="text-base md:text-lg font-black text-primary font-mono">
                      {(item.product.price * item.quantity).toLocaleString()} BDT
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Continue Shopping
              </Link>
            </div>

          </div>

          {/* Right Side: Order Summary & Coupon */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-5 sticky top-24">
              <h2 className="text-lg font-black text-navy pb-3 border-b border-gray-100">Order Summary</h2>

              {/* Coupon Redemption Card */}
              <div className="space-y-2">
                {!appliedCoupon ? (
                  <form onSubmit={handleApplyCoupon} className="space-y-2">
                    <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Have a Promo Coupon?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="e.g. EID2026"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-mono font-bold text-navy uppercase focus:bg-white focus:outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        className="px-4 py-2 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-green shrink-0" />
                      <div>
                        <span className="text-xs font-black text-navy font-mono">{appliedCoupon.code}</span>
                        <span className="text-[10px] text-brand-green font-bold block">Coupon Applied</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                      title="Remove Coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-3 pt-3 border-t border-gray-100 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Selected Items:</span>
                  <span className="font-bold text-navy font-mono">{items.reduce((s, i) => s + i.quantity, 0)} Pcs</span>
                </div>

                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-navy font-mono">{subtotal.toLocaleString()} BDT</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-brand-green font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-{discount.toLocaleString()} BDT</span>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 border border-gray-100 leading-relaxed">
                  Delivery fee is calculated at checkout based on location & parcel weight.
                </div>

                <div className="flex justify-between text-base font-black text-navy pt-3 border-t border-gray-100">
                  <span>Estimated Total:</span>
                  <span className="text-primary font-mono text-lg font-black">{total.toLocaleString()} BDT</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 px-6 rounded-2xl text-sm transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}