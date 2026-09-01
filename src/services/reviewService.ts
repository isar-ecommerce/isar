import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Review, CreateReviewParams, ProductReviewSummary } from '../types/review';

const reviewsRef = collection(db, 'reviews');

/**
 * কোনো নির্দিষ্ট প্রোডাক্টের সব অনুমোদিত রিভিউ ফায়ারস্টোর থেকে নিয়ে আসার ফাংশন
 */
export const getProductReviews = async (productId: string): Promise<Review[]> => {
  try {
    const q = query(
      reviewsRef, 
      where('productId', '==', productId), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Review[];
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    // ফলব্যাক হিসেবে খালি অ্যারে রিটার্ন
    return [];
  }
};

/**
 * কাস্টমার রিভিউ এবং ছবি সহ ফায়ারস্টোরে সেভ করার ফাংশন
 */
export const submitProductReview = async (params: CreateReviewParams): Promise<Review> => {
  try {
    const newReviewData = {
      productId: params.productId,
      userId: params.userId,
      userName: params.userName,
      userAvatar: params.userAvatar || null,
      rating: Number(params.rating) || 5,
      comment: params.comment.trim(),
      images: params.images || [],
      isVerifiedPurchase: params.isVerifiedPurchase ?? true,
      helpfulCount: 0,
      status: 'approved' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(reviewsRef, newReviewData);

    // প্রোডাক্টের গড় রেটিং ও রিভিউ সংখ্যা রিয়েল-টাইমে আপডেট করা
    try {
      const q = query(reviewsRef, where('productId', '==', params.productId), where('status', '==', 'approved'));
      const snapshot = await getDocs(q);
      const allReviews = snapshot.docs.map((d) => d.data());
      
      const totalRating = allReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
      const avgRating = allReviews.length > 0 ? Number((totalRating / allReviews.length).toFixed(1)) : 5.0;

      const productRef = doc(db, 'products', params.productId);
      await updateDoc(productRef, {
        rating: avgRating,
        reviewCount: allReviews.length,
      });
    } catch (updateErr) {
      console.warn('Product rating update note:', updateErr);
    }

    return {
      id: docRef.id,
      ...newReviewData,
      createdAt: new Date().toISOString(),
    } as Review;
  } catch (error) {
    console.error('Error submitting product review:', error);
    throw error;
  }
};

/**
 * রিভিউ তালিকা থেকে গড় রেটিং এবং স্টার ভিত্তিক ব্রেকডাউন হিসাব করার ফাংশন
 */
export const calculateReviewSummary = (reviews: Review[]): ProductReviewSummary => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[star] = (counts[star] || 0) + 1;
    totalRating += r.rating;
  });

  const averageRating = reviews.length > 0 ? Number((totalRating / reviews.length).toFixed(1)) : 5.0;

  return {
    averageRating,
    totalReviews: reviews.length,
    ratingCounts: counts,
  };
};