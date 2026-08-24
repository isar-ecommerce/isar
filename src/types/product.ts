// প্রোডাক্টের ভ্যারিয়েন্ট (যেমন: সাইজ, কালার বা মডেল) এর টাইপ
export interface ProductVariant {
  id: string;
  name: string; // যেমন: "Red - XL", "128GB - Blue"
  color?: string; // HEX কোড বা নাম
  size?: string;
  price?: number; // ভ্যারিয়েন্টের কারণে দাম পরিবর্তন হলে
  stock: number;
  sku: string;
}

// প্রোডাক্টের স্পেসিফিকেশন (যেমন: RAM: 8GB, Processor: Snapdragon)
export interface ProductSpecification {
  key: string;
  value: string;
}

// প্রোডাক্টের SEO (Search Engine Optimization) মেটা ডেটা
export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
}

// মূল প্রোডাক্ট ইন্টারফেস
export interface Product {
  id: string;                // ফায়ারস্টোর ডকুমেন্ট আইডি
  name: string;              // প্রোডাক্টের নাম
  slug: string;              // প্রোডাক্টের URL (যেমন: samsung-galaxy-s24)
  shortDescription: string;  // ছোট বিবরণ
  description: string;       // বিস্তারিত বিবরণ (Rich Text HTML)
  
  price: number;             // বর্তমান বিক্রয়মূল্য
  originalPrice?: number;    // আগের দাম (ডিসকাউন্ট দেখানোর জন্য)
  
  stock: number;             // মোট স্টক
  lowStockAlert: number;     // কত পিস থাকলে লো-স্টক এলার্ট দেবে
  sku: string;               // প্রোডাক্টের ইউনিক কোড
  
  categoryId: string;        // ক্যাটাগরির আইডি
  subcategoryId?: string;    // সাবক্যাটাগরির আইডি (ঐচ্ছিক)
  brandId?: string;          // ব্র্যান্ডের আইডি (ঐচ্ছিক)
  
  images: string[];          // Cloudinary ইমেজের URL গুলোর অ্যারে (প্রথমটি মেইন ইমেজ)
  videoUrl?: string;         // Cloudinary ভিডিও URL (ঐচ্ছিক)
  
  variants?: ProductVariant[]; // প্রোডাক্টের ভ্যারিয়েন্ট (ঐচ্ছিক)
  specifications?: ProductSpecification[]; // প্রোডাক্টের স্পেসিফিকেশন
  
  status: 'active' | 'draft' | 'out-of-stock'; // প্রোডাক্টের বর্তমান অবস্থা
  
  // লেবেল ও ব্যাজ
  isFeatured: boolean;       // হোম পেজে ফিচারড হিসেবে দেখানোর জন্য
  isTrending: boolean;       // ট্রেন্ডিং প্রোডাক্ট হিসেবে দেখানোর জন্য
  isNewArrival: boolean;     // নতুন প্রোডাক্ট হিসেবে দেখানোর জন্য
  
  // রেটিং ও রিভিউ
  rating: number;            // গড় রেটিং (০ থেকে ৫)
  reviewCount: number;       // মোট রিভিউয়ের সংখ্যা
  
  // মাল্টি-ভেন্ডর সিস্টেমের জন্য (ভবিষ্যতের জন্য প্রস্তুত)
  sellerId: string;          // যে সেলার প্রোডাক্টটি আপলোড করেছে তার আইডি (Admin হলে admin id)
  
  seo?: ProductSEO;          // এসইও ডেটা
  
  createdAt: unknown;            // Firebase Timestamp
  updatedAt: unknown
  ;            // Firebase Timestamp
}

// ক্যাটাগরি ইন্টারফেস
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;             // Cloudinary আইকন URL বা lucide আইকনের নাম
  image?: string;            // ক্যাটাগরির ব্যানার ইমেজ
  parentId?: string;         // সাবক্যাটাগরি হলে মেইন ক্যাটাগরির আইডি
  status: 'active' | 'inactive';
  order: number;             // সাজানোর ক্রম
}