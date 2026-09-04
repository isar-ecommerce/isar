import { useState, useEffect, useMemo } from 'react';
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
  User,
  Scale,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { createOrder, calculateDynamicDeliveryFee } from '../../services/orderService';
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
import type { ShippingAddress } from '../../types/order';

// পেমেন্ট স্ট্র্যাটেজি টাইপ
type PaymentOption = 'cod_advance' | 'full_online';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    items, 
    getSubtotal, 
    getDiscount, 
    appliedCoupon, 
    clearCart 
  } = useCartStore();

  const subtotal = getSubtotal();
  const discount = getDiscount();

  // কাস্টমার ইনফো স্টেট
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [alternatePhone, setAlternatePhone] = useState<string>('');
  
  // ৩-টিয়ার বাংলাদেশ এড্রেস স্টেট
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // জেলা ও থানা ফিল্টার স্টেট
  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));

  // পেমেন্ট অপশন স্টেট (ডিফল্ট: অগ্রিম ডেলিভারি চার্জ + বাকি COD)
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('cod_advance');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBkashModalOpen, setIsBkashModalOpen] = useState<boolean>(false);

  // ESLint Purity Fix: রেন্ডারের বাইরে একবারের জন্য অর্ডারের রেফারেন্স নম্বর তৈরি
  const [clientOrderNumber] = useState<string>(() => `ISAR-${Date.now().toString().slice(-6)}`);

  // কার্ট আইটেমের ওপর ভিত্তি করে মোট ওজন স্বয়ংক্রিয়ভাবে হিসাব (কেজিতে)
  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => {
      const weightPerItem = (item.product as { weightInKg?: number })?.weightInKg || 0.5;
      return sum + weightPerItem * item.quantity;
    }, 0);
  }, [items]);

  // ESLint Fix (set-state-in-effect): রেন্ডারের সময় সরাসরি Derived State হিসেবে স্টেডফাস্ট চার্জ হিসাব
  const { deliveryFee, deliveryZone } = useMemo(() => {
    const calculation = calculateDynamicDeliveryFee(district, upazila, totalWeight);
    return {
      deliveryFee: calculation.fee,
      deliveryZone: calculation.zone
    };
  }, [district, upazila, totalWeight]);

  // সর্বমোট টাকার সঠিক হিসাব
  const total = useMemo(() => {
    return Math.max(0, subtotal + deliveryFee - discount);
  }, [subtotal, deliveryFee, discount]);

  // কার্ট খালি থাকলে চেকআউটে থাকতে দেবে না
  useEffect(() => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
    }
  }, [items, navigate]);

  // বিভাগ পরিবর্তন হ্যান্ডলার
  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    const districts = getDistrictsByDivision(newDivision);
    setAvailableDistricts(districts);

    const firstDistrict = districts[0]?.name || '';
    setDistrict(firstDistrict);

    const upazilas = getUpazilasByDistrict(newDivision, firstDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');
  };

  // জেলা পরিবর্তন হ্যান্ডলার
  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const upazilas = getUpazilasByDistrict(division, newDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');
  };

  // আর্থিক হিসাব: এখনই বিকাশে কত যাবে এবং ডেলিভারির সময় বাকি কত থাকবে
  const advanceAmountToPay = paymentOption === 'cod_advance' ? deliveryFee : total;
  const codDueAmount = paymentOption === 'cod_advance' ? Math.max(0, subtotal - discount) : 0;

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

  // অর্ডার বাটন ক্লিক হ্যান্ডলার
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ফেক অর্ডার ঠেকাতে বিকাশ পেমেন্ট মডাল ওপেন
    setIsBkashModalOpen(true);
  };

  // বিকাশ পেমেন্ট সফল হওয়ার পর অর্ডার তৈরি
  const handleBkashSuccess = async (trxId: string, bkashPhone: string) => {
    try {
      setIsSubmitting(true);
      const shippingAddress = getShippingAddress();
      const isPartial = paymentOption === 'cod_advance';

      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: phone.trim(),
        shippingAddress,
        deliveryZone,
        totalWeight: Number(totalWeight.toFixed(2)),
        cartItems: items,
        subtotal,
        deliveryFee,
        discount,
        couponCode: appliedCoupon?.code,
        totalAmount: total,
        paymentMethod: 'bkash',
        paymentStatus: isPartial ? 'partial_paid' : 'paid',
        paidAmount: advanceAmountToPay,
        dueAmount: codDueAmount,
        transactionId: trxId,
      });

      // পেমেন্ট লগ সংরক্ষণ
      try {
        await executeBkashPayment(order.id, order.orderNumber, advanceAmountToPay, bkashPhone, trxId);
      } catch (logErr) {
        console.warn('Payment logging notice:', logErr);
      }

      // নোটিফিকেশন ইঞ্জিন
      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(
        isPartial 
          ? `৳${advanceAmountToPay} অগ্রিম সফল! বাকি ৳${codDueAmount} ডেলিভারির সময় দেবেন।`
          : `৳${total} সম্পূর্ণ পরিশোধ সফল! অর্ডার কনফার্ম হয়েছে।`
      );

      navigate('/order-success', {
        state: {
          order: {
            ...order,
            paymentStatus: isPartial ? 'partial_paid' : 'paid',
            paidAmount: advanceAmountToPay,
            dueAmount: codDueAmount,
            totalAmount: total,
          },
        },
      });
    } catch (error) {
      console.error('Bkash post-payment error:', error);
      toast.error('পেমেন্ট ভেরিফাই হয়েছে, কিন্তু অর্ডার সেভ করতে সমস্যা হয়েছে। আমাদের হেল্পলাইনে যোগাযোগ করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ডেলিভারি জোনের সুন্দর বাংলা লেবেল
  const getZoneLabel = () => {
    if (deliveryZone === 'inside_dhaka') return 'ঢাকা সিটি';
    if (deliveryZone === 'dhaka_suburbs') return 'ঢাকা উপশহর (সাভার/গাজীপুর/কেরানীগঞ্জ)';
    return 'ঢাকার বাইরে সারা বাংলাদেশ';
  };

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>Checkout | ISAR Marketplace</title>
        <meta name="description" content="Secure checkout with Steadfast weight-based delivery and bKash." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy mt-2">Express Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Shipping Address & Payment Selection */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">ডেলিভারি ঠিকানা (Shipping Address)</h2>
                  <p className="text-xs text-gray-500">সঠিক ডেলিভারি চার্জের জন্য আপনার জেলা ও থানা সিলেক্ট করুন</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">আপনার পুরো নাম (Full Name) *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="যেমন: মোঃ সাকিব হাসান"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">মোবাইল নম্বর (১১ ডিজিট) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Alternative Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">বিকল্প মোবাইল নম্বর (ঐচ্ছিক)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Division */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">বিভাগ (Division) *</label>
                  <select
                    value={division}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">জেলা (District) *</label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                </div>

                {/* Thana / Upazila */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">থানা / উপজেলা (Upazila / Thana) *</label>
                  <select
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableUpazilas.map((upa) => (
                      <option key={upa} value={upa}>{upa}</option>
                    ))}
                  </select>
                </div>

                {/* Full Address */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">বিস্তারিত ঠিকানা (বাড়ি, রোড, এলাকা) *</label>
                  <textarea
                    required
                    rows={2}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="যেমন: বাসা #১২, রোড #৪, ব্লক #সি, ধানমন্ডি"
                    className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">ডেলিভারি নোট (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="যেমন: ডেলিভারির আগে ফোন দিবেন"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">পেমেন্ট অপশন বেছে নিন</h2>
                  <p className="text-xs text-gray-500">নিরাপদ বিকাশ পেমেন্ট গেটওয়ের মাধ্যমে পরিশোধ করুন</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Option 1: COD with Advance Delivery Charge */}
                <label 
                  className={`flex items-start justify-between p-4.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentOption === 'cod_advance' 
                      ? 'border-[#E2136E] bg-[#E2136E]/5 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentOption"
                      value="cod_advance"
                      checked={paymentOption === 'cod_advance'}
                      onChange={() => setPaymentOption('cod_advance')}
                      className="w-4 h-4 mt-0.5 text-[#E2136E] focus:ring-[#E2136E] cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs sm:text-sm text-navy block">
                          ক্যাশ অন ডেলিভারি (অগ্রিম ডেলিভারি চার্জ)
                        </span>
                        <span className="px-2 py-0.5 bg-brand-green/10 text-brand-green font-bold text-[10px] rounded-md">
                          জনপ্রিয়
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        অর্ডার নিশ্চিত করতে শুধু ডেলিভারি চার্জ <strong className="text-navy font-bold">৳{deliveryFee}</strong> বিকাশে এখনই দিন। পণ্যের বাকি দাম <strong className="text-[#E2136E] font-bold">৳{codDueAmount}</strong> ডেলিভারির সময় ক্যাশ পরিশোধ করবেন।
                      </p>
                    </div>
                  </div>
                  {paymentOption === 'cod_advance' && (
                    <CheckCircle2 className="w-5 h-5 text-[#E2136E] shrink-0" />
                  )}
                </label>

                {/* Option 2: Full Online Payment */}
                <label 
                  className={`flex items-start justify-between p-4.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentOption === 'full_online' 
                      ? 'border-primary bg-primary/5 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentOption"
                      value="full_online"
                      checked={paymentOption === 'full_online'}
                      onChange={() => setPaymentOption('full_online')}
                      className="w-4 h-4 mt-0.5 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <span className="font-black text-xs sm:text-sm text-navy block">
                        সম্পূর্ণ অনলাইন পেমেন্ট (Full Payment)
                      </span>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        সম্পূর্ণ মূল্য <strong className="text-navy font-bold">৳{total}</strong> বিকাশে পরিশোধ করুন। ডেলিভারির সময় কোনো টাকা দিতে হবে না (০ টাকা ক্যাশ)।
                      </p>
                    </div>
                  </div>
                  {paymentOption === 'full_online' && (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  )}
                </label>
              </div>

              {/* bKash Badge */}
              <div className="flex items-center justify-between p-3.5 bg-pink-50/60 border border-pink-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E2136E] animate-pulse" />
                  <span className="text-xs font-bold text-navy">স্বয়ংক্রিয় বিকাশ গেটওয়ে</span>
                </div>
                <span className="text-[11px] font-black text-[#E2136E] bg-white px-2.5 py-1 rounded-lg border border-pink-200">
                  bKash Payment Gateway
                </span>
              </div>

            </div>

          </div>

          {/* Right Column: Order Items & Pricing Breakdown */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-6 sticky top-24">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <h2 className="text-base font-black text-navy">অর্ডারের বিবরণ ({items.length} আইটেম)</h2>
                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-lg">
                  <Scale className="w-3.5 h-3.5 text-gray-400" />
                  <span>ওজন: {totalWeight.toFixed(1)} কেজি</span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <img
                      src={item.product.images?.[0] || 'https://via.placeholder.com/80'}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-navy truncate">{item.product.name}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Qty: {item.quantity} × ৳{item.product.price.toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-black text-navy font-mono">৳{(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>পণ্যের মোট দাম (Subtotal)</span>
                  <span className="font-bold text-navy font-mono">৳{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-gray-600 font-medium">
                  <div>
                    <span className="block">ডেলিভারি চার্জ</span>
                    <span className="text-[10px] text-gray-400">{getZoneLabel()}</span>
                  </div>
                  <span className="font-bold text-navy font-mono">৳{deliveryFee.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-brand-green font-bold">
                    <span>ডিসকাউন্ট</span>
                    <span className="font-mono">-৳{discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-gray-700 pt-2 border-t border-gray-100">
                  <span>সর্বমোট বিল (Total)</span>
                  <span className="font-mono font-bold text-navy">৳{total.toLocaleString()}</span>
                </div>

                {/* Live Advance vs COD Breakdown Box */}
                <div className="p-3.5 bg-linear-to-r from-pink-50 to-white rounded-2xl border border-pink-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-black text-[#E2136E]">
                    <span>এখনই বিকাশে পরিশোধ করবেন:</span>
                    <span className="font-mono text-sm">৳{advanceAmountToPay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-gray-600">
                    <span>ডেলিভারির সময় ক্যাশ দেবেন:</span>
                    <span className="font-mono font-black text-navy">৳{codDueAmount.toLocaleString()}</span>
                  </div>
                </div>

              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#E2136E] hover:bg-[#c2105e] text-white font-black py-4 px-6 rounded-2xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> প্রসেসিং হচ্ছে...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> এখনই ৳{advanceAmountToPay.toLocaleString()} দিয়ে অর্ডার নিশ্চিত করুন
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-brand-green" />
                <span>নিরাপদ ও এনক্রিপ্টেড বিকাশ পেমেন্ট গেটওয়ে</span>
              </div>

            </div>

          </div>

        </form>

      </div>

      {/* Automated bKash Modal with Clean State OrderNumber */}
      <BkashAutomatedModal
        amount={advanceAmountToPay}
        orderNumber={clientOrderNumber}
        isOpen={isBkashModalOpen}
        onClose={() => setIsBkashModalOpen(false)}
        onSuccess={handleBkashSuccess}
      />
    </div>
  );
}