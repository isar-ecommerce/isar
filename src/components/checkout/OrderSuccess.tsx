import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  // পেজ রিফ্রেশ দিলেও ফায়ারস্টোর থেকে আসল কাস্টমারের ডেটা রিড করা (কোনো ডামি ডেটা ছাড়া)
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

  const handlePrint = () => {
    window.print();
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
    <div className="bg-secondary min-h-screen py-6 sm:py-10 print:bg-white print:py-0 print:min-h-0">
      <Helmet>
        <title>{`Order Confirmed #${orderData.orderNumber} | ISAR Marketplace`}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-3xl print:max-w-none print:px-0">
        
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
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto text-brand-green">
              <CheckCircle2 className="w-10 h-10 text-brand-green" />
            </div>
            
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-green bg-brand-green/10 px-3 py-0.5 rounded-full inline-block">
              Order Confirmed & Placed
            </span>

            <h1 className="text-2xl md:text-3xl font-black text-navy">
              Thank You! Your Order is Confirmed
            </h1>
            
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              We have received your order. Our team will pack and dispatch your parcel to your address shortly.
            </p>

            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">Tracking Order ID:</span>
                <span className="text-sm font-extrabold text-primary font-mono">{orderData.orderNumber}</span>
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
                      <p className="text-[10px] text-gray-400">Qty: {item.quantity} × {item.price?.toLocaleString()} BDT</p>
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
              <span className="text-brand-gold text-base font-mono print:text-black">{orderData.totalAmount?.toLocaleString()} BDT</span>
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
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Invoice (A4 Memo)
            </button>

            <Link
              to="/products"
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md ml-auto cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" /> Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}