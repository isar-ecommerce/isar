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

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash'>('cod');

  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  // Steadfast কুরিয়ার অনুযায়ী স্বয়ংক্রিয় ডেলিভারি ফি অটো-লক (গ্রাহক পরিবর্তন করতে পারবে না)
  const isDhakaCity = division.trim().toLowerCase() === 'dhaka' && district.trim().toLowerCase() === 'dhaka';
  const deliveryFee = isDhakaCity 
    ? (typeof feeInsideDhaka === 'number' ? feeInsideDhaka : 60)
    : (typeof feeOutsideDhaka === 'number' ? feeOutsideDhaka : 150);

  const subtotal = product.price * quantity;
  const totalAmount = subtotal + deliveryFee;

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

  // ফোন নম্বরে শুধুমাত্র ১১ ডিজিট নেওয়ার ফিল্টার
  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 11);
    setPhone(numeric);
  };

  const handleOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone || !fullAddress.trim()) {
      toast.error('আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন');
      return;
    }

    const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    if (!bdPhoneRegex.test(phone) || phone.length !== 11) {
      toast.error('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)');
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

      // ১. মূল অর্ডার ডাটাবেসে তৈরি
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

      // ২. বিকাশ পেমেন্ট হ্যান্ডলিং
      if (paymentMethod === 'bkash') {
        toast.loading('বিকাশ সুরক্ষিত গেটওয়েতে সংযোগ হচ্ছে...');
        const bkashRes = await initiateBkashPayment(order.orderNumber, totalAmount);
        
        if (bkashRes.success && bkashRes.bkashURL) {
          window.location.href = bkashRes.bkashURL;
          return;
        } else {
          toast.error(bkashRes.message || 'বিকাশ গেটওয়ে সংযোগে ত্রুটি। COD হিসেবে অর্ডার সেভ করা হলো।');
        }
      }

      // ৩. নোটিফিকেশন প্রেরণ
      sendOrderConfirmationSMS(phone, order.orderNumber, totalAmount);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      toast.success(`অর্ডার সম্পন্ন হয়েছে! আইডি: ${order.orderNumber}`);
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
      toast.error('অর্ডার সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative max-h-[92vh] flex flex-col">
        
        {/* Minimal Clean Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs font-black tracking-wider uppercase text-slate-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> এক্সপ্রেস চেকআউট
          </span>
          
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">
          
          {/* Mini Product Card */}
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 p-1 flex items-center justify-center">
              <img 
                src={product.images[0] || 'https://via.placeholder.com/100'} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
              <div className="text-sm font-black text-blue-600 font-mono mt-0.5">
                ৳{product.price.toLocaleString()}
              </div>
            </div>

            <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-xs p-0.5 shrink-0">
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-xs font-black text-slate-900 font-mono">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                className="w-6 h-6 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <form onSubmit={handleOrderSubmit} className="space-y-3">
            
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600" /> আপনার নাম *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="পূর্ণ নাম লিখুন"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all shadow-xs"
              />
            </div>

            {/* Phone (১১ ডিজিটের কঠোর ভ্যালিডেশন) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" /> মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                required
                maxLength={11}
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01XXXXXXXXX (১১ ডিজিট)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all shadow-xs font-mono"
              />
            </div>

            {/* Cascading Location Selectors */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider block">
                ডেলিভারি এলাকা নির্বাচন
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-semibold text-slate-500">বিভাগ *</label>
                  <div className="relative">
                    <select
                      value={division}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      className="w-full appearance-none pl-2.5 pr-6 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                    >
                      {BANGLADESH_DIVISIONS.map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-semibold text-slate-500">জেলা *</label>
                  <div className="relative">
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full appearance-none pl-2.5 pr-6 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                    >
                      {availableDistricts.map((dist) => (
                        <option key={dist.name} value={dist.name}>{dist.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-2 space-y-0.5">
                  <label className="text-[10px] font-semibold text-slate-500">থানা / উপজেলা *</label>
                  <div className="relative">
                    <select
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      className="w-full appearance-none pl-2.5 pr-6 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 cursor-pointer shadow-xs"
                    >
                      {availableUpazilas.map((upa) => (
                        <option key={upa} value={upa}>{upa}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-600" /> সম্পূর্ণ ঠিকানা (বাসা/রোড/এলাকা) *
              </label>
              <textarea
                required
                rows={2}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="বাসা নম্বর, রোড নম্বর বা এলাকার নাম লিখুন"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none shadow-xs"
              />
            </div>

            {/* Steadfast অটো-লক ডেলিভারি চার্জ ব্যাজ (কোনো ম্যানুয়াল বাটনের ঝামেলা নেই) */}
            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800">
                  {isDhakaCity ? 'ঢাকা সিটি ডেলিভারি চার্জ:' : 'ঢাকার বাইরে ডেলিভারি চার্জ:'}
                </span>
              </div>
              <span className="font-black text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 font-mono shadow-xs">
                ৳{deliveryFee} (অটো-লক)
              </span>
            </div>

            {/* Payment Method Selector: COD vs bKash (অফিশিয়াল বিকাশ ব্র্যান্ডিং) */}
            <div className="space-y-1 pt-0.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                পেমেন্ট মেথড নির্বাচন করুন:
              </label>
              <div className="grid grid-cols-2 gap-2">
                
                {/* COD Option */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-600" /> COD
                    </span>
                    {paymentMethod === 'cod' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">ক্যাশ অন ডেলিভারি</span>
                </button>

                {/* bKash Option with Official Pink Branding & Symbol */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bkash')}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'bkash'
                      ? 'border-[#E2136E] bg-pink-50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {/* Official bKash Bird Emblem */}
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 32 32" fill="none">
                        <path d="M19.5 3L8 16.5L14.5 18L12 29L26 14.5L18.5 13.5L19.5 3Z" fill="#E2136E" />
                      </svg>
                      <span className="text-xs font-black text-[#E2136E]">bKash</span>
                    </div>
                    {paymentMethod === 'bkash' && <CheckCircle2 className="w-3.5 h-3.5 text-[#E2136E] shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">বিকাশ পেমেন্ট</span>
                </button>
              </div>
            </div>

            {/* Bill Summary - Clean Taka Symbol */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>পণ্যের মূল্য ({quantity} টি):</span>
                <span className="font-bold text-slate-900 font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি ফি ({isDhakaCity ? 'ঢাকা সিটি' : 'ঢাকার বাইরে'}):</span>
                <span className="font-bold text-slate-900 font-mono">৳{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>সর্বমোট প্রদেয়:</span>
                <span className="text-blue-600 font-mono font-black text-base">৳{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* CTA Button: Adapts dynamically based on Payment Method */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg cursor-pointer hover:scale-[1.01] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
                paymentMethod === 'bkash'
                  ? 'bg-linear-to-r from-[#E2136E] to-[#b30e56] hover:from-[#c20f5d] hover:to-[#8a0941] shadow-pink-500/20'
                  : 'bg-linear-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-black shadow-blue-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing Order...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-amber-400 text-amber-400" /> 
                  <span>
                    {paymentMethod === 'bkash' ? 'Pay with bKash' : 'Order Now'} — ৳{totalAmount.toLocaleString()}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 text-center pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>নিরাপদ ও দ্রুততম হোম ডেলিভারি সার্ভিস</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}