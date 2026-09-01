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
import { useSettingsStore } from '../../store/settingsStore';
import { createOrder } from '../../services/orderService';
import { executeBkashPayment } from '../../services/paymentService';
import { 
  sendOrderConfirmationSMS, 
  sendOrderConfirmationEmail, 
  sendAdminOrderAlert 
} from '../../services/notificationService';
import BkashAutomatedModal from '../../components/checkout/BkashAutomatedModal';
import { 
  BANGLADESH_DIVISIONS, 
  getDistrictsByDivision, 
  getUpazilasByDistrict 
} from '../../data/bangladeshGeoData';
import type { ShippingAddress, PaymentMethod } from '../../types/order';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    items, 
    getSubtotal, 
    getDiscount, 
    getTotal, 
    deliveryFee, 
    setDeliveryFee, 
    appliedCoupon, 
    clearCart 
  } = useCartStore();

  const { feeInsideDhaka, feeOutsideDhaka } = useSettingsStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();
  const total = getTotal();

  // কাস্টমার ইনফো স্টেট
  const [fullName, setFullName] = useState<string>(() => user?.displayName || '');
  const [phone, setPhone] = useState<string>(() => user?.phoneNumber || '');
  const [alternatePhone, setAlternatePhone] = useState<string>('');
  
  // ৩-টিয়ার বাংলাদেশ এড্রেস স্টেট
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // জেলা ও থানা তালিকা ফিল্টার স্টেট
  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));

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

  // বিভাগ পরিবর্তন হ্যান্ডলার (স্বয়ংক্রিয়ভাবে জেলা ও থানা ফিল্টার করবে)
  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    const districts = getDistrictsByDivision(newDivision);
    setAvailableDistricts(districts);

    const firstDistrict = districts[0]?.name || '';
    setDistrict(firstDistrict);

    const upazilas = getUpazilasByDistrict(newDivision, firstDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');

    // ডেলিভারি চার্জ অটোমেটিক পরিবর্তন
    if (newDivision === 'Dhaka' && firstDistrict === 'Dhaka') {
      setDeliveryFee(feeInsideDhaka || 60);
    } else {
      setDeliveryFee(feeOutsideDhaka || 150);
    }
  };

  // জেলা পরিবর্তন হ্যান্ডলার (স্বয়ংক্রিয়ভাবে থানা ফিল্টার করবে)
  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const upazilas = getUpazilasByDistrict(division, newDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');

    if (division === 'Dhaka' && newDistrict === 'Dhaka') {
      setDeliveryFee(feeInsideDhaka || 60);
    } else {
      setDeliveryFee(feeOutsideDhaka || 150);
    }
  };

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
    district,
    upazila,
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

      // স্বয়ংক্রিয় SMS ও Email নোটিফিকেশন ইঞ্জিন
      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(`Order placed successfully! Tracking ID: ${order.orderNumber}`);

      // সরাসরি মানি রিসিট ও ইনভয়েস পেজে রিডাইরেক্ট করা
      navigate('/order-success', {
        state: {
          order: {
            ...order,
            totalAmount: total,
          },
        },
      });
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

      await executeBkashPayment(order.id, order.orderNumber, total, bkashPhone, trxId);

      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(`Paid & Order Confirmed! TrxID: ${trxId}`);
      
      navigate('/order-success', {
        state: {
          order: {
            ...order,
            paymentStatus: 'paid',
            totalAmount: total,
          },
        },
      });
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
            
            {/* Delivery Address Card (3-Tier Cascading Selectors) */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Shipping & Delivery Address</h2>
                  <p className="text-xs text-gray-500">Select your Division, District, and Thana for accurate delivery</p>
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

                {/* Tier 1: Division Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">বিভাগ (Division) *</label>
                  <select
                    value={division}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tier 2: District Dropdown (Filtered based on Division) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">জেলা (District) *</label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tier 3: Upazila / Thana Dropdown (Filtered based on District) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">থানা / উপজেলা (Upazila / Thana) *</label>
                  <select
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableUpazilas.map((upa) => (
                      <option key={upa} value={upa}>{upa}</option>
                    ))}
                  </select>
                </div>

                {/* Full Street Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">বিস্তারিত ঠিকানা (বাড়ি, রোড, এলাকা) *</label>
                  <textarea
                    required
                    rows={2}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="যেমন: হাউজ #১২, রোড #৪, ব্লক #বি, শান্তিনগর"
                    className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">ডেলিভারি নোট (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="যেমন: ডেলিভারির আগে ফোন দিন"
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
                  <span>Delivery Charge ({division === 'Dhaka' && district === 'Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
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