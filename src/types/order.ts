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

// পেমেন্ট স্ট্যাটাস
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

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
  selectedVariantId?: string;
  selectedVariantName?: string;
  sellerId: string;         // মাল্টি-ভেন্ডর সিস্টেমের জন্য
}

// অর্ডারের মূল ইন্টারফেস
export interface Order {
  id: string;               // ফায়ারস্টোর অর্ডার নম্বর (যেমন: ISAR-839210)
  orderNumber: string;      // মানুষের পড়ার জন্য ছোট অর্ডার ট্র্যাকিং আইডি
  
  // কাস্টমার ইনফো
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // ডেলিভারি এড্রেস
  shippingAddress: ShippingAddress;
  
  // অর্ডারের আইটেমসমূহ
  items: OrderItem[];
  
  // অর্ডারের হিসাব
  subtotal: number;
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  totalAmount: number;
  
  // পেমেন্ট ইনফো
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;   // bKash/Nagad বা অনলাইন পেমেন্ট ট্রানজেকশন আইডি
  
  // অর্ডার বর্তমান অবস্থা
  status: OrderStatus;
  
  // কুরিয়ার ও ট্র্যাকিং তথ্য
  courierName?: string;     // যেমন: 'Steadfast' | 'Pathao' | 'RedX'
  consignmentId?: string;   // কুরিয়ার কনসাইনমেন্ট আইডি
  trackingCode?: string;    // কুরিয়ার পার্সেল ট্র্যাকিং কোড
  trackingUrl?: string;     // সরাসরি ট্র্যাকিং লিংক
  shippedAt?: unknown;      // কুরিয়ারে হস্তান্তরের সময়
  
  // ট্র্যাকিং নোট ও হিস্ট্রি
  statusHistory?: Array<{
    status: OrderStatus;
    updatedAt: unknown;
    note?: string;
  }>;
  
  createdAt: unknown;       // Firebase Timestamp
  updatedAt: unknown;       // Firebase Timestamp
}