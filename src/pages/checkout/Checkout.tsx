import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  Banknote, 
  Tag, 
  Sparkles, 
  Plus,
  Minus,
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { createOrder, calculateDynamicDeliveryFee } from '../../services/orderService';
import { validateCouponCode, incrementCouponUsage } from '../../services/couponService';
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const formRef = useRef<HTMLFormElement>(null);

  const { 
    items, 
    getSubtotal, 
    getDiscount, 
    appliedCoupon, 
    applyCoupon, 
    removeCoupon, 
    updateQuantity,
    removeItem,
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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState<boolean>(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const originState = location.state as { from?: string; path?: string } | null;
  const backButtonLabel = originState?.from ? `Back to ${originState.from}` : 'Back to Cart';
  const backButtonPath = originState?.path || '/cart';

  const handleBackNavigation = () => {
    navigate(backButtonPath);
  };

  // Auto-fill address from User Profile if logged in
  useEffect(() => {
    let isMounted = true;
    if (!user?.uid) return;

    const loadSavedAddress = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && isMounted) {
          const data = userSnap.data();
          if (data.savedAddress) {
            const addr = data.savedAddress;
            if (addr.fullName) setFullName(addr.fullName);
            if (addr.phone) setPhone(addr.phone);
            if (addr.division) {
              setDivision(addr.division);
              const dists = getDistrictsByDivision(addr.division);
              setAvailableDistricts(dists);
            }
            if (addr.district) {
              setDistrict(addr.district);
              const upas = getUpazilasByDistrict(addr.division || 'Dhaka', addr.district);
              setAvailableUpazilas(upas);
            }
            if (addr.upazila) setUpazila(addr.upazila);
            if (addr.fullAddress) setFullAddress(addr.fullAddress);
          } else if (data.displayName) {
            setFullName((prev) => (prev.trim() ? prev : data.displayName));
          }
        }
      } catch (err) {
        console.warn('Could not auto-fill profile address:', err);
      }
    };

    Promise.resolve().then(() => loadSavedAddress());

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Official bKash Tokenized Callback Listener
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

          if (execRes.ok && execData.success && execData.trxID) {
            const pendingOrder = JSON.parse(pendingDataStr);
            sessionStorage.removeItem('isar_pending_order');

            const order = await createOrder({
              ...pendingOrder,
              paymentStatus: 'paid',
              paidAmount: pendingOrder.totalAmount,
              dueAmount: 0,
              paymentMethod: 'bkash',
              transactionId: execData.trxID,
            });

            if (pendingOrder.couponId) {
              incrementCouponUsage(pendingOrder.couponId);
            }

            await Promise.allSettled([
              sendOrderConfirmationSMS(order.customerPhone, order.orderNumber, order.totalAmount),
              sendOrderConfirmationEmail(order),
              sendAdminOrderAlert(order),
            ]);

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

  // Live dynamic weight & delivery charge calculation based on current items
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

  const handleApplyCoupon = async (e: FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setIsValidatingCoupon(true);
      const result = await validateCouponCode(couponCodeInput, subtotal);

      if (result.isValid && result.coupon) {
        applyCoupon({
          code: result.coupon.code,
          discountType: result.coupon.discountType,
          discountValue: result.coupon.discountValue,
          minOrderAmount: result.coupon.minOrderAmount,
          maxDiscount: result.coupon.maxDiscountAmount || undefined,
        });
        toast.success(result.message);
        setCouponCodeInput('');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Coupon validation error:', err);
      toast.error('Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Coupon removed successfully');
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      document.getElementById('checkout-fullName')?.focus();
      return false;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address for the invoice');
      document.getElementById('checkout-email')?.focus();
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      document.getElementById('checkout-email')?.focus();
      return false;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      toast.error('Please enter a valid 11-digit mobile number (01XXXXXXXXX)');
      document.getElementById('checkout-phone')?.focus();
      return false;
    }

    if (!fullAddress.trim()) {
      toast.error('Please enter your street address');
      document.getElementById('checkout-fullAddress')?.focus();
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async (e: FormEvent) => {
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
          couponId: (appliedCoupon as { id?: string })?.id,
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

      if ((appliedCoupon as { id?: string })?.id) {
        incrementCouponUsage((appliedCoupon as { id?: string }).id!);
      }

      await Promise.allSettled([
        sendOrderConfirmationSMS(phone.trim(), order.orderNumber, total),
        sendOrderConfirmationEmail(order),
        sendAdminOrderAlert(order),
      ]);

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
    <div className="bg-secondary min-h-screen py-6 sm:py-10">
      <Helmet>
        <title>Checkout | ISAR Marketplace</title>
        <meta name="description" content="Complete your purchase with Cash on Delivery or bKash at ISAR." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Dynamic Back Button */}
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{backButtonLabel}</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-navy mt-1.5">Checkout</h1>
        </div>

        <form ref={formRef} onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column: Shipping & Payment */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-modern border border-gray-100 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-navy">Shipping & Delivery Address</h2>
                  <p className="text-xs text-gray-500">Provide your address for accurate home delivery</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                
                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="checkout-fullName" className="text-xs font-bold text-navy">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Shakib Al Hasan"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="checkout-email" className="text-xs font-bold text-navy">Email *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-phone" className="text-xs font-bold text-navy">Mobile Number (11 Digits) *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-altPhone" className="text-xs font-bold text-navy">Alternative Phone (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="checkout-altPhone"
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-division" className="text-xs font-bold text-navy">Division *</label>
                  <select
                    id="checkout-division"
                    value={division}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {BANGLADESH_DIVISIONS.map((d) => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="checkout-district" className="text-xs font-bold text-navy">District *</label>
                  <select
                    id="checkout-district"
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableDistricts.map((dist) => (
                      <option key={dist.name} value={dist.name}>{dist.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="checkout-upazila" className="text-xs font-bold text-navy">Thana / Upazila *</label>
                  <select
                    id="checkout-upazila"
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {availableUpazilas.map((upa) => (
                      <option key={upa} value={upa}>{upa}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="checkout-fullAddress" className="text-xs font-bold text-navy">Full Street Address *</label>
                  <textarea
                    id="checkout-fullAddress"
                    required
                    rows={2}
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="House, Road, Area details..."
                    className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label htmlFor="checkout-deliveryNotes" className="text-xs font-bold text-navy">Delivery Notes (Optional)</label>
                  <input
                    id="checkout-deliveryNotes"
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Call before delivery"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs sm:text-sm text-navy placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

              </div>
            </div>

            {/* Payment Methods Card */}
            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-modern border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-navy">Payment Method</h2>
                  <p className="text-xs text-gray-500">Choose your preferred payment option</p>
                </div>
              </div>

              <div className="space-y-3">
                
                {/* Cash on Delivery */}
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
                      <span className="font-black text-sm text-navy block">Cash on Delivery</span>
                      <span className="text-xs text-gray-500">Zero advance payment. Pay full amount when receiving parcel.</span>
                    </div>
                  </div>

                  {paymentMethod === 'cod' && (
                    <CheckCircle2 className="w-5 h-5 text-navy shrink-0" />
                  )}
                </label>

                {/* bKash Payment */}
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
                      <span className="text-xs text-gray-500">Pay 100% total order amount online via official bKash gateway.</span>
                    </div>
                  </div>

                  {paymentMethod === 'bkash' && (
                    <CheckCircle2 className="w-5 h-5 text-[#E2136E] shrink-0" />
                  )}
                </label>

              </div>

            </div>

          </div>

          {/* Right Column: Order Summary with Live Item Quantity Adjustments */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-modern border border-gray-100 space-y-4 sticky top-24">
              
              <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-black text-navy">Order Summary</h2>
                <span className="text-xs font-bold text-gray-400 font-mono">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} Pcs ({items.length} Items)
                </span>
              </div>

              {/* Items List with Live + / - Quantity Controls on Checkout */}
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {items.map((item, idx) => {
                  const maxStock = Math.max(1, item.product.stock || 1);
                  const isAtMin = item.quantity <= 1;
                  const isAtMax = item.quantity >= maxStock;

                  return (
                    <div 
                      key={`${item.product.id}-${item.selectedVariantId || idx}`}
                      className="p-2.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex items-center justify-between gap-2.5 relative group"
                    >
                      <img
                        src={item.product.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-xl object-cover bg-white border border-gray-200 shrink-0 p-0.5"
                      />
                      
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-xs font-bold text-navy truncate">{item.product.name}</p>
                        <p className="text-[11px] text-gray-500 font-mono font-medium">
                          {item.product.price.toLocaleString()} BDT
                        </p>
                        
                        {/* Live Quantity Adjustments */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                              disabled={isAtMin}
                              className="w-5 h-5 flex items-center justify-center text-navy hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              aria-label="Decrease quantity"
                              title="Decrease quantity"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-navy font-mono">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isAtMax) {
                                  toast.error(`Max stock is ${maxStock}`);
                                } else {
                                  updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId);
                                }
                              }}
                              disabled={isAtMax}
                              className="w-5 h-5 flex items-center justify-center text-navy hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              aria-label="Increase quantity"
                              title="Increase quantity"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.product.id, item.selectedVariantId)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <span className="text-xs font-black text-navy font-mono shrink-0">
                        {(item.product.price * item.quantity).toLocaleString()} BDT
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Input Box */}
              <div className="pt-2">
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <label htmlFor="checkout-couponInput" className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Promo Coupon
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="checkout-couponInput"
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder="e.g. EID2026"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-mono font-bold text-navy uppercase focus:bg-white focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCodeInput.trim()}
                        className="px-4 py-2 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-brand-green/10 border border-brand-green/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-green shrink-0" />
                      <div>
                        <span className="text-xs font-black text-navy font-mono">{appliedCoupon.code}</span>
                        <span className="text-[10px] text-brand-green font-bold block">Coupon Applied</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                      title="Remove Coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Bill Breakdown */}
              <div className="space-y-2.5 pt-3 border-t border-gray-100 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Product Subtotal</span>
                  <span className="font-bold text-navy font-mono">{subtotal.toLocaleString()} BDT</span>
                </div>

                <div className="flex justify-between text-gray-600 font-medium">
                  <div>
                    <span className="block">Delivery Charge</span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {getZoneLabel()} • Based on {totalWeight.toFixed(1)} kg weight
                    </span>
                  </div>
                  <span className="font-bold text-navy font-mono">{deliveryFee.toLocaleString()} BDT</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-brand-green font-bold">
                    <span>Coupon Discount</span>
                    <span className="font-mono">-{discount.toLocaleString()} BDT</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-navy pt-2.5 border-t border-gray-100">
                  <span>Total Payable</span>
                  <span className="text-primary font-mono text-lg font-black">{total.toLocaleString()} BDT</span>
                </div>
              </div>

              {/* Confirm Order Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-3.5 sm:py-4 px-6 rounded-2xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Processing Order...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> 
                    <span>
                      {paymentMethod === 'bkash' 
                        ? `Pay ${total.toLocaleString()} BDT with bKash` 
                        : `Confirm Order (${total.toLocaleString()} BDT)`}
                    </span>
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