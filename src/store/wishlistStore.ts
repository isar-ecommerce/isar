import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../types/product';

interface WishlistState {
  items: Product[];

  // অ্যাকশনসমূহ
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (product: Product) => boolean; // যুক্ত হলে true, রিমুভ হলে false রিটার্ন করবে
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getWishlistCount: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      // ১. উইশলিস্টে প্রোডাক্ট যোগ করা
      addToWishlist: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        if (!exists) {
          set({ items: [...get().items, product] });
        }
      },

      // ২. উইশলিস্ট থেকে প্রোডাক্ট রিমুভ করা
      removeFromWishlist: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId),
        });
      },

      // ৩. এক ক্লিকে টগল করা (থাকলে বাদ দেবে, না থাকলে যুক্ত করবে)
      toggleWishlist: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        if (exists) {
          get().removeFromWishlist(product.id);
          return false;
        } else {
          get().addToWishlist(product);
          return true;
        }
      },

      // ৪. চেক করা কোনো প্রোডাক্ট উইশলিস্টে আছে কিনা
      isInWishlist: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      // ৫. পুরো উইশলিস্ট ক্লিয়ার করা
      clearWishlist: () => set({ items: [] }),

      // ৬. মোট কয়টি পছন্দের প্রোডাক্ট উইশলিস্টে আছে
      getWishlistCount: () => get().items.length,
    }),
    {
      name: 'isar-wishlist-storage', // localStorage key-এর নাম
      storage: createJSONStorage(() => localStorage),
    }
  )
);