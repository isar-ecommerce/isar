import { useState, type FormEvent, type ReactNode } from 'react';
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
  Building
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
import type { ShippingAddress, PaymentMethod } from '../../types/order';

interface ExpressOrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

// ভবিষ্যতে যেকোনো পেমেন্ট মেথড (Nagad, Rocket) সহজে যোগ করার টাইপ
interface PaymentMethodConfig {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  badgeColor: string;
  activeBorder: string;
  activeBg: string;
  icon: ReactNode;
}

export default function ExpressOrderModal({ product, isOpen, onClose }: ExpressOrderModalProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { feeInsideDhaka, feeOutsideDhaka } = useSettingsStore();

  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const t = {
    en: {
      name: 'Full Name',
      namePlaceholder: 'Full name',
      phone: 'Phone Number',
      phonePlaceholder: '01XXXXXXXXX',
      division: 'Division',
      district: 'District',
      upazila: 'Thana / Upazila',
      address: 'Delivery Address',
      addressPlaceholder: 'House, Road, Area details',
      deliveryFeeInside: 'Delivery Fee (Inside Dhaka):',
      deliveryFeeOutside: 'Delivery Fee (Outside Dhaka):',
      paymentTitle: 'Payment Method',
      itemPrice: 'Subtotal',
      deliveryCharge: 'Shipping',
      total: 'Total:',
      orderNow: 'Order Now',
      payWithBkash: 'Pay with bKash',
      processing: 'Processing...',
      trustNotice: '100% Cash on Delivery available • Fast Delivery',
      errInfo: 'Please provide your name, phone, and delivery address.',
      errPhone: 'Please enter a valid 11-digit mobile number.',
      success: 'Order placed successfully! ID:'
    },
    bn: {
      name: 'আপনার নাম',
      namePlaceholder: 'পূর্ণ নাম লিখুন',
      phone: 'মোবাইল নম্বর',
      phonePlaceholder: '০১XXXXXXXXX',
      division: 'বিভাগ',
      district: 'জেলা',
      upazila: 'থানা / উপজেলা',
      address: 'সম্পূর্ণ ঠিকানা',
      addressPlaceholder: 'বাসা নম্বর, রোড নম্বর বা এলাকা',
      deliveryFeeInside: 'ডেলিভারি ফি (ঢাকা সিটি):',
      deliveryFeeOutside: 'ডেলিভারি ফি (ঢাকার বাইরে):',
      paymentTitle: 'পেমেন্ট মেথড',
      itemPrice: 'পণ্যের মূল্য',
      deliveryCharge: 'ডেলিভারি ফি',
      total: 'সর্বমোট:',
      orderNow: 'Order Now',
      payWithBkash: 'Pay with bKash',
      processing: 'প্রসেসিং...',
      trustNotice: 'নিরাপদ ও দ্রুততম হোম ডেলিভারি সার্ভিস',
      errInfo: 'আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।',
      errPhone: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।',
      success: 'অর্ডার সম্পন্ন হয়েছে! আইডি:'
    }
  }[lang];

  // Steadfast রেট অটো-লক
  const isDhakaCity = division.trim().toLowerCase() === 'dhaka' && district.trim().toLowerCase() === 'dhaka';
  const deliveryFee = isDhakaCity 
    ? (typeof feeInsideDhaka === 'number' ? feeInsideDhaka : 60)
    : (typeof feeOutsideDhaka === 'number' ? feeOutsideDhaka : 150);

  const subtotal = product.price * quantity;
  const totalAmount = subtotal + deliveryFee;

  // ভবিষ্যতে নাগাদ বা অন্যান্য গেটওয়ে যোগ করার জন্য মডুলার কনফিগারেশন
  const paymentMethodsList: PaymentMethodConfig[] = [
    {
      id: 'cod',
      title: 'COD',
      subtitle: lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery',
      badgeColor: 'text-emerald-700',
      activeBorder: 'border-emerald-600',
      activeBg: 'bg-emerald-50/80',
      icon: (
        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px] shadow-xs">
          ৳
        </div>
      )
    },
    {
      id: 'bkash',
      title: 'bKash',
      subtitle: lang === 'bn' ? 'বিকাশ অনলাইন' : 'Online Payment',
      badgeColor: 'text-[#E2136E]',
      activeBorder: 'border-[#E2136E]',
      activeBg: 'bg-pink-50/80',
      icon: (
        <div className="w-6 h-6 rounded-lg bg-[#E2136E] p-1 flex items-center justify-center shadow-xs">
          {/* Official bKash Bird Emblem */}
          <svg className="w-full h-full" viewBox="0 0 32 32" fill="none">
            <path d="M19.5 3L8 16.5L14.5 18L12 29L26 14.5L18.5 13.5L19.5 3Z" fill="white" />
          </svg>
        </div>
      )
    }
    // ভবিষ্যতে Nagad যোগ করতে চাইলে শুধু নিচে ১টি অবজেক্ট আনকমেন্ট করলেই হবে:
    // { id: 'nagad', title: 'Nagad', subtitle: 'অনলাইন পেমেন্ট', ... }
  ];

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
        paymentMethod,
      });

      if (paymentMethod === 'bkash') {
        toast.loading(lang === 'bn' ? 'বিকাশ গেটওয়েতে সংযোগ হচ্ছে...' : 'Connecting to bKash Gateway...');
        const bkashRes = await initiateBkashPayment(order.orderNumber, totalAmount);
        
        if (bkashRes.success && bkashRes.bkashURL) {
          window.location.href = bkashRes.bkashURL;
          return;
        } else {
          toast.error(bkashRes.message || 'bKash credentials not configured yet. Placed as COD order.');
        }
      }

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
            paymentMethod,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative my-auto">
        
        {/* Ultra-Slim Brand Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-widest text-white">ISAR</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimalist Language Switcher */}
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

        {/* Compact Single-Page Body */}
        <div className="p-3.5 sm:p-4 space-y-2.5">
          
          {/* Micro Product Strip */}
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
            
            {/* Name & Phone in 2-Column Grid (Saves 60px vertical height!) */}
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

            {/* 3 Cascading Location Selectors in 1 Compact Card */}
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
                <Building className="w-3 h-3 text-indigo-600" /> {t.address} *
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

            {/* Delivery Fee: Clean & Auto-locked */}
            <div className="px-2.5 py-1.5 bg-blue-50/70 rounded-lg border border-blue-200/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  {isDhakaCity ? t.deliveryFeeInside : t.deliveryFeeOutside}
                </span>
              </div>
              <span className="font-black text-blue-700 font-mono">
                ৳{deliveryFee}
              </span>
            </div>

            {/* Extensible Payment Methods (bKash & COD with Official Logos) */}
            <div className="space-y-1 pt-0.5">
              <span className="text-[10px] font-bold text-slate-700 block">
                {t.paymentTitle}:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethodsList.map((pm) => {
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? `${pm.activeBorder} ${pm.activeBg} shadow-xs`
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      {pm.icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isSelected ? pm.badgeColor : 'text-slate-900'}`}>
                            {pm.title}
                          </span>
                          {isSelected && <CheckCircle2 className={`w-3 h-3 ${pm.badgeColor}`} />}
                        </div>
                        <span className="text-[9px] text-slate-500 block truncate leading-tight">
                          {pm.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ultra-Compact Bill Summary */}
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70 space-y-0.5 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>{t.itemPrice} ({quantity}):</span>
                <span className="font-bold text-slate-900 font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{t.deliveryCharge}:</span>
                <span className="font-bold text-slate-900 font-mono">৳{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                <span>{t.total}</span>
                <span className="text-blue-600 font-mono font-black text-sm">৳{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Clean CTA Button: No price text, strictly "Order Now" or "Pay with bKash" */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                paymentMethod === 'bkash'
                  ? 'bg-linear-to-r from-[#E2136E] to-[#b30e56] hover:from-[#c20f5d] hover:to-[#8a0941] shadow-pink-500/20'
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
                  <span>
                    {paymentMethod === 'bkash' ? t.payWithBkash : t.orderNow}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 text-center">
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{t.trustNotice}</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}