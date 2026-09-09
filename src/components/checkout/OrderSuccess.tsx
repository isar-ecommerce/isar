import { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  CheckCircle2, 
  Package, 
  Printer, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  Truck, 
  ArrowRight,
  Loader2,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import BrandLogo from '../common/BrandLogo';
import type { Order } from '../../types/order';

export default function OrderSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const stateOrder = location.state?.order as Order | undefined;
  const orderNumberParam = searchParams.get('orderNumber') || stateOrder?.orderNumber;

  const [orderData, setOrderData] = useState<Order | null>(stateOrder || null);
  const [isLoading, setIsLoading] = useState<boolean>(!stateOrder && Boolean(orderNumberParam));
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ১. পেজ রিফ্রেশ দিলেও ফায়ারস্টোর থেকে আসল অর্ডার লোড করা
  useEffect(() => {
    let isMounted = true;
    if (stateOrder || !orderNumberParam) return;

    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const q = query(collection(db, 'orders'), where('orderNumber', '==', orderNumberParam));
        const snap = await getDocs(q);

        if (!snap.empty && isMounted) {
          const docData = snap.docs[0].data() as Order;
          docData.id = snap.docs[0].id;
          setOrderData(docData);
        }
      } catch (err) {
        console.warn('Could not fetch order on refresh:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderNumberParam, stateOrder]);

  // ২. লাইটওয়েট কনফেটি ক্যানন সেলিব্রেশন অ্যানিমেশন (#16)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * (canvas.height * 0.4) - 50,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 6 - 3,
        opacity: 1,
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();

    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - startTime;

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        if (elapsed > 2500) {
          p.opacity = Math.max(0, p.opacity - 0.015);
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < 4500) {
        animationFrameId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animationFrameId = requestAnimationFrame(renderConfetti);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyOrderId = () => {
    if (!orderData?.orderNumber) return;
    navigator.clipboard.writeText(orderData.orderNumber);
    setIsCopied(true);
    toast.success('Order ID copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
        <p className="text-xs text-gray-500 font-bold">Generating authentic invoice...</p>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-secondary p-4 text-center">
        <Package className="w-12 h-12 text-gray-300 mb-3" />
        <h2 className="text-xl font-bold text-navy">Order Record Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">Please check your tracking ID or return to shop.</p>
        <Link to="/products" className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-6 sm:py-10 print:bg-white print:py-0 print:min-h-0 relative overflow-hidden">
      <Helmet>
        <title>{`Order Confirmed #${orderData.orderNumber} | ISAR Marketplace`}</title>
      </Helmet>

      {/* Confetti Canvas (#16) */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50 print:hidden" 
      />

      <div className="container mx-auto px-4 max-w-3xl print:max-w-none print:px-0 relative z-10">
        
        {/* Main Receipt Card (Optimized for 1-Page A4 Printing) */}
        <div className="bg-white rounded-3xl shadow-modern-lg border border-gray-100 p-6 md:p-8 space-y-6 print:shadow-none print:border-none print:p-4 print:space-y-4">
          
          {/* Print Header */}
          <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-navy">
            <div>
              <BrandLogo isLink={false} />
              <p className="text-[11px] text-gray-500 mt-1">Official E-commerce Marketplace Bangladesh</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-navy uppercase">Cash Memo / Invoice</h2>
              <p className="text-xs font-bold text-primary font-mono">#{orderData.orderNumber}</p>
              <p className="text-[10px] text-gray-400">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* Web Screen Success Header */}
          <div className="text-center space-y-2 pb-5 border-b border-gray-100 print:hidden">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto text-brand-green mb-1 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-brand-green" />
            </div>
            
            <span className="text-[11px] font-black uppercase tracking-wider text-brand-green bg-brand-green/10 px-3.5 py-1 rounded-full inline-flex items-center gap-1 border border-brand-green/20">
              <Sparkles className="w-3.5 h-3.5" /> Order Placed Successfully
            </span>

            <h1 className="text-2xl md:text-3xl font-black text-navy">
              Thank You! Your Order is Confirmed
            </h1>
            
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              We have received your order. Our team will pack and dispatch your parcel to your address shortly via Steadfast Courier.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl shadow-2xs">
                <span className="text-xs text-gray-500 font-bold">Order Tracking ID:</span>
                <span className="text-sm font-black text-primary font-mono">{orderData.orderNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="p-1 text-gray-400 hover:text-navy transition-colors cursor-pointer ml-1"
                  title="Copy Tracking ID"
                >
                  {isCopied ? <Check className="w-4 h-4 text-brand-green" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Notice */}
          <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3 text-xs text-navy print:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-xs">Estimated Delivery Timeline:</p>
              <p className="text-gray-500 text-[11px]">
                {orderData.shippingAddress?.division === 'Dhaka' 
                  ? 'Inside Dhaka City: Delivered within 24 to 48 Hours.' 
                  : 'Outside Dhaka City: Delivered within 2 to 4 Business Days via Steadfast Courier.'}
              </p>
            </div>
          </div>

          {/* Customer & Shipping Summary Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            
            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1 print:bg-white print:border print:p-2.5">
              <span className="font-bold text-gray-400 uppercase text-[9px] block">Customer Information</span>
              <p className="font-bold text-navy text-xs sm:text-sm">{orderData.customerName || 'Customer'}</p>
              <p className="text-gray-600 flex items-center gap-1 text-xs">
                <Phone className="w-3 h-3 text-gray-400 print:hidden" /> {orderData.customerPhone || 'N/A'}
              </p>
              <p className="text-gray-500 text-[11px] truncate">{orderData.customerEmail || 'N/A'}</p>
            </div>

            {/* Delivery Address */}
            <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1 print:bg-white print:border print:p-2.5">
              <span className="font-bold text-gray-400 uppercase text-[9px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-green print:hidden" /> Delivery Address
              </span>
              <p className="font-bold text-navy text-xs sm:text-sm">{orderData.shippingAddress?.fullName}</p>
              <p className="text-gray-600 leading-snug text-xs">{orderData.shippingAddress?.fullAddress}</p>
              <p className="text-gray-500 text-[11px]">
                {orderData.shippingAddress?.upazila}, {orderData.shippingAddress?.district}, {orderData.shippingAddress?.division}
              </p>
            </div>

          </div>

          {/* Purchased Items List */}
          <div className="space-y-2">
            <h3 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary print:hidden" /> Order Items ({orderData.items?.length || 1})
            </h3>
            
            <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 print:rounded-none print:border">
              {orderData.items?.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80'} 
                      alt={item.productName} 
                      className="w-10 h-10 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0 print:w-8 print:h-8"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-navy text-xs truncate">{item.productName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">Qty: {item.quantity} × {item.price?.toLocaleString()} BDT</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-navy text-xs sm:text-sm shrink-0 font-mono">
                    {((item.price || 0) * (item.quantity || 1)).toLocaleString()} BDT
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Invoice Breakdown */}
          <div className="p-4 bg-navy text-white rounded-2xl space-y-2 text-xs print:bg-white print:text-black print:border print:rounded-none">
            <div className="flex justify-between text-gray-300 print:text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold text-white print:text-black font-mono">{orderData.subtotal?.toLocaleString()} BDT</span>
            </div>
            <div className="flex justify-between text-gray-300 print:text-gray-700">
              <span>Delivery Charge:</span>
              <span className="font-semibold text-white print:text-black font-mono">{orderData.deliveryFee?.toLocaleString()} BDT</span>
            </div>
            {(orderData.discount || 0) > 0 && (
              <div className="flex justify-between text-brand-green print:text-black">
                <span>Discount:</span>
                <span className="font-semibold font-mono">-{orderData.discount?.toLocaleString()} BDT</span>
              </div>
            )}
            <div className="flex justify-between text-gray-300 print:text-gray-700">
              <span>Payment Method:</span>
              <span className="font-bold text-brand-green uppercase print:text-black">
                {orderData.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'bKash Online Payment'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-navy-light print:text-black print:border-t-2 print:border-black">
              <span>Total Payable Amount:</span>
              <span className="text-brand-gold text-base font-mono font-black print:text-black">{orderData.totalAmount?.toLocaleString()} BDT</span>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:flex items-center justify-between pt-6 border-t text-[10px] text-gray-500">
            <div>
              <p>Helpline: +880 1624789764</p>
              <p>Email: isar.store.bd@gmail.com</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Authorized Signature</p>
              <p className="text-[9px]">Thank you for shopping with ISAR!</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer hover:scale-102"
            >
              <Printer className="w-4 h-4" /> Print Invoice (A4 Memo)
            </button>

            <Link
              to="/products"
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md ml-auto cursor-pointer hover:scale-102"
            >
              <ShoppingBag className="w-4 h-4" /> Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}