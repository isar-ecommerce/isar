export type ReviewStatus = 'approved' | 'pending' | 'hidden';

// মূল কাস্টমার রিভিউ ইন্টারফেস
export interface Review {
  id: string;                 // ফায়ারস্টোর ডকুমেন্ট আইডি
  productId: string;          // যে প্রোডাক্টের ওপর রিভিউ দেওয়া হয়েছে
  userId: string;             // কাস্টমারের ইউজার আইডি
  userName: string;           // কাস্টমারের নাম
  userAvatar?: string;        // কাস্টমারের প্রোফাইল ছবি
  rating: number;             // ১ থেকে ৫ স্টার রেটিং
  comment: string;            // কাস্টমারের লেখা রিভিউ
  images?: string[];          // কাস্টমারের তোলা আসল পণ্যের ফটোগুলো
  isVerifiedPurchase: boolean;// আসল ক্রেতা হলে 'Verified Purchase' ব্যাজ
  helpfulCount: number;       // অন্য কাস্টমারদের লাইক/আপভোট
  status: ReviewStatus;       // রিভিউ স্ট্যাটাস
  createdAt: unknown;         // ফায়ারস্টোর টাইমস্ট্যাম্প
}

// নতুন রিভিউ সাবমিট করার প্যারামিটার টাইপ
export interface CreateReviewParams {
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  isVerifiedPurchase?: boolean;
}

// প্রোডাক্টের রেটিং সামারি ও ব্রেকডাউন ইন্টারফেস
export interface ProductReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}