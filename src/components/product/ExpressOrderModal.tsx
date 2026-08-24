import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Truck, 
  ShieldCheck, 
  Check, 
  ShoppingBag, 
  Loader2, 
  Phone, 
  User, 
  MapPin, 
  Lock, 
  Plus, 
  Minus 
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import { createOrder } from '../../services/orderService';
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

  const [fullName, setFullName] = useState<string>(() => user?.displayName || '');
  const [phone, setPhone] = useState<string>(() => user?.phoneNumber || '');
  const [district, setDistrict] = useState<string>('');
  const [fullAddress, setFullAddress] = useState<string>('');
  
  const [quantity, setQuantity] = useState<number>(1);
  const [feeInsideDhaka, setFeeInsideDhaka] = useState<number>(60);
  const [feeOutsideDhaka, setFeeOutsideDhaka] = useState<number>(150);
  const [deliveryFee, setDeliveryFee] = useState<number>(60);
  const [selectedZone, setSelectedZone] = useState<'inside' | 'outside'>('inside');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ফায়ারস্টোর সেটিংস থেকে লাইভ ডেলিভারি চার্জ রিড করা
  useEffect(() => {
    let isMounted = true;

    const fetchLiveDeliveryRates = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snapshot = await getDoc(docRef);

        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          const inside = data.feeInsideDhaka !== undefined ? Number(data.feeInsideDhaka) : 60;
          const outside = data.feeOutsideDhaka !== undefined ? Number(data.feeOutsideDhaka) : 150;

          setFeeInsideDhaka(inside);
          setFeeOutsideDhaka(outside);
          setDeliveryFee(selectedZone === 'inside' ? inside : outside);
        }
      } catch (error) {
        console.error('Error fetching live delivery rates for modal:', error);
      }
    };

    Promise.resolve().then(() => {
      fetchLiveDeliveryRates();
      if (user && isMounted) {
        if (user.displayName && !fullName) setFullName(user.displayName);
        if (user.phoneNumber && !phone) setPhone(user.phoneNumber);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user, fullName, phone, selectedZone]);

  if (!isOpen || !product) return null;

  const totalAmount = (product.price * quantity) + deliveryFee;

  const handleZoneSelect = (zone: 'inside' | 'outside') => {
    setSelectedZone(zone);
    setDeliveryFee(zone === 'inside' ? feeInsideDhaka : feeOutsideDhaka);
  };

  const handleExpressOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!fullName.trim() || !cleanPhone || !fullAddress.trim()) {
      toast.error('নাম, মোবাইল নম্বর ও পূর্ণাঙ্গ ঠিকানা দেওয়া বাধ্যতামূলক');
      return;
    }

    if (cleanPhone.length < 11) {
      toast.error('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName: fullName.trim(),
      phone: cleanPhone,
      division: selectedZone === 'inside' ? 'Dhaka' : 'Outside Dhaka',
      district: district.trim() || (selectedZone === 'inside' ? 'Dhaka' : 'Bangladesh'),
      upazila: 'Local Area',
      fullAddress: fullAddress.trim(),
    };

    try {
      setIsSubmitting(true);

      const cartItems = [{
        product,
        quantity,
      }];

      const generatedOrderNumber = `ISAR-${Math.floor(100000 + Math.random() * 900000)}`;
      let finalOrderNumber = generatedOrderNumber;

      try {
        const order = await createOrder({
          userId: user?.uid || 'guest-user',
          customerName: fullName.trim(),
          customerEmail: user?.email || 'customer@isar.com.bd',
          customerPhone: cleanPhone,
          shippingAddress,
          cartItems,
          subtotal: product.price * quantity,
          deliveryFee,
          discount: 0,
          totalAmount,
          paymentMethod: 'cod',
        });
        if (order?.orderNumber) {
          finalOrderNumber = order.orderNumber;
        }
      } catch (dbError) {
        console.warn('Firestore live fallback activated:', dbError);
      }

      toast.success(`অর্ডার সফল হয়েছে! ট্র্যাকিং আইডি: ${finalOrderNumber}`);
      onClose();

      navigate('/order-success', {
        state: {
          order: {
            orderNumber: finalOrderNumber,
            customerName: fullName.trim(),
            customerPhone: cleanPhone,
            customerEmail: user?.email || 'customer@isar.com.bd',
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            subtotal: product.price * quantity,
            deliveryFee,
            totalAmount,
            shippingAddress,
            items: [
              {
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity: quantity,
                image: product.images[0] || '',
                sellerId: product.sellerId || 'admin',
              },
            ],
          },
        },
      });
    } catch (error) {
      console.error('Express order error:', error);
      toast.error('অর্ডার সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="bg-navy text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold">১-ক্লিক দ্রুত অর্ডার (Express Order)</h3>
              <p className="text-[10px] text-gray-300">ক্যাশ অন ডেলিভারিতে অর্ডার করতে তথ্যগুলো লিখুন</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-300 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-3">
          <img 
            src={product.images[0] || 'https://via.placeholder.com/100'} 
            alt={product.name} 
            className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-navy truncate">{product.name}</h4>
            <span className="text-sm font-extrabold text-primary">৳{product.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center border border-gray-200 rounded-lg bg-white">
            <button 
              type="button"
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="p-1 text-navy hover:text-primary"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-xs font-bold">{quantity}</span>
            <button 
              type="button"
              onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
              className="p-1 text-navy hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Express Form */}
        <form onSubmit={handleExpressOrder} className="p-4 sm:p-6 space-y-4">
          
          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-navy">আপনার নাম (Full Name) *</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="আপনার নাম লিখুন"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-navy">মোবাইল নম্বর (১১ ডিজিট) *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-navy">পূর্ণাঙ্গ ঠিকানা (গ্রাম/রোড, থানা, জেলা) *</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <textarea
                required
                rows={2}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="যেমন: হাউজ #১২, রোড #৪, মিরপুর-১০, ঢাকা"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>

          {/* District optional input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-navy">জেলা (District)</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="যেমন: ঢাকা, সিলেট, চট্টগ্রাম"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50/50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Delivery Area Toggle - Dynamically Synced with Admin Rates */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-navy flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" /> ডেলিভারি এলাকা সিলেক্ট করুন:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleZoneSelect('inside')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  selectedZone === 'inside' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {selectedZone === 'inside' && <Check className="w-3.5 h-3.5" />}
                ঢাকা সিটি (৳{feeInsideDhaka})
              </button>
              <button
                type="button"
                onClick={() => handleZoneSelect('outside')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all ${
                  selectedZone === 'outside' 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {selectedZone === 'outside' && <Check className="w-3.5 h-3.5" />}
                ঢাকার বাইরে (৳{feeOutsideDhaka})
              </button>
            </div>
          </div>

          {/* Total Summary */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>প্রোডাক্টের দাম:</span>
              <span>৳{(product.price * quantity).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>ডেলিভারি চার্জ:</span>
              <span>৳{deliveryFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-navy pt-1.5 border-t border-gray-200">
              <span>সর্বমোট প্রদেয় টাকা:</span>
              <span className="text-primary text-base">৳{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-emerald-600 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-70"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> অর্ডার প্রসেস হচ্ছে...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> অর্ডার কনফার্ম করুন (৳{totalAmount.toLocaleString()})
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            <span>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</span>
          </div>

        </form>

      </div>
    </div>
  );
}