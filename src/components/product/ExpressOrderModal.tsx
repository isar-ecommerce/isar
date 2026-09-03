import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Truck, 
  ShieldCheck, 
  Loader2, 
  Phone, 
  User, 
  MapPin, 
  Lock, 
  Plus, 
  Minus,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { createOrder } from '../../services/orderService';
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

  // কাস্টমার ইনফো স্টেট (ডিফল্ট ফ্রেশ খালি স্টেট)
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // ৩-টিয়ার বাংলাদেশ এড্রেস স্টেট
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));

  // ডেলিভারি চার্জ স্টেট
  const [deliveryFee, setDeliveryFee] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // লাইভ ডেলিভারি চার্জ সিঙ্ক
  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) {
        const inside = feeInsideDhaka || 60;
        const outside = feeOutsideDhaka || 150;
        if (division === 'Dhaka' && district === 'Dhaka') {
          setDeliveryFee(inside);
        } else {
          setDeliveryFee(outside);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [division, district, feeInsideDhaka, feeOutsideDhaka]);

  if (!isOpen || !product) return null;

  const subtotal = product.price * quantity;
  const totalAmount = subtotal + deliveryFee;

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

    if (newDivision === 'Dhaka' && firstDistrict === 'Dhaka') {
      setDeliveryFee(feeInsideDhaka || 60);
    } else {
      setDeliveryFee(feeOutsideDhaka || 150);
    }
  };

  // জেলা পরিবর্তন হ্যান্ডলার
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

  // ডেলিভারি জোন দ্রুত নির্বাচন পিল
  const handleQuickZoneSelect = (isInside: boolean) => {
    if (isInside) {
      handleDivisionChange('Dhaka');
      handleDistrictChange('Dhaka');
    } else {
      if (division === 'Dhaka' && district === 'Dhaka') {
        handleDivisionChange('Chittagong');
      }
    }
  };

  // ১-ক্লিক এক্সপ্রেস অর্ডার সাবমিশন
  const handleExpressOrder = async (e: FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!fullName.trim() || !cleanPhone || !fullAddress.trim()) {
      toast.error('অনুগ্রহ করে নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা লিখুন');
      return;
    }

    if (cleanPhone.length < 11) {
      toast.error('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      division,
      district,
      upazila,
      fullAddress: fullAddress.trim(),
    };

    try {
      setIsSubmitting(true);

      const cartItems = [{
        product,
        quantity,
      }];

      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: user?.email || 'customer@isar.com.bd',
        customerPhone: cleanPhone,
        shippingAddress,
        cartItems,
        subtotal,
        deliveryFee,
        discount: 0,
        totalAmount,
        paymentMethod: 'cod',
      });

      // স্বয়ংক্রিয় নোটিফিকেশন ইঞ্জিন
      sendOrderConfirmationSMS(cleanPhone, order.orderNumber, totalAmount);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      toast.success(`অর্ডার সফল হয়েছে! ট্র্যাকিং আইডি: ${order.orderNumber}`);
      onClose();

      // সরাসরি মানি রিসিট ও ক্যাশ মেমো পেজে রিডাইরেক্ট
      navigate('/order-success', {
        state: {
          order: {
            ...order,
            totalAmount,
            paymentMethod: 'cod',
            paymentStatus: 'pending',
          },
        },
      });
    } catch (error) {
      console.error('Express order submission error:', error);
      toast.error('অর্ডার সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDhakaCity = division === 'Dhaka' && district === 'Dhaka';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 my-auto relative max-h-[92vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="bg-navy text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-green flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-wide flex items-center gap-1.5">
                ১-ক্লিক দ্রুত অর্ডার <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              </h3>
              <p className="text-[11px] text-gray-300">ক্যাশ অন ডেলিভারিতে দ্রুত অর্ডার সম্পন্ন করুন</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Product Preview Card */}
          <div className="p-3 sm:p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 p-1 flex items-center justify-center shadow-xs">
              <img 
                src={product.images[0] || 'https://via.placeholder.com/100'} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-navy truncate">{product.name}</h4>
              <span className="text-sm font-black text-primary font-mono block mt-0.5">
                ৳{product.price.toLocaleString()}
              </span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center border border-gray-200 rounded-xl bg-white shadow-xs shrink-0">
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="p-2 text-navy hover:text-primary transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-black text-navy font-mono">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                className="p-2 text-navy hover:text-primary transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Express Form */}
          <form onSubmit={handleExpressOrder} className="space-y-4">
            
            {/* Full Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy block">আপনার নাম (Full Name) *</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahim Chowdhury"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy block">মোবাইল নম্বর (১১ ডিজিট) *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* 3-Tier Cascading Bangladesh Address Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Tier 1: Division */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">বিভাগ (Division) *</label>
                <select
                  value={division}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                >
                  {BANGLADESH_DIVISIONS.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Tier 2: District */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">জেলা (District) *</label>
                <select
                  value={district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                >
                  {availableDistricts.map((dist) => (
                    <option key={dist.name} value={dist.name}>{dist.name}</option>
                  ))}
                </select>
              </div>

              {/* Tier 3: Upazila / Thana */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-navy block">থানা / উপজেলা (Upazila / Thana) *</label>
                <select
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                >
                  {availableUpazilas.map((upa) => (
                    <option key={upa} value={upa}>{upa}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Street Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy block">বিস্তারিত ডেলিভারি ঠিকানা (বাড়ি, রোড, এলাকা) *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <textarea
                  required
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="যেমন: হাউজ #১২, রোড #৪, ব্লক #বি, শান্তিনগর"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            {/* Quick Delivery Zone Indicator Pills */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-primary" /> ডেলিভারি চার্জ নির্ধারণ:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickZoneSelect(true)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDhakaCity 
                      ? 'border-primary bg-primary/10 text-primary shadow-xs' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isDhakaCity && <Check className="w-3.5 h-3.5" />}
                  ঢাকা সিটি (৳{feeInsideDhaka || 60})
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickZoneSelect(false)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isDhakaCity 
                      ? 'border-primary bg-primary/10 text-primary shadow-xs' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {!isDhakaCity && <Check className="w-3.5 h-3.5" />}
                  ঢাকার বাইরে (৳{feeOutsideDhaka || 150})
                </button>
              </div>
            </div>

            {/* Total Order Summary Card */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>প্রোডাক্টের দাম ({quantity}টি):</span>
                <span className="font-bold text-navy font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-bold text-navy font-mono">৳{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-black text-navy pt-2 border-t border-gray-200">
                <span>সর্বমোট প্রদেয় টাকা:</span>
                <span className="text-primary font-mono font-black">৳{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* High-Converting Confirm Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl text-sm sm:text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> অর্ডার কনফার্ম হচ্ছে...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> অর্ডার কনফার্ম করুন (৳{totalAmount.toLocaleString()})
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-brand-green" />
              <span>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}