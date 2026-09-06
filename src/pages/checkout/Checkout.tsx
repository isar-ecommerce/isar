import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  CheckCircle2,
  Mail,
  Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { createOrder, calculateDynamicDeliveryFee } from '../../services/orderService';
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
import type { ShippingAddress, PaymentMethod } from '../../types/order';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phone, setPhone] = useState<string>('');
  const [alternatePhone, setAlternatePhone] = useState<string>('');
  
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));

  // শুধুমাত্র ২টি পরিষ্কার অপশন: 'cod' অথবা 'bkash'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // অফিশিয়াল বিকাশ কলব্যাক লিসেনার
  useEffect(() => {
    const paymentID = searchParams.get('paymentID');
    const status = searchParams.get('status');

    if (paymentID && status === 'success') {
      const pendingDataStr = sessionStorage.getItem('isar_pending_order');
      if (!pendingDataStr) return;

      const executePayment = async () => {
        try {
          setIsSubmitting(true);
          const toastId = toast.loading('Verifying official bKash payment...');

          const execRes = await fetch('/api/bkash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'execute-payment', paymentID }),
          });

          const execData = await execRes.json();
          toast.dismiss(toastId);

          if (execRes.ok && execData.success) {
            const pendingOrder = JSON.parse(pendingDataStr);
            sessionStorage.removeItem('isar_pending_order');

            const order = await createOrder({
              ...pendingOrder,
              paymentStatus: 'paid',
              paidAmount: pendingOrder.totalAmount,
              dueAmount: 0,
              transactionId: execData.trxID,
            });

            sendOrderConfirmationSMS(order.customerPhone, order.orderNumber, order.totalAmount);
            sendOrderConfirmationEmail(order);
            sendAdminOrderAlert(order);

            clearCart();
            toast.success(`bKash payment successful! TrxID: ${execData.trxID}`);

            navigate('/order-success', {
              state: {
                order: {
                  ...order,
                  paymentStatus: 'paid',
                  paidAmount: pendingOrder.totalAmount,
                  dueAmount: 0,
                  totalAmount: pendingOrder.totalAmount,
                },
              },
            });
          } else {
            toast.error(execData.message || 'Payment execution failed.');
          }
        } catch (err) {
          console.error('Execute error:', err);
          toast.error('Payment verification failed.');
        } finally {
          setIsSubmitting(false);
        }
      };

      executePayment();
    } else if (status === 'cancel' || status === 'failure') {
      toast.error('bKash payment was cancelled or failed.');
    }
  }, [searchParams, navigate, clearCart]);

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => {
      const weightPerItem = (item.product as { weightInKg?: number })?.weightInKg || 0.5;
      return sum + weightPerItem * item.quantity;
    }, 0);
  }, [items]);

  const { deliveryFee, deliveryZone } = useMemo(() => {
    const calculation = calculateDynamicDeliveryFee(district, upazila, totalWeight);
    return {
      deliveryFee: calculation.fee,
      deliveryZone: calculation.zone
    };
  }, [district, upazila, totalWeight]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + deliveryFee - discount);
  }, [subtotal, deliveryFee, discount]);

  useEffect(() => {
    if (items.length === 0 && !searchParams.get('paymentID')) {
      toast.error('Your cart is empty');
      navigate('/cart');
    }
  }, [items, navigate, searchParams]);

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

  const validateForm = () => {
    if (!fullName.trim() || !phone.trim() || !email.trim() || !district.trim() || !upazila.trim() || !fullAddress.trim()) {
      toast.error('Please fill in all required shipping fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return false;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      toast.error('Please enter a valid 11-digit mobile number (01XXXXXXXXX)');
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const generatedOrderNumber = `ISAR-${Date.now().toString().slice(-6)}`;

      const shippingAddress: ShippingAddress = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        division,
        district,
        upazila,
        fullAddress: fullAddress.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
      };

      // ১. বিকাশ অনলাইন পেমেন্ট সিলেক্ট করলে
      if (paymentMethod === 'bkash') {
        sessionStorage.setItem('isar_pending_order', JSON.stringify({
          userId: user?.uid || 'guest-user',
          customerName: fullName.trim(),
          customerEmail: email.trim(),
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
          paymentStatus: 'paid',
          paidAmount: total,
          dueAmount: 0,
          orderNumber: generatedOrderNumber,
        }));

        const res = await fetch('/api/bkash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-payment',
            amount: total,
            orderNumber: generatedOrderNumber,
            callbackURL: `${window.location.origin}/checkout?bkash_callback=true`,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.bkashURL) {
          window.location.assign(data.bkashURL);
          return;
        } else {
          toast.error(data.message || 'Failed to connect to bKash Gateway.');
          return;
        }
      }

      // ২. ক্যাশ অন ডেলিভারি (COD): ০ অগ্রিম, ১০০% ডেলিভারির সময় ক্যাশ
      const order = await createOrder({
        userId: user?.uid || 'guest-user',
        customerName: fullName.trim(),
        customerEmail: email.trim(),
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
        paymentMethod: 'cod',
        paymentStatus: 'pending',
        paidAmount: 0,
        dueAmount: total,
      });

      sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total);
      sendOrderConfirmationEmail(order);
      sendAdminOrderAlert(order);

      clearCart();
      toast.success(`Order placed successfully! Order ID: ${order.orderNumber}`);

      navigate('/order-success', {
        state: {
          order: {
            ...order,
            paymentStatus: 'pending',
            paidAmount: 0,
            dueAmount: total,
            totalAmount: total,
          },
        },
      });
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to complete order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getZoneLabel = () => {
    if (deliveryZone === 'inside_dhaka') return 'Inside Dhaka';
    if (deliveryZone === 'dhaka_suburbs') return 'Dhaka Suburbs (Savar/Gazipur)';
    return 'Outside Dhaka';
  };

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>Checkout | ISAR Marketplace</title>
        <meta name="description" content="Complete your purchase with Cash on Delivery or bKash at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to Cart
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy mt-2">Checkout</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Delivery Address & Clean Payment Options */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Delivery Address Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Shipping & Delivery Address</h2>
                  <p className="text-xs text-gray-500">Provide your address for accurate home delivery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Shakib Al Hasan"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Mobile Number (11 Digits) *</label>
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
                  <label className="text-xs font-bold text-navy">Alternative Phone (Optional)</label>
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
                  <label className="text-xs font-bold text-navy">Division *</label>
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
                  <label className="text-xs font-bold text-navy">District *</label>
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
                  <label className="text-xs font-bold text-navy">Thana / Upazila *</label>
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
                  <label className="text-xs font-bold text-navy">Full Street Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House, Road, Area details..."
                    className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Delivery Notes */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-navy">Delivery Notes (Optional)</label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before delivery"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

              </div>
            </div>

            {/* Payment Method Card: ২টি পরিষ্কার অপশন */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-modern border border-gray-100 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy">Payment Method</h2>
                  <p className="text-xs text-gray-500">Select how you want to pay</p>
                </div>
              </div>

              <div className="space-y-3">
                
                {/* 1. Cash On Delivery */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-navy bg-slate-50 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="w-4 h-4 text-navy focus:ring-navy cursor-pointer"
                    />
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-black text-sm text-navy block">Cash On Delivery</span>
                      <span className="text-xs text-gray-500">Pay cash when your parcel arrives at your doorstep</span>
                    </div>
                  </div>

                  {paymentMethod === 'cod' && (
                    <CheckCircle2 className="w-5 h-5 text-navy shrink-0" />
                  )}
                </label>

                {/* 2. Official bKash Gateway */}
                <label 
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'bkash' 
                      ? 'border-[#E2136E] bg-pink-50/50 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bkash"
                      checked={paymentMethod === 'bkash'}
                      onChange={() => setPaymentMethod('bkash')}
                      className="w-4 h-4 text-[#E2136E] focus:ring-[#E2136E] cursor-pointer"
                    />
                    <div className="w-9 h-9 rounded-xl bg-[#E2136E] p-1.5 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
                        <path d="M19.5 3L8 16.5L14.5 18L12 29L26 14.5L18.5 13.5L19.5 3Z" fill="white" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-black text-sm text-[#E2136E] block">bKash Online Payment</span>
                      <span className="text-xs text-gray-500">Instant checkout via official bKash portal</span>
                    </div>
                  </div>

                  {paymentMethod === 'bkash' && (
                    <CheckCircle2 className="w-5 h-5 text-[#E2136E] shrink-0" />
                  )}
                </label>

              </div>

            </div>

          </div>

          {/* Right Column: Order Summary (Zero Weight Label) */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-6 sticky top-24">
              
              <div className="pb-3 border-b border-gray-100">
                <h2 className="text-base font-black text-navy">Order Summary ({items.length} Items)</h2>
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
                      <p className="text-[11px] text-gray-500 font-medium">Qty: {item.quantity} × {item.product.price.toLocaleString()} BDT</p>
                    </div>
                    <span className="text-xs font-black text-navy font-mono">{(item.product.price * item.quantity).toLocaleString()} BDT</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Product Subtotal</span>
                  <span className="font-bold text-navy font-mono">{subtotal.toLocaleString()} BDT</span>
                </div>

                <div className="flex justify-between text-gray-600 font-medium">
                  <div>
                    <span className="block">Delivery Charge</span>
                    <span className="text-[10px] text-gray-400">{getZoneLabel()}</span>
                  </div>
                  <span className="font-bold text-navy font-mono">{deliveryFee.toLocaleString()} BDT</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-brand-green font-bold">
                    <span>Discount</span>
                    <span className="font-mono">-{discount.toLocaleString()} BDT</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-navy pt-3 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-primary font-mono text-lg font-black">{total.toLocaleString()} BDT</span>
                </div>
              </div>

              {/* Order Button (Clean Order Now) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 px-6 rounded-2xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> 
                    <span>Order Now ({total.toLocaleString()} BDT)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-brand-green" />
                <span>Encrypted & Safe Checkout</span>
              </div>

            </div>

          </div>

        </form>

      </div>
    </div>
  );
}