import { 
  collection, 
  getDocs, 
  getDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Product, Category } from '../types/product';

// কালেকশন রেফারেন্স
const productsRef = collection(db, 'products');
const categoriesRef = collection(db, 'categories');

/**
 * ফায়ারস্টোর থেকে সব ক্যাটাগরি নিরাপদে লোড করার ফাংশন (Zero-Index Crash Protection)
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    // কোনো কম্পোজিট ইনডেক্স ছাড়াই সরাসরি সব ক্যাটাগরি লোড
    const snapshot = await getDocs(categoriesRef);
    const list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Category[];

    // জাভাস্ক্রিপ্ট মেমোরিতে নিখুঁত ফিল্টার ও সাজানো
    return list
      .filter(cat => cat.status === 'active')
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  } catch (error) {
    console.error("Error fetching categories from Firestore:", error);
    throw error;
  }
};

/**
 * ফিল্টার অপশন দিয়ে প্রোডাক্ট আনার ফাংশন
 */
export interface ProductFilters {
  categoryId?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  maxLimit?: number;
}

export const getProducts = async (filters?: ProductFilters): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(productsRef);
    let list = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Product[];

    // ১. একটিভ প্রোডাক্ট ফিল্টার
    list = list.filter(p => !p.status || p.status === 'active');

    // ২. ক্যাটাগরি ফিল্টার
    if (filters?.categoryId && filters.categoryId !== 'all') {
      const catId = filters.categoryId.toLowerCase();
      list = list.filter(p => 
        p.categoryId?.toLowerCase() === catId || 
        (p as { categoryName?: string }).categoryName?.toLowerCase() === catId
      );
    }
    
    // ৩. ফিচারড প্রোডাক্ট ফিল্টার
    if (filters?.isFeatured) {
      list = list.filter(p => p.isFeatured === true);
    }

    // ৪. ট্রেন্ডিং ফিল্টার
    if (filters?.isTrending) {
      list = list.filter(p => p.isTrending === true);
    }

    // ৫. নিউ অ্যারাইভাল ফিল্টার
    if (filters?.isNewArrival) {
      list = list.filter(p => p.isNewArrival === true);
    }

    // ৬. ম্যাক্সিমাম লিমিট
    if (filters?.maxLimit && filters.maxLimit > 0) {
      list = list.slice(0, filters.maxLimit);
    }

    return list;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

/**
 * প্রোডাক্টের আইডি দিয়ে বিস্তারিত তথ্য পাওয়ার ফাংশন
 */
export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', productId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by id:", error);
    throw error;
  }
};

/**
 * প্রোডাক্টের স্লাগ (URL) দিয়ে প্রোডাক্ট খোঁজার ফাংশন
 */
export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  try {
    const snapshot = await getDocs(productsRef);
    const foundDoc = snapshot.docs.find(d => d.data().slug === slug && d.data().status === 'active');

    if (foundDoc) {
      return { id: foundDoc.id, ...foundDoc.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    throw error;
  }
};