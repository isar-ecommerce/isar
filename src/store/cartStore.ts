import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../types/product';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariantId?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  deliveryFee: number;
  feeInsideDhaka: number;
  feeOutsideDhaka: number;
  selectedDeliveryZone: 'inside' | 'outside';

  // অ্যাকশনসমূহ
  addItem: (product: Product, quantity?: number, selectedVariantId?: string) => void;
  removeItem: (productId: string, selectedVariantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedVariantId?: string) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => boolean;
  removeCoupon: () => void;
  setDeliveryFee: (fee: number) => void;
  setDeliveryZone: (zone: 'inside' | 'outside') => void;
  syncDeliveryRates: (inside: number, outside: number) => void;

  // ক্যালকুলেশন ফাংশনসমূহ
  getSubtotal: () => number;
  getDiscount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      deliveryFee: 60,
      feeInsideDhaka: 60,
      feeOutsideDhaka: 150,
      selectedDeliveryZone: 'inside',

      // ১. কার্টে নতুন প্রোডাক্ট যুক্ত করা
      addItem: (product, quantity = 1, selectedVariantId) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (item) => item.product.id === product.id && item.selectedVariantId === selectedVariantId
        );

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const newQty = updatedItems[existingIndex].quantity + quantity;
          const maxStock = product.stock;
          updatedItems[existingIndex].quantity = Math.min(newQty, maxStock);
          set({ items: updatedItems });
        } else {
          const initialQty = Math.min(quantity, product.stock);
          set({
            items: [...currentItems, { product, quantity: initialQty, selectedVariantId }],
          });
        }
      },

      // ২. কার্ট থেকে প্রোডাক্ট রিমুভ করা
      removeItem: (productId, selectedVariantId) => {
        set({
          items: get().items.filter(
            (item) => !(item.product.id === productId && item.selectedVariantId === selectedVariantId)
          ),
        });
      },

      // ৩. প্রোডাক্টের পরিমাণ আপডেট করা
      updateQuantity: (productId, quantity, selectedVariantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, selectedVariantId);
          return;
        }

        set({
          items: get().items.map((item) => {
            if (item.product.id === productId && item.selectedVariantId === selectedVariantId) {
              const maxStock = item.product.stock;
              return { ...item, quantity: Math.min(quantity, maxStock) };
            }
            return item;
          }),
        });
      },

      // ৪. কার্ট খালি করা
      clearCart: () => set({ items: [], appliedCoupon: null }),

      // ৫. কুপন এপ্লাই করা
      applyCoupon: (coupon) => {
        const subtotal = get().getSubtotal();
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          return false;
        }
        set({ appliedCoupon: coupon });
        return true;
      },

      // ৬. কুপন রিমুভ করা
      removeCoupon: () => set({ appliedCoupon: null }),

      // ৭. ডেলিভারি চার্জ সরাসরি সেট করা
      setDeliveryFee: (fee) => set({ deliveryFee: fee }),

      // ৮. ডেলিভারি জোন পরিবর্তন করা (Inside Dhaka / Outside Dhaka)
      setDeliveryZone: (zone) => {
        const fee = zone === 'inside' ? get().feeInsideDhaka : get().feeOutsideDhaka;
        set({ selectedDeliveryZone: zone, deliveryFee: fee });
      },

      // ৯. ফায়ারস্টোর অ্যাডমিন সেটিংস থেকে লাইভ ডেলিভারি রেট সিঙ্ক করা
      syncDeliveryRates: (inside, outside) => {
        const currentZone = get().selectedDeliveryZone;
        const fee = currentZone === 'inside' ? inside : outside;
        set({
          feeInsideDhaka: inside,
          feeOutsideDhaka: outside,
          deliveryFee: fee,
        });
      },

      // ১০. সাবটোটাল হিসাব
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },

      // ১১. ডিসকাউন্ট হিসাব
      getDiscount: () => {
        const subtotal = get().getSubtotal();
        const coupon = get().appliedCoupon;

        if (!coupon) return 0;

        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else if (coupon.discountType === 'fixed') {
          discount = coupon.discountValue;
        }

        return Math.min(discount, subtotal);
      },

      // ১২. সর্বমোট প্রদেয় টাকা (Total)
      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const deliveryFee = get().deliveryFee;
        return Math.max(0, subtotal - discount + (subtotal > 0 ? deliveryFee : 0));
      },

      // ১৩. মোট আইটেম কাউন্ট
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'isar-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);