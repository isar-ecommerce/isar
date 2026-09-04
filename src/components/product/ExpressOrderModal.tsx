import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Truck, 
  ShieldCheck, 
  Loader2, 
  Phone, 
  User, 
  Plus, 
  Minus, 
  Zap, 
  CheckCircle2,
  ChevronDown,
  Building,
  Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { createOrder } from '../../services/orderService';
import { initiateBkashPayment } from '../../services/paymentService';
import { 
  sendOrderConfirmationSMS, 
  sendOrderConfirmationEmail, 
  sendAdminOrderAlert 
} from '../../services/notificationService';
import { 
  BANGLADESH_DIVISIONS, 
  getDistrictsByDivision, 
  getUpazilasByDistrict 
} from '../../data/bangladeshGeoData';
import type { Product } from '../../types/product';
import type { ShippingAddress } from '../../types/order';

interface ExpressOrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpressOrderModal({ product, isOpen, onClose }: ExpressOrderModalProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { feeInsideDhaka, feeOutsideDhaka } = useSettingsStore();

  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // পেমেন্ট মোড: 'partial_cod' (অগ্রিম ডেলিভারি চার্জ) অথবা 'full_online' (সম্পূর্ণ পেমেন্ট)
  const [paymentMode, setPaymentMode] = useState<'partial_cod' | 'full_online'>('partial_cod');
  
  // সিলেক্টেড গেটওয়ে: 'bkash' অথবা 'nagad'
  const [gateway, setGateway] = useState<'bkash' | 'nagad'>('bkash');

  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  // Steadfast রেট অটো-লক
  const isDhakaCity = division.trim().toLowerCase() === 'dhaka' && district.trim().toLowerCase() === 'dhaka';
  const deliveryFee = isDhakaCity 
    ? (typeof feeInsideDhaka === 'number' ? feeInsideDhaka : 60)
    : (typeof feeOutsideDhaka === 'number' ? feeOutsideDhaka : 150);

  const subtotal = product.price * quantity;
  const totalAmount = subtotal + deliveryFee;

  const payNowAmount = paymentMode === 'partial_cod' ? deliveryFee : totalAmount;
  const dueOnDelivery = paymentMode === 'partial_cod' ? subtotal : 0;

  const t = {
    en: {
      name: 'Full Name',
      namePlaceholder: 'Enter your full name',
      phone: 'Mobile Number',
      phonePlaceholder: '01XXXXXXXXX (11 digits)',
      division: 'Division',
      district: 'District',
      upazila: 'Thana / Upazila',
      address: 'Delivery Address',
      addressPlaceholder: 'House, Road, Area details',
      deliveryFeeText: isDhakaCity ? 'Delivery (Inside Dhaka):' : 'Delivery (Outside Dhaka):',
      paymentSectionTitle: 'Select Payment Option:',
      codTitle: 'Cash on Delivery (COD)',
      codSub: `Pay ৳${deliveryFee} delivery fee now to confirm order. Pay product price (৳${subtotal.toLocaleString()}) on delivery.`,
      fullTitle: 'Full Online Payment',
      fullSub: `Pay full amount (৳${totalAmount.toLocaleString()}) now. Zero cash due on delivery.`,
      gatewayTitle: 'Choose Payment Gateway:',
      itemPrice: 'Product Price',
      shippingFee: 'Delivery Fee',
      payNowLabel: `To Pay Now (${gateway === 'bkash' ? 'bKash' : 'Nagad'}):`,
      dueLabel: 'Cash on Delivery Due:',
      btnOrderNow: 'Order Now',
      btnPayBkash: 'Pay with bKash',
      btnPayNagad: 'Pay with Nagad',
      processing: 'Processing Order...',
      trustNotice: 'Secure Payment Gateway • Fast Home Delivery Across Bangladesh',
      errInfo: 'Please provide your name, phone number, and address.',
      errPhone: 'Please enter a valid 11-digit mobile number.',
      success: 'Order placed successfully! ID:'
    },
    bn: {
      name: 'আপনার নাম',
      namePlaceholder: 'পূর্ণ নাম লিখুন',
      phone: 'মোবাইল নম্বর',
      phonePlaceholder: '০১XXXXXXXXX (১১ ডিজিট)',
      division: 'বিভাগ',
      district: 'জেলা',
      upazila: 'থানা / উপজেলা',
      address: 'সম্পূর্ণ ঠিকানা',
      addressPlaceholder: 'বাসা নম্বর, রোড নম্বর বা এলাকা',
      deliveryFeeText: isDhakaCity ? 'ডেলিভারি চার্জ (ঢাকা সিটি):' : 'ডেলিভারি চার্জ (ঢাকার বাইরে):',
      paymentSectionTitle: 'পেমেন্ট অপশন নির্বাচন করুন:',
      codTitle: 'ক্যাশ অন ডেলিভারি (COD)',
      codSub: `অর্ডার কনফার্ম করতে শুধু ডেলিভারি ফি ৳${deliveryFee} দিন। পণ্যের মূল্য (৳${subtotal.toLocaleString()}) ডেলিভারির সময় ক্যাশ পরিশোধ করবেন।`,
      fullTitle: 'সম্পূর্ণ অনলাইন পেমেন্ট',
      fullSub: `সম্পূর্ণ মূল্য (৳${totalAmount.toLocaleString()}) একবারে পরিশোধ করুন। ডেলিভারির সময় কোনো টাকা দিতে হবে না।`,
      gatewayTitle: 'পেমেন্ট গেটওয়ে বেছে নিন:',
      itemPrice: 'পণ্যের মূল্য',
      shippingFee: 'ডেলিভারি ফি',
      payNowLabel: `এখন প্রদেয় (${gateway === 'bkash' ? 'বিকাশ' : 'নগদ'}):`,
      dueLabel: 'পণ্য হাতে পেয়ে প্রদেয় (ক্যাশ):',
      btnOrderNow: 'Order Now',
      btnPayBkash: 'Pay with bKash',
      btnPayNagad: 'Pay with Nagad',
      processing: 'অর্ডার প্রসেসিং হচ্ছে...',
      trustNotice: 'নিরাপদ অনলাইন পেমেন্ট • ১০০% আসল পণ্যের নিশ্চয়তা',
      errInfo: 'আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।',
      errPhone: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।',
      success: 'অর্ডার সম্পন্ন হয়েছে! আইডি:'
    }
  }[lang];

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

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const upazilas = getUpazilasByDistrict(division, newDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');
  };

  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 11);
    setPhone(numeric);
  };

  const handleOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone || !fullAddress.trim()) {
      toast.error(t.errInfo);
      return;
    }

    const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    if (!bdPhoneRegex.test(phone) || phone.length !== 11) {
      toast.error(t.errPhone);
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName: fullName.trim(),
      phone,
      division,
      district,
      upazila,
      fullAddress: fullAddress.trim(),
    };

    try {
      setIsSubmitting(true);

      const cartItems = [{ product, quantity }];

      // CreateOrderInput এর সাথে ১০০% সামঞ্জস্যপূর্ণ
      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: phone,
        shippingAddress,
        cartItems,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentMethod: paymentMode === 'partial_cod' ? 'cod' : gateway,
      });

      // গেটওয়ে হ্যান্ডলিং
      if (gateway === 'bkash') {
        toast.loading(t.processing);
        const bkashRes = await initiateBkashPayment(order.orderNumber, payNowAmount);
        
        if (bkashRes.success && bkashRes.bkashURL) {
          // ESLint react-hooks/immutability ফিক্স: window.location.assign ব্যবহার করা হয়েছে
          window.location.assign(bkashRes.bkashURL);
          return;
        }
      }

      toast.dismiss();
      sendOrderConfirmationSMS(phone, order.orderNumber, totalAmount);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      toast.success(`${t.success} ${order.orderNumber}`);
      onClose();

      navigate('/order-success', {
        state: {
          order: {
            ...order,
            totalAmount,
            paidAmount: payNowAmount,
            dueAmount: dueOnDelivery,
            paymentMethod: paymentMode === 'partial_cod' ? 'cod' : gateway,
            paymentStatus: 'pending',
          },
        },
      });
    } catch (error) {
      console.error('Order submission error:', error);
      toast.error(lang === 'bn' ? 'অর্ডার সম্পন্ন করা যায়নি।' : 'Failed to complete order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (paymentMode === 'partial_cod') {
      return t.btnOrderNow;
    }
    return gateway === 'bkash' ? t.btnPayBkash : t.btnPayNagad;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative my-auto">
        
        {/* Brand Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-black tracking-widest text-white">ISAR</span>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  lang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang('bn')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  lang === 'bn' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাং
              </button>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-2.5">
          
          {/* Product Mini Strip */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 p-0.5 flex items-center justify-center">
              <img 
                src={product.images[0] || 'https://via.placeholder.com/100'} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{product.name}</h4>
              <div className="text-xs font-black text-blue-600 font-mono">
                ৳{product.price.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shrink-0">
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors cursor-pointer rounded hover:bg-slate-100"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-5 text-center text-xs font-bold text-slate-900 font-mono">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors cursor-pointer rounded hover:bg-slate-100"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-2.5">
            
            {/* Name & Phone in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-600" /> {t.name} *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/15 transition-all shadow-xs"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" /> {t.phone} *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={t.phonePlaceholder}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/15 transition-all shadow-xs font-mono"
                />
              </div>
            </div>

            {/* 3 Cascading Location Dropdowns */}
            <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-3 gap-1.5">
              <div className="space-y-0.5">
                <label className="text-[9px] font-semibold text-slate-500">{t.division} *</label>
                <div className="relative">
                  <select
                    value={division}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full appearance-none pl-2 pr-5 py-1 border border-slate-200 rounded-md bg-white text-[11px] font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-semibold text-slate-500">{t.district} *</label>
                <div className="relative">
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full appearance-none pl-2 pr-5 py-1 border border-slate-200 rounded-md bg-white text-[11px] font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[9px] font-semibold text-slate-500">{t.upazila} *</label>
                <div className="relative">
                  <select
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full appearance-none pl-2 pr-5 py-1 border border-slate-200 rounded-md bg-white text-[11px] font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                  >
                    {availableUpazilas.map((upa) => (
                      <option key={upa} value={upa}>{upa}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-600" /> {t.address} *
              </label>
              <input
                type="text"
                required
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/15 transition-all shadow-xs"
              />
            </div>

            {/* Delivery Charge Auto Badge */}
            <div className="px-2.5 py-1.5 bg-blue-50/70 rounded-lg border border-blue-200/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">{t.deliveryFeeText}</span>
              </div>
              <span className="font-black text-blue-700 font-mono">
                ৳{deliveryFee}
              </span>
            </div>

            {/* Payment Mode Selection: COD vs Full Online */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-bold text-slate-700 block">
                {t.paymentSectionTitle}
              </span>
              
              {/* Option 1: Cash on Delivery with Advance Fee */}
              <button
                type="button"
                onClick={() => setPaymentMode('partial_cod')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  paymentMode === 'partial_cod'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Banknote className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      {t.codTitle}
                    </span>
                    <span className="text-[9px] font-extrabold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      জনপ্রিয়
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 block mt-0.5 leading-tight">
                    {t.codSub}
                  </span>
                </div>
                {paymentMode === 'partial_cod' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
              </button>

              {/* Option 2: Full Online Payment */}
              <button
                type="button"
                onClick={() => setPaymentMode('full_online')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  paymentMode === 'full_online'
                    ? 'border-purple-600 bg-purple-50/70 shadow-xs ring-1 ring-purple-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      {t.fullTitle}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 block mt-0.5 leading-tight">
                    {t.fullSub}
                  </span>
                </div>
                {paymentMode === 'full_online' && (
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                )}
              </button>
            </div>

            {/* Official bKash and Nagad Gateways with Real Logos */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-bold text-slate-700 block">
                {t.gatewayTitle}
              </span>
              <div className="grid grid-cols-2 gap-2">
                
                {/* Official bKash Gateway Button */}
                <button
                  type="button"
                  onClick={() => setGateway('bkash')}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    gateway === 'bkash'
                      ? 'border-[#E2136E] bg-pink-50/80 shadow-xs ring-1 ring-[#E2136E]/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-[#E2136E] p-1 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 32 32" fill="none">
                      <path d="M19.5 3L8 16.5L14.5 18L12 29L26 14.5L18.5 13.5L19.5 3Z" fill="white" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-black text-[#E2136E] block leading-tight">bKash</span>
                    <span className="text-[9px] text-slate-500 block truncate">বিকাশ অনলাইন</span>
                  </div>
                  {gateway === 'bkash' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E2136E] shrink-0" />
                  )}
                </button>

                {/* Official Nagad Gateway Button */}
                <button
                  type="button"
                  onClick={() => setGateway('nagad')}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                    gateway === 'nagad'
                      ? 'border-[#F7941D] bg-orange-50/80 shadow-xs ring-1 ring-[#F7941D]/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-[#F7941D] text-white font-black text-[11px] flex items-center justify-center shrink-0">
                    নগদ
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-xs font-black text-[#F7941D] block leading-tight">Nagad</span>
                    <span className="text-[9px] text-slate-500 block truncate">নগদ অনলাইন</span>
                  </div>
                  {gateway === 'nagad' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#F7941D] shrink-0" />
                  )}
                </button>

              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>{t.itemPrice} ({quantity}):</span>
                <span className="font-bold text-slate-900 font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.shippingFee}:</span>
                <span className="font-bold text-slate-900 font-mono">৳{deliveryFee.toLocaleString()}</span>
              </div>
              
              <div className="pt-1 border-t border-slate-200 space-y-0.5">
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>{t.payNowLabel}</span>
                  <span className="font-black font-mono">৳{payNowAmount.toLocaleString()}</span>
                </div>
                {paymentMode === 'partial_cod' && (
                  <div className="flex justify-between text-slate-500 font-medium text-[10px]">
                    <span>{t.dueLabel}</span>
                    <span className="font-bold font-mono">৳{dueOnDelivery.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clean CTA Button - Strictly NO Price numbers inside */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                gateway === 'bkash' && paymentMode === 'full_online'
                  ? 'bg-linear-to-r from-[#E2136E] to-[#990a48] hover:from-[#c20f5d] hover:to-[#770636] shadow-pink-500/20'
                  : gateway === 'nagad' && paymentMode === 'full_online'
                    ? 'bg-linear-to-r from-[#F7941D] to-[#d4780b] hover:from-[#e58310] hover:to-[#b86606] shadow-orange-500/20'
                    : 'bg-linear-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-black shadow-blue-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.processing}
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> 
                  <span>{getButtonText()}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{t.trustNotice}</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}