// অর্ডারের বিভিন্ন স্ট্যাটাস টাইমলাইন
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned'
  | 'refund_requested'
  | 'refunded';

// পেমেন্ট মেথড টাইপ
export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'card';

// পেমেন্ট স্ট্যাটাস ('partial_paid' যুক্ত করা হয়েছে অগ্রিম ডেলিভারি চার্জের জন্য)
export type PaymentStatus = 'pending' | 'partial_paid' | 'paid' | 'failed' | 'refunded';

// স্টেডফাস্ট কুরিয়ার ডেলিভারি জোন টাইপ
export type DeliveryZone = 'inside_dhaka' | 'dhaka_suburbs' | 'outside_dhaka';

// বাংলাদেশ ডেলিভারি এড্রেস ইন্টারফেস
export interface ShippingAddress {
  fullName: string;
  phone: string;            // যেমন: 01712345678
  alternatePhone?: string;  // অল্টারনেটিভ নম্বর (ঐচ্ছিক)
  division: string;         // যেমন: Dhaka, Chittagong
  district: string;         // যেমন: Dhaka, Gazipur
  upazila: string;          // থানা/উপজেলা (যেমন: Mirpur, Dhanmondi)
  fullAddress: string;      // হাউজ নম্বর, রোড নম্বর ইত্যাদি
  deliveryNotes?: string;   // রাইডারের জন্য বিশেষ কোনো নির্দেশ
}

// অর্ডারের প্রতি আইটেমের স্ন্যাপশট
export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image: string;
  weightInKg?: number;      // প্রতি আইটেমের আনুমানিক ওজন (ডিফল্ট: ০.৫ কেজি)
  selectedVariantId?: string;
  selectedVariantName?: string;
  sellerId: string;         // স্টোর ওনারের আইডি
}

// অর্ডারের মূল ইন্টারফেস
export interface Order {
  id: string;               // ফায়ারস্টোর অর্ডার ডকুমেন্ট আইডি
  orderNumber: string;      // মানুষের পড়ার জন্য ছোট অর্ডার ট্র্যাকিং আইডি (যেমন: ISAR-839210)
  
  // কাস্টমার ইনফো
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // ডেলিভারি এড্রেস ও জোন
  shippingAddress: ShippingAddress;
  deliveryZone?: DeliveryZone;
  
  // অর্ডারের আইটেমসমূহ ও মোট ওজন
  items: OrderItem[];
  totalWeight?: number;     // কেজিতে পার্সেলের মোট ওজন (যেমন: 1.5)
  
  // অর্ডারের আর্থিক হিসাব
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  totalAmount: number;      // সর্বমোট মূল্য (subtotal + deliveryFee - discount)
  
  // অগ্রিম ও ক্যাশ অন ডেলিভারির নিখুঁত হিসাব
  paidAmount: number;       // বিকাশে অগ্রিম দেওয়া টাকা (যেমন: ৳৬০ বা সম্পূর্ণ ৳৫৮০)
  dueAmount: number;        // কুরিয়ার ম্যান কাস্টমারের থেকে ক্যাশ নেবে (যেমন: ৳৫২০ বা ৳০)
  
  // পেমেন্ট গেটওয়ে ট্র্যাকিং ইনফো
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;       // বিকাশ পেমেন্ট আইডি (bKash paymentID)
  transactionId?: string;   // বিকাশ ট্রানজেকশন আইডি (trxID)
  
  // অর্ডার বর্তমান অবস্থা ও ক্যান্সেলেশন হিস্ট্রি
  status: OrderStatus;
  cancelReason?: string;    // অর্ডার ক্যান্সেল হলে তার কারণ
  
  // স্টেডফাস্ট কুরিয়ার ও ট্র্যাকিং তথ্য
  courierName?: string;     // যেমন: 'Steadfast'
  consignmentId?: string;   // কুরিয়ার কনসাইনমেন্ট আইডি
  trackingCode?: string;    // কুরিয়ার পার্সেল ট্র্যাকিং কোড
  trackingUrl?: string;     // সরাসরি লাইভ ট্র্যাকিং লিংক
  shippedAt?: unknown;      // কুরিয়ারে হস্তান্তরের সময়
  
  // ট্র্যাকিং নোট ও হিস্ট্রি টাইমলাইন
  statusHistory?: Array<{
    status: OrderStatus;
    updatedAt: unknown;
    note?: string;
  }>;
  
  createdAt: unknown;       // Firebase Timestamp
  updatedAt: unknown;       // Firebase Timestamp
}