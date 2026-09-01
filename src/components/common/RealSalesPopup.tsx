import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, CheckCircle2, Clock } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Order } from '../../types/order';

export default function RealSalesPopup() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // ১. ফায়ারস্টোর থেকে শুধুমাত্র আসল অর্ডারগুলো লোড করা (কোনো ফেক ডেটা ছাড়া)
  useEffect(() => {
    let isMounted = true;

    const fetchRealOrders = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(q);
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];

        // শুধুমাত্র ভ্যালিড আইটেম সহ আসল অর্ডারগুলো ফিল্টার করা
        const validOrders = list.filter((o) => o.items && o.items.length > 0 && o.status !== 'cancelled');

        if (isMounted && validOrders.length > 0) {
          setOrders(validOrders);
        }
      } catch (error) {
        console.error('Error fetching real orders for sales popup:', error);
      }
    };

    Promise.resolve().then(() => {
      fetchRealOrders();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // ২. নির্দিষ্ট সময় পরপর লাইভ পপআপ দেখানো ও হাইড করা
  useEffect(() => {
    if (orders.length === 0 || isDismissed) return;

    // পেজ লোডের ৬ সেকেন্ড পর প্রথম পপআপ আসবে
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
    }, 6000);

    // প্রতি ১৮ সেকেন্ড পর পর পরবর্তী আসল অর্ডার রোটেট করবে
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % orders.length);
        setIsVisible(true);
      }, 1000);

      // ৫ সেকেন্ড প্রদর্শিত থাকার পর অটো হাইড হবে
      setTimeout(() => {
        setIsVisible(false);
      }, 6000);
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [orders, isDismissed]);

  // ডেটাবেসে কোনো আসল অর্ডার না থাকলে বা কাস্টমার ক্লোজ করলে কিছুই দেখাবে না (জিরো ফেক ডেটা)
  if (orders.length === 0 || !isVisible || isDismissed) {
    return null;
  }

  const currentOrder = orders[currentIndex];
  if (!currentOrder || !currentOrder.items || currentOrder.items.length === 0) {
    return null;
  }

  const item = currentOrder.items[0];
  const customerFirstName = currentOrder.customerName ? currentOrder.customerName.split(' ')[0] : 'Customer';
  const district = currentOrder.shippingAddress?.district || currentOrder.shippingAddress?.division || 'Bangladesh';

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-40 max-w-xs sm:max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300 print:hidden">
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-gray-100 flex items-center gap-3 relative group">
        
        {/* Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute -top-1.5 -right-1.5 p-1 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-navy rounded-full transition-colors shadow-sm"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Product Thumbnail */}
        <Link to={`/products/${item.productId}`} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
          {item.image ? (
            <img src={item.image} alt={item.productName} className="w-full h-full object-contain" />
          ) : (
            <ShoppingBag className="w-6 h-6 text-gray-300" />
          )}
        </Link>

        {/* Order Content */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1 mb-0.5">
            <CheckCircle2 className="w-3 h-3 text-brand-green shrink-0" />
            <p className="text-[11px] font-bold text-navy truncate">
              <span className="text-primary">{customerFirstName}</span> ({district})
            </p>
          </div>

          <Link
            to={`/products/${item.productId}`}
            className="text-[11px] font-semibold text-gray-700 hover:text-primary transition-colors line-clamp-1 block"
          >
            Purchased {item.productName}
          </Link>

          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-medium mt-0.5">
            <Clock className="w-2.5 h-2.5 text-gray-400" />
            <span>Verified Purchase • ৳{item.price?.toLocaleString()}</span>
          </div>
        </div>

      </div>
    </div>
  );
}