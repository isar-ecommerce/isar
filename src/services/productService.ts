import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  Query
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Product, Category } from '../types/product';

// কালেকশন রেফারেন্স
const productsRef = collection(db, 'products');
const categoriesRef = collection(db, 'categories');

/**
 * সব ক্যাটাগরি ফায়ারস্টোর থেকে নিয়ে আসার ফাংশন
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const q = query(categoriesRef, where('status', '==', 'active'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

/**
 * ফিল্টার অপশন দিয়ে প্রোডাক্ট আনার ফাংশন (Search, Category etc.)
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
    // শুধুমাত্র 'active' স্ট্যাটাসের প্রোডাক্টগুলো দেখাবে
    let q: Query<DocumentData> = query(productsRef, where('status', '==', 'active'));

    // ক্যাটাগরি ফিল্টার
    if (filters?.categoryId) {
      q = query(q, where('categoryId', '==', filters.categoryId));
    }
    
    // ফিচারড প্রোডাক্ট ফিল্টার
    if (filters?.isFeatured) {
      q = query(q, where('isFeatured', '==', true));
    }

    // ট্রেন্ডিং ফিল্টার
    if (filters?.isTrending) {
      q = query(q, where('isTrending', '==', true));
    }

    // লিমিট (যেমন: হোম পেজে শুধু ৮টা প্রোডাক্ট দেখানোর জন্য)
    if (filters?.maxLimit) {
      q = query(q, limit(filters.maxLimit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

/**
 * প্রোডাক্টের আইডি দিয়ে একটি নির্দিষ্ট প্রোডাক্টের বিস্তারিত আনার ফাংশন
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
 * প্রোডাক্টের স্লাগ (URL) দিয়ে প্রোডাক্ট আনার ফাংশন (SEO ফ্রেন্ডলি রাউটিং এর জন্য)
 */
export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  try {
    const q = query(productsRef, where('slug', '==', slug), where('status', '==', 'active'), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Product;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    throw error;
  }
};