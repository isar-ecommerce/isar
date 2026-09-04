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
  Sparkles, 
  Zap, 
  Check,
  ChevronDown,
  Building2,
  Compass
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

  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const insideFee = typeof feeInsideDhaka === 'number' ? feeInsideDhaka : 60;
  const outsideFee = typeof feeOutsideDhaka === 'number' ? feeOutsideDhaka : 150;
  const isDhakaCity = division.trim().toLowerCase() === 'dhaka' && district.trim().toLowerCase() === 'dhaka';
  const deliveryFee = isDhakaCity ? insideFee : outsideFee;

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

  const handleQuickZoneToggle = (inside: boolean) => {
    if (inside) {
      handleDivisionChange('Dhaka');
      handleDistrictChange('Dhaka');
    } else {
      if (isDhakaCity) {
        handleDivisionChange('Chittagong');
      }
    }
  };

  const handleExpressOrder = async (e: FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!fullName.trim() || !cleanPhone || !fullAddress.trim()) {
      toast.error('Please provide your name, phone number, and address');
      return;
    }

    const bdPhoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    if (!bdPhoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid 11-digit mobile number (e.g. 017XXXXXXXX)');
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

      sendOrderConfirmationSMS(cleanPhone, order.orderNumber, totalAmount);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      toast.success(`Order placed successfully! ID: ${order.orderNumber}`);
      onClose();

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
      console.error('Express order error:', error);
      toast.error('Failed to complete order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 my-auto relative max-h-[92vh] flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-navy text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-navy-light/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-linear-to-r from-primary to-blue-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-4 h-4 fill-brand-gold text-brand-gold" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                ১-ক্লিক দ্রুত অর্ডার <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              </h3>
              <p className="text-[11px] text-gray-300">ক্যাশ অন ডেলিভারিতে সরাসরি অর্ডার করুন</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Product Preview Card */}
          <div className="p-3.5 bg-linear-to-r from-gray-50 to-white rounded-2xl border border-gray-200/80 flex items-center gap-3.5 shadow-xs">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-gray-200 shrink-0 p-1 flex items-center justify-center shadow-xs">
              <img 
                src={product.images[0] || 'https://via.placeholder.com/100'} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-navy truncate">{product.name}</h4>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-black text-primary font-mono">
                  ৳{product.price.toLocaleString()}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[10px] text-gray-400 line-through font-mono">
                    ৳{product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Counter */}
            <div className="flex items-center border border-gray-200 rounded-xl bg-white shadow-xs shrink-0 p-0.5">
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="w-7 h-7 flex items-center justify-center text-navy hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-gray-100"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-black text-navy font-mono">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                className="w-7 h-7 flex items-center justify-center text-navy hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-gray-100"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleExpressOrder} className="space-y-3.5">
            
            {/* Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary" /> আপনার নাম *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="যেমন: Rahim Chowdhury"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/70 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-brand-green" /> মোবাইল নম্বর (১১ ডিজিট) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/70 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
              />
            </div>

            {/* Delivery Location */}
            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200/60">
                <span className="text-[11px] font-black text-navy uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-primary" /> ডেলিভারি লোকেশন নির্বাচন করুন
                </span>
                <span className="text-[10px] font-bold text-brand-green">৬৪ জেলা কভারেজ</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">বিভাগ (Division) *</label>
                  <div className="relative">
                    <select
                      value={division}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold text-navy focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                    >
                      {BANGLADESH_DIVISIONS.map((d) => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">জেলা (District) *</label>
                  <div className="relative">
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold text-navy focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                    >
                      {availableDistricts.map((dist) => (
                        <option key={dist.name} value={dist.name}>{dist.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-gray-600 block">থানা / উপজেলা (Thana) *</label>
                  <div className="relative">
                    <select
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      className="w-full appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold text-navy focus:outline-none focus:border-primary cursor-pointer shadow-xs"
                    >
                      {availableUpazilas.map((upa) => (
                        <option key={upa} value={upa}>{upa}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-purple-600" /> বাড়ি/রোড/এলাকার বিস্তারিত ঠিকানা *
              </label>
              <textarea
                required
                rows={2}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="যেমন: হাউজ #১২, রোড #৪, ব্লক #বি, শান্তিনগর"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50/70 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              />
            </div>

            {/* Delivery Rate Badges (কোলন ছাড়া স্পষ্ট ৳৬০ ও ৳১৫০) */}
            <div className="space-y-1.5 pt-0.5">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" /> ডেলিভারি চার্জ:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickZoneToggle(true)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isDhakaCity 
                      ? 'border-primary bg-primary/10 text-primary shadow-xs' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isDhakaCity && <Check className="w-3.5 h-3.5 text-primary" />}
                  ঢাকা সিটি (৳{insideFee})
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickZoneToggle(false)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isDhakaCity 
                      ? 'border-primary bg-primary/10 text-primary shadow-xs' 
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {!isDhakaCity && <Check className="w-3.5 h-3.5 text-primary" />}
                  ঢাকার বাইরে (৳{outsideFee})
                </button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="p-3.5 bg-navy/5 rounded-2xl border border-navy/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>পণ্যের মূল্য ({quantity} টি):</span>
                <span className="font-bold text-navy font-mono">৳{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>ডেলিভারি ফি ({isDhakaCity ? 'ঢাকার ভেতর' : 'ঢাকার বাইরে'}):</span>
                <span className="font-bold text-navy font-mono">৳{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-black text-navy pt-2 border-t border-gray-200">
                <span>সর্বমোট প্রদেয় টাকা:</span>
                <span className="text-primary font-mono font-black text-lg">৳{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* আসল সমাধান: সবুজ বাটন বদলে প্রোডাক্ট পেজের মতো Royal Blue / Navy Gradient এবং ইংরেজিতে "Order Now" */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-primary via-primary-dark to-navy hover:from-blue-700 hover:to-slate-900 text-white font-black py-3.5 sm:py-4 px-6 rounded-2xl text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processing Order...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-brand-gold text-brand-gold" /> Order Now — ৳{totalAmount.toLocaleString()}
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium text-center">
              <ShieldCheck className="w-4 h-4 text-brand-green shrink-0" />
              <span>১০০% ক্যাশ অন ডেলিভারি • পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</span>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}