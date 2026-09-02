export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'inactive' | 'expired';

// মূল কুপন ডেটাবেস ইন্টারফেস
export interface Coupon {
  id: string;                      // ফায়ারস্টোর ডকুমেন্ট আইডি
  code: string;                    // কুপন কোড (যেমন: EID2026, ISAR100)
  description?: string;            // কুপনের সংক্ষিপ্ত বিবরণ
  discountType: CouponDiscountType;// 'percentage' (%) অথবা 'fixed' (৳)
  discountValue: number;           // কত পারসেন্ট বা কত টাকা ছাড়
  minOrderAmount: number;          // কুপন ব্যবহারের জন্য সর্বনিম্ন অর্ডার মূল্য
  maxDiscountAmount?: number;      // পারসেন্টেজ ডিসকাউন্টের ক্ষেত্রে সর্বোচ্চ ছাড়ের সীমা (ক্যাপ)
  usageLimit?: number;             // মোট কতজন এই কুপন ব্যবহার করতে পারবে
  usedCount: number;               // এ পর্যন্ত কতবার ব্যবহার করা হয়েছে
  expiryDate: unknown;             // মেয়াদোত্তীর্ণের তারিখ
  status: CouponStatus;            // 'active' | 'inactive' | 'expired'
  createdAt?: unknown;             // তৈরির সময়
  updatedAt?: unknown;             // আপডেটের সময়
}

// নতুন কুপন তৈরি করার প্যারামিটার টাইপ
export interface CreateCouponParams {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  expiryDate: string | Date;
}

// কুপন ভ্যালিডেশন রেজাল্ট টাইপ
export interface ValidateCouponResult {
  isValid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  message: string;
}