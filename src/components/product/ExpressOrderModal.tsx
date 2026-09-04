import { useState, useMemo, type FormEvent } from 'react';
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
  Banknote,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { createOrder, calculateDynamicDeliveryFee } from '../../services/orderService';
import { 
  sendOrderConfirmationSMS, 
  sendOrderConfirmationEmail, 
  sendAdminOrderAlert 
} from '../../services/notificationService';
import BkashAutomatedModal from '../checkout/BkashAutomatedModal';
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

  const [lang, setLang] = useState<'en' | 'bn'>('bn');

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // পেমেন্ট মোড: 'partial_cod' (অগ্রিম ডেলিভারি চার্জ) অথবা 'full_online' (সম্পূর্ণ পেমেন্ট)
  const [paymentMode, setPaymentMode] = useState<'partial_cod' | 'full_online'>('partial_cod');
  
  // সিলেক্টেড গেটওয়ে: 'bkash' অথবা 'nagad'

  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBkashModalOpen, setIsBkashModalOpen] = useState<boolean>(false);

  // রেন্ডারের বাইরে একবার অর্ডার ট্র্যাকিং রেফারেন্স জেনারেট
  const [tempOrderNumber] = useState<string>(() => `ISAR-${Date.now().toString().slice(-6)}`);

  // মোট ওজনের হিসাব (কেজিতে)
  const totalWeight = useMemo(() => {
    const singleWeight = (product as { weightInKg?: number })?.weightInKg || 0.5;
    return Number((singleWeight * quantity).toFixed(2));
  }, [product, quantity]);

  // স্টেডফাস্টের অফিশিয়াল ফর্মুলা অনুযায়ী রিয়েল-টাইম ডেলিভারি ফি ক্যালকুলেশন
  const { deliveryFee, deliveryZone } = useMemo(() => {
    const calculation = calculateDynamicDeliveryFee(district, upazila, totalWeight);
    return {
      deliveryFee: calculation.fee,
      deliveryZone: calculation.zone
    };
  }, [district, upazila, totalWeight]);

  const subtotal = product.price * quantity;
  const totalAmount = subtotal + deliveryFee;

  // অগ্রিম কত দেবে ও ক্যাশ কত বাকি থাকবে
  const payNowAmount = paymentMode === 'partial_cod' ? deliveryFee : totalAmount;
  const dueOnDelivery = paymentMode === 'partial_cod' ? subtotal : 0;

  if (!isOpen || !product) return null;

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
      deliveryFeeText: 'Steadfast Delivery Fee:',
      paymentSectionTitle: 'Select Payment Option:',
      codTitle: 'Cash on Delivery (Advance Delivery Fee)',
      codSub: `Pay only ৳${deliveryFee} delivery fee via bKash now. Pay product price (৳${subtotal.toLocaleString()}) in cash on delivery.`,
      fullTitle: 'Full Online Payment',
      fullSub: `Pay total ৳${totalAmount.toLocaleString()} via bKash now. Zero cash due on delivery.`,
      gatewayTitle: 'Payment Gateway:',
      itemPrice: 'Product Price',
      shippingFee: 'Delivery Fee',
      weightText: 'Parcel Weight:',
      payNowLabel: `To Pay Now via bKash:`,
      dueLabel: 'Cash on Delivery Due:',
      btnOrderNow: `Pay ৳${payNowAmount} & Confirm Order`,
      processing: 'Processing...',
      trustNotice: '100% Authentic Product • Secure bKash Gateway',
      errInfo: 'Please provide your full name, phone number, and address.',
      errPhone: 'Please enter a valid 11-digit Bangladeshi mobile number.',
    },
    bn: {
      name: 'আপনার নাম',
      namePlaceholder: 'যেমন: মোঃ আরিফুল ইসলাম',
      phone: 'মোবাইল নম্বর (১১ ডিজিট)',
      phonePlaceholder: '01XXXXXXXXX',
      division: 'বিভাগ',
      district: 'জেলা',
      upazila: 'থানা / উপজেলা',
      address: 'সম্পূর্ণ ঠিকানা',
      addressPlaceholder: 'বাসা নম্বর, রোড নম্বর বা এলাকা',
      deliveryFeeText: 'স্টেডফাস্ট ডেলিভারি চার্জ:',
      paymentSectionTitle: 'পেমেন্ট অপশন বেছে নিন:',
      codTitle: 'ক্যাশ অন ডেলিভারি (অগ্রিম ডেলিভারি চার্জ)',
      codSub: `ফেক অর্ডার রোধে শুধু ডেলিভারি চার্জ ৳${deliveryFee} বিকাশে অগ্রিম দিন। পণ্যের দাম ৳${subtotal.toLocaleString()} ডেলিভারির সময় ক্যাশ দেবেন।`,
      fullTitle: 'সম্পূর্ণ অনলাইন পেমেন্ট',
      fullSub: `সম্পূর্ণ মূল্য ৳${totalAmount.toLocaleString()} বিকাশে পরিশোধ করুন। ডেলিভারির সময় ০ টাকা ক্যাশ।`,
      gatewayTitle: 'পেমেন্ট গেটওয়ে:',
      itemPrice: 'পণ্যের মূল্য',
      shippingFee: 'ডেলিভারি ফি',
      weightText: 'পার্সেল ওজন:',
      payNowLabel: `বিকাশে এখনই প্রদেয়:`,
      dueLabel: 'ডেলিভারির সময় ক্যাশ দেবেন:',
      btnOrderNow: `৳${payNowAmount} দিয়ে অর্ডার কনফার্ম করুন`,
      processing: 'প্রসেসিং হচ্ছে...',
      trustNotice: 'নিরাপদ বিকাশ গেটওয়ে • ১০০% আসল পণ্যের নিশ্চয়তা',
      errInfo: 'আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।',
      errPhone: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।',
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

  // ফর্ম সাবমিট: কোনো অর্ডার তৈরি না করে আগে বিকাশ পেমেন্ট পপ-আপ খোলা হবে
  const handleOrderSubmit = (e: FormEvent) => {
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

    // সরাসরি বিকাশ পেমেন্ট মডাল ওপেন
    setIsBkashModalOpen(true);
  };

  // বিকাশ পেমেন্ট সফল হওয়ার পর অর্ডার ফায়ারস্টোরে সেভ হবে
  const handleBkashSuccess = async (trxId: string) => {
    try {
      setIsSubmitting(true);

      const shippingAddress: ShippingAddress = {
        fullName: fullName.trim(),
        phone,
        division,
        district,
        upazila,
        fullAddress: fullAddress.trim(),
      };

      const cartItems = [{ product, quantity }];
      const isPartial = paymentMode === 'partial_cod';

      // ফায়ারস্টোরে অর্ডার তৈরি (সঠিক ব্যালেন্স সহ)
      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: phone,
        shippingAddress,
        deliveryZone,
        totalWeight,
        cartItems,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentMethod: 'bkash',
        paymentStatus: isPartial ? 'partial_paid' : 'paid',
        paidAmount: payNowAmount,
        dueAmount: dueOnDelivery,
        transactionId: trxId,
      });

      // নোটিফিকেশন পাঠানো
      sendOrderConfirmationSMS(phone, order.orderNumber, totalAmount);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      toast.success(
        isPartial 
          ? `৳${payNowAmount} অগ্রিম সফল! বাকি ৳${dueOnDelivery} ডেলিভারির সময় দেবেন।`
          : `৳${totalAmount} সম্পূর্ণ পরিশোধ সফল! অর্ডার কনফার্ম হয়েছে।`
      );

      setIsBkashModalOpen(false);
      onClose();

      navigate('/order-success', {
        state: {
          order: {
            ...order,
            totalAmount,
            paidAmount: payNowAmount,
            dueAmount: dueOnDelivery,
            paymentMethod: 'bkash',
            paymentStatus: isPartial ? 'partial_paid' : 'paid',
          },
        },
      });
    } catch (error) {
      console.error('Order creation post-payment error:', error);
      toast.error('পেমেন্ট সফল হলেও অর্ডার সেভ করতে সমস্যা হয়েছে। দয়া করে সাপোর্ট হেল্পলাইনে যোগাযোগ করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative my-auto">
          
          {/* Brand Header */}
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-black tracking-widest text-white">ISAR EXPRESS</span>

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
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 p-0.5 flex items-center justify-center">
                <img 
                  src={product.images[0] || 'https://via.placeholder.com/100'} 
                  alt={product.name} 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{product.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-black text-blue-600 font-mono">৳{product.price.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Scale className="w-2.5 h-2.5" /> {totalWeight} kg
                  </span>
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
              
              {/* Name & Phone */}
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
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-xs"
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
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-xs font-mono"
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
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 transition-all shadow-xs"
                />
              </div>

              {/* Dynamic Delivery Charge Auto Badge */}
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
                
                {/* Option 1: COD with Advance Delivery Fee */}
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
                      ? 'border-[#E2136E] bg-pink-50/70 shadow-xs ring-1 ring-[#E2136E]/30'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-[#E2136E] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-slate-900">
                      {t.fullTitle}
                    </span>
                    <span className="text-[10px] text-slate-600 block mt-0.5 leading-tight">
                      {t.fullSub}
                    </span>
                  </div>
                  {paymentMode === 'full_online' && (
                    <CheckCircle2 className="w-4 h-4 text-[#E2136E] shrink-0 mt-0.5" />
                  )}
                </button>
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
                  <div className="flex justify-between text-[#E2136E] font-black">
                    <span>{t.payNowLabel}</span>
                    <span className="font-mono text-xs">৳{payNowAmount.toLocaleString()}</span>
                  </div>
                  {paymentMode === 'partial_cod' && (
                    <div className="flex justify-between text-slate-600 font-bold text-[10px]">
                      <span>{t.dueLabel}</span>
                      <span className="font-mono text-slate-900">৳{dueOnDelivery.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md bg-[#E2136E] hover:bg-[#c2105e] cursor-pointer hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t.processing}
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white text-white" /> 
                    <span>{t.btnOrderNow}</span>
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

      {/* Automated bKash Modal Integration (Zero Bypass) */}
      <BkashAutomatedModal
        amount={payNowAmount}
        orderNumber={tempOrderNumber}
        isOpen={isBkashModalOpen}
        onClose={() => setIsBkashModalOpen(false)}
        onSuccess={handleBkashSuccess}
      />
    </>
  );
}