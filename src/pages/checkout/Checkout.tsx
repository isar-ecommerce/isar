import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShieldCheck, 
  MapPin, 
  CreditCard, 
  Loader2, 
  ArrowLeft, 
  Lock, 
  Phone, 
  User 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { createOrder } from '../../services/orderService';
import { executeBkashPayment } from '../../services/paymentService';
import { 
  sendOrderConfirmationSMS, 
  sendOrderConfirmationEmail, 
  sendAdminOrderAlert 
} from '../../services/notificationService';
import BkashAutomatedModal from '../../components/checkout/BkashAutomatedModal';
import type { ShippingAddress, PaymentMethod } from '../../types/order';

// বাংলাদেশ বিভাগসমূহ
const BD_DIVISIONS = [
  'Dhaka',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Barisal',
  'Sylhet',
  'Rangpur',
  'Mymensingh'
];

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, getSubtotal, getDiscount, getTotal, deliveryFee, appliedCoupon, clearCart } = useCartStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();

  // শিপিং ফরম স্টেট
  const [fullName, setFullName] = useState<string>(() => user?.displayName || '');
  const [phone, setPhone] = useState<string>(() => user?.phoneNumber || '');
  const [alternatePhone, setAlternatePhone] = useState<string>('');
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('');
  const [upazila, setUpazila] = useState<string>('');
  const [fullAddress, setFullAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // পেমেন্ট স্টেট
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBkashModalOpen, setIsBkashModalOpen] = useState<boolean>(false);

  // কার্ট খালি থাকলে চেকআউটে থাকতে দেবে না
  useEffect(() => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
    }
  }, [items, navigate]);

  // ফর্ম ভ্যালিডেশন
  const validateForm = () => {
    if (!fullName.trim() || !phone.trim() || !district.trim() || !upazila.trim() || !fullAddress.trim()) {
      toast.error('Please fill in all required address fields');
      return false;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      toast.error('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 01712345678)');
      return false;
    }

    return true;
  };

  const getShippingAddress = (): ShippingAddress => ({
    fullName: fullName.trim(),
    phone: phone.trim(),
    alternatePhone: alternatePhone.trim() || undefined,
    division,
    district: district.trim(),
    upazila: upazila.trim(),
    fullAddress: fullAddress.trim(),
    deliveryNotes: deliveryNotes.trim() || undefined,
  });

  // অর্ডার প্লেস হ্যান্ডলার
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // বিকাশ হলে অটোমেটিক বিকাশ পেমেন্ট মোডাল ওপেন হবে
    if (paymentMethod === 'bkash') {
      setIsBkashModalOpen(true);
      return;
    }

    // ক্যাশ অন ডেলিভারি (COD) ফ্লো
    try {
      setIsSubmitting(true);
      const shippingAddress = getShippingAddress();

      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: phone.trim(),
        shippingAddress,
        cartItems: items,
        subtotal,
        deliveryFee,
        discount,
        couponCode: appliedCoupon?.code,
        totalAmount: total,
        paymentMethod: 'cod',
      });

      // স্বয়ংক্রিয় SMS ও Email নোটিফিকেশন
      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(`Order placed successfully! Tracking ID: ${order.orderNumber}`);
      navigate('/orders');
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // বিকাশ পেমেন্ট সফল হলে এক্সিকিউট করা
  const handleBkashSuccess = async (trxId: string, bkashPhone: string) => {
    try {
      setIsSubmitting(true);
      const shippingAddress = getShippingAddress();

      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: phone.trim(),
        shippingAddress,
        cartItems: items,
        subtotal,
        deliveryFee,
        discount,
        couponCode: appliedCoupon?.code,
        totalAmount: total,
        paymentMethod: 'bkash',
      });

      // ফায়ারস্টোর পেমেন্ট রেকর্ডে ট্রানজেকশন আপডেট
      await executeBkashPayment(order.id, order.orderNumber, total, bkashPhone, trxId);

      // কাস্টমার ও অ্যাডমিন নোটিফিকেশন
      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(`Paid & Order Confirmed! TrxID: ${trxId}`);
      navigate('/orders');
    } catch (error) {
      console.error('Bkash post-payment order creation error:', error);
      toast.error('Payment verified, but failed to record order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>Checkout | ISAR Marketplace</title>
        <meta name="description" content="Complete your purchase with Cash on Delivery or bKash at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy mt-2">Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Shipping Address & Payment Method */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Delivery Address Card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Shipping & Delivery Address</h2>
                  <p className="text-xs text-gray-500">Please provide your valid Bangladeshi address for delivery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahim Chowdhury"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Mobile Number (11 Digits) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01712345678"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Alternate Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Alternative Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="01812345678"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Division Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Division *</label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {BD_DIVISIONS.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Dhaka or Gazipur"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Upazila / Thana */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Upazila / Thana *</label>
                  <input
                    type="text"
                    required
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    placeholder="e.g. Dhanmondi, Mirpur, or Savar"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Full Street Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Full Address (House, Road, Area) *</label>
                  <textarea
                    required
                    rows={3}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="e.g. House #12, Road #4, Block #B, Mirpur-10, Dhaka"
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Special Delivery Notes (Optional)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before delivery or leave with security"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Payment Method</h2>
                  <p className="text-xs text-gray-500">Select how you want to pay for your order</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-bold text-sm text-navy block">Cash on Delivery (COD)</span>
                      <span className="text-xs text-gray-500">Pay cash to delivery rider when product arrives at your doorstep.</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-brand-green/10 text-brand-green font-bold text-xs rounded-full hidden sm:block">
                    Recommended
                  </span>
                </label>

                {/* Automated bKash Gateway */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bkash' 
                      ? 'border-[#E2136E] bg-[#E2136E]/5 shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bkash"
                      checked={paymentMethod === 'bkash'}
                      onChange={() => setPaymentMethod('bkash')}
                      className="w-4 h-4 text-[#E2136E] focus:ring-[#E2136E]"
                    />
                    <div>
                      <span className="font-bold text-sm text-navy block">bKash Online Payment</span>
                      <span className="text-xs text-gray-500">Instant payment with bKash OTP & PIN gateway.</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-[#E2136E] text-white font-bold text-xs rounded-md">
                    bKash
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* Right Column: Order Items & Summary */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl p-6 shadow-modern border border-gray-100 space-y-6 sticky top-24">
              <h2 className="text-lg font-bold text-navy pb-4 border-b border-gray-100">Order Items ({items.length})</h2>

              <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <img
                      src={item.product.images[0] || 'https://via.placeholder.com/80'}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy truncate">{item.product.name}</p>
                      <p className="text-[11px] text-gray-500">Qty: {item.quantity} × ৳{item.product.price.toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-bold text-navy">৳{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 text-xs md:text-sm">
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

                <div className="flex justify-between text-base font-extrabold text-navy pt-3 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-primary text-lg">৳{total.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Placing Order...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Place Order (৳{total.toLocaleString()})
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <ShieldCheck className="w-4 h-4 text-brand-green" />
                <span>Encrypted & Safe Bangladeshi Checkout</span>
              </div>

            </div>

          </div>

        </form>

      </div>

      {/* Automated bKash Modal */}
      <BkashAutomatedModal
        amount={total}
        orderNumber="ISAR-CHECKOUT"
        isOpen={isBkashModalOpen}
        onClose={() => setIsBkashModalOpen(false)}
        onSuccess={handleBkashSuccess}
      />
    </div>
  );
}