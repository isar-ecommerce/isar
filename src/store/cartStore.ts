import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '../types/product';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariantId?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiryDate?: string;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  deliveryFee: number;
  feeInsideDhaka: number;
  feeOutsideDhaka: number;
  selectedDeliveryZone: 'inside' | 'outside';

  // Actions
  addItem: (product: Product, quantity?: number, selectedVariantId?: string) => void;
  removeItem: (productId: string, selectedVariantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedVariantId?: string) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => boolean;
  removeCoupon: () => void;
  setDeliveryFee: (fee: number) => void;
  setDeliveryZone: (zone: 'inside' | 'outside') => void;
  syncDeliveryRates: (inside: number, outside: number) => void;

  // Calculation helpers
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
      deliveryFee: 70,
      feeInsideDhaka: 70,
      feeOutsideDhaka: 130,
      selectedDeliveryZone: 'inside',

      addItem: (product, quantity = 1, selectedVariantId) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex(
          (item) => item.product.id === product.id && item.selectedVariantId === selectedVariantId
        );
        const maxStock = Math.max(1, product.stock || 1);

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const currentQty = updatedItems[existingIndex].quantity;
          const newQty = Math.min(currentQty + quantity, maxStock);
          updatedItems[existingIndex].quantity = newQty;
          set({ items: updatedItems });
        } else {
          const initialQty = Math.min(Math.max(1, quantity), maxStock);
          set({
            items: [...currentItems, { product, quantity: initialQty, selectedVariantId }],
          });
        }
      },

      // ২. আইটেম মুছলে কুপন নিয়ম অটো-ভ্যালিডেট হওয়া (#22)
      removeItem: (productId, selectedVariantId) => {
        const remainingItems = get().items.filter(
          (item) => !(item.product.id === productId && item.selectedVariantId === selectedVariantId)
        );
        const newSubtotal = remainingItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

        const currentCoupon = get().appliedCoupon;
        // যদি আইটেম মুছে ফেলার পর সাবটোটাল কুপনের মিনিমাম টাকার নিচে নেমে যায়, কুপন নিজে থেকেই সরে যাবে
        const validCoupon = currentCoupon && currentCoupon.minOrderAmount && newSubtotal < currentCoupon.minOrderAmount
          ? null 
          : currentCoupon;

        set({
          items: remainingItems,
          appliedCoupon: validCoupon,
        });
      },

      // ৩. কোয়ান্টিটি পরিবর্তনের সাথে কুপনের শর্ত অটো-ভ্যালিডেট হওয়া (#22)
      updateQuantity: (productId, quantity, selectedVariantId) => {
        const updatedItems = get().items.map((item) => {
          if (item.product.id === productId && item.selectedVariantId === selectedVariantId) {
            const maxStock = Math.max(1, item.product.stock || 1);
            const safeQuantity = Math.max(1, Math.min(quantity, maxStock));
            return { ...item, quantity: safeQuantity };
          }
          return item;
        });

        const newSubtotal = updatedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
        const currentCoupon = get().appliedCoupon;
        const validCoupon = currentCoupon && currentCoupon.minOrderAmount && newSubtotal < currentCoupon.minOrderAmount
          ? null 
          : currentCoupon;

        set({
          items: updatedItems,
          appliedCoupon: validCoupon,
        });
      },

      clearCart: () => set({ items: [], appliedCoupon: null }),

      applyCoupon: (coupon) => {
        const subtotal = get().getSubtotal();
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          return false;
        }
        set({ appliedCoupon: coupon });
        return true;
      },

      removeCoupon: () => set({ appliedCoupon: null }),

      setDeliveryFee: (fee) => set({ deliveryFee: fee }),

      setDeliveryZone: (zone) => {
        const fee = zone === 'inside' ? get().feeInsideDhaka : get().feeOutsideDhaka;
        set({ selectedDeliveryZone: zone, deliveryFee: fee });
      },

      syncDeliveryRates: (inside, outside) => {
        const currentZone = get().selectedDeliveryZone;
        const fee = currentZone === 'inside' ? inside : outside;
        set({
          feeInsideDhaka: inside,
          feeOutsideDhaka: outside,
          deliveryFee: fee,
        });
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
      },

      // কুপন ডিসকাউন্ট হিসাব (#22)
      getDiscount: () => {
        const subtotal = get().getSubtotal();
        const coupon = get().appliedCoupon;

        if (!coupon) return 0;

        // মিনিমাম টাকার নিচে থাকলে ডিসকাউন্ট ০
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          return 0;
        }

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

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscount();
        const deliveryFee = get().deliveryFee;
        return Math.max(0, subtotal - discount + (subtotal > 0 ? deliveryFee : 0));
      },

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