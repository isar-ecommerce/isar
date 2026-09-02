import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Coupon, CreateCouponParams, ValidateCouponResult } from '../types/coupon';

const couponsRef = collection(db, 'coupons');

/**
 * ফায়ারস্টোর থেকে সব কুপন তালিকা নিয়ে আসার ফাংশন
 */
export const getCoupons = async (): Promise<Coupon[]> => {
  try {
    const q = query(couponsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Coupon[];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
};

/**
 * নতুন কুপন তৈরি করার ফাংশন
 */
export const createCoupon = async (params: CreateCouponParams): Promise<Coupon> => {
  try {
    const cleanCode = params.code.trim().toUpperCase();

    // একই কোডের কুপন আগে থেকে আছে কি না চেক করা
    const existingQuery = query(couponsRef, where('code', '==', cleanCode));
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      throw new Error(`Coupon with code "${cleanCode}" already exists.`);
    }

    const newCouponData = {
      code: cleanCode,
      description: params.description?.trim() || '',
      discountType: params.discountType,
      discountValue: Number(params.discountValue) || 0,
      minOrderAmount: Number(params.minOrderAmount) || 0,
      maxDiscountAmount: params.maxDiscountAmount ? Number(params.maxDiscountAmount) : null,
      usageLimit: params.usageLimit ? Number(params.usageLimit) : null,
      usedCount: 0,
      expiryDate: new Date(params.expiryDate).toISOString(),
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(couponsRef, newCouponData);

    return {
      id: docRef.id,
      ...newCouponData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Coupon;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

/**
 * কুপন স্ট্যাটাস পরিবর্তন (Active / Inactive) করার ফাংশন
 */
export const updateCouponStatus = async (couponId: string, newStatus: 'active' | 'inactive'): Promise<void> => {
  try {
    const couponDocRef = doc(db, 'coupons', couponId);
    await updateDoc(couponDocRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating coupon status:', error);
    throw error;
  }
};

/**
 * কুপন ডিলিট করার ফাংশন
 */
export const deleteCoupon = async (couponId: string): Promise<void> => {
  try {
    const couponDocRef = doc(db, 'coupons', couponId);
    await deleteDoc(couponDocRef);
  } catch (error) {
    console.error('Error deleting coupon:', error);
    throw error;
  }
};

/**
 * চেকআউটে কুপন কোড যাচাই ও স্বয়ংক্রিয় ডিসকাউন্ট ক্যালকুলেট করার ফাংশন
 */
export const validateCouponCode = async (
  code: string, 
  currentCartTotal: number
): Promise<ValidateCouponResult> => {
  try {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { isValid: false, discountAmount: 0, message: 'Please enter a coupon code.' };
    }

    const q = query(couponsRef, where('code', '==', cleanCode), where('status', '==', 'active'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { isValid: false, discountAmount: 0, message: 'Invalid or inactive coupon code.' };
    }

    const couponDoc = snapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

    // ১. মেয়াদোত্তীর্ণের তারিখ চেক করা
    if (coupon.expiryDate) {
      const expiry = new Date(coupon.expiryDate as string | number | Date);
      if (expiry.getTime() < Date.now()) {
        return { isValid: false, discountAmount: 0, message: 'This coupon has expired.' };
      }
    }

    // ২. ব্যবহার সীমা (Usage Limit) চেক করা
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
      return { isValid: false, discountAmount: 0, message: 'This coupon usage limit has been reached.' };
    }

    // ৩. সর্বনিম্ন অর্ডার মূল্য (Minimum Order Amount) চেক করা
    if (coupon.minOrderAmount && currentCartTotal < coupon.minOrderAmount) {
      return { 
        isValid: false, 
        discountAmount: 0, 
        message: `Minimum order amount of ৳${coupon.minOrderAmount.toLocaleString()} is required to use this coupon.` 
      };
    }

    // ৪. ডিসকাউন্ট হিসাব করা
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (currentCartTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed flat discount
      discount = coupon.discountValue;
    }

    // ডিসকাউন্ট যেন কার্ট টোটালের চেয়ে বেশি না হয়
    discount = Math.min(discount, currentCartTotal);
    discount = Math.round(discount);

    return {
      isValid: true,
      coupon,
      discountAmount: discount,
      message: `Coupon "${coupon.code}" applied! You saved ৳${discount.toLocaleString()}`,
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { isValid: false, discountAmount: 0, message: 'Error checking coupon. Please try again.' };
  }
};

/**
 * অর্ডার সম্পন্ন হলে কুপন ব্যবহারের সংখ্যা (+১) বাড়ানোর ফাংশন
 */
export const incrementCouponUsage = async (couponId: string): Promise<void> => {
  try {
    const couponDocRef = doc(db, 'coupons', couponId);
    await updateDoc(couponDocRef, {
      usedCount: increment(1),
    });
  } catch (error) {
    console.warn('Coupon usage increment note:', error);
  }
};