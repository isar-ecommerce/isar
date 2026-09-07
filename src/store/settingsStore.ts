import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface SettingsState {
  logoType: 'text' | 'image';
  logoUrl: string;
  siteName: string;
  siteTagline?: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber?: string;
  officeAddress: string;
  feeInsideDhaka: number;
  feeOutsideDhaka: number;
  freeShippingMinAmount?: number;
  flashSaleActive: boolean;
  flashSaleTitle: string;
  flashSaleDiscountText: string;
  flashSaleEndTime: string;
  facebookUrl: string;
  instagramUrl: string;
  isLoaded: boolean;
  language: 'en' | 'bn';

  setLanguage: (lang: 'en' | 'bn') => void;
  setSettings: (newSettings: Partial<SettingsState>) => void;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      logoType: 'text',
      logoUrl: '',
      siteName: 'ISAR',
      siteTagline: 'Premium Bags, Smart Accessories & Lifestyle Gear',
      contactEmail: 'isar.store.bd@gmail.com',
      contactPhone: '+880 1624789764',
      whatsappNumber: '+880 1624789764',
      officeAddress: 'Dhaka, Bangladesh',
      feeInsideDhaka: 70,
      feeOutsideDhaka: 130,
      freeShippingMinAmount: 5000,
      flashSaleActive: true,
      flashSaleTitle: 'Flash Sale Offers',
      flashSaleDiscountText: 'Up to 50% Off',
      flashSaleEndTime: '2026-12-31T23:59',
      facebookUrl: 'https://facebook.com',
      instagramUrl: 'https://instagram.com',
      isLoaded: true,
      language: 'en',

      setLanguage: (lang: 'en' | 'bn') => set({ language: lang }),
      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),

      // ফায়ারস্টোর থেকে অ্যাডমিনের দেওয়া আসল সেটিংস সরাসরি লোড করা
      fetchSettings: async () => {
        try {
          const docRef = doc(db, 'settings', 'general');
          const snapshot = await getDoc(docRef);

          if (snapshot.exists()) {
            const data = snapshot.data();
            set({
              logoType: data.logoType || 'text',
              logoUrl: data.logoUrl || '',
              siteName: data.siteName || 'ISAR',
              siteTagline: data.siteTagline || 'Premium Bags, Smart Accessories & Lifestyle Gear',
              contactEmail: data.contactEmail || 'isar.store.bd@gmail.com',
              contactPhone: data.contactPhone || '+880 1624789764',
              whatsappNumber: data.whatsappNumber || data.contactPhone || '+880 1624789764',
              officeAddress: data.officeAddress || 'Dhaka, Bangladesh',
              feeInsideDhaka: data.feeInsideDhaka !== undefined ? Number(data.feeInsideDhaka) : 70,
              feeOutsideDhaka: data.feeOutsideDhaka !== undefined ? Number(data.feeOutsideDhaka) : 130,
              freeShippingMinAmount: data.freeShippingMinAmount !== undefined ? Number(data.freeShippingMinAmount) : 5000,
              flashSaleActive: data.flashSaleActive !== undefined ? data.flashSaleActive : true,
              flashSaleTitle: data.flashSaleTitle || 'Flash Sale Offers',
              flashSaleDiscountText: data.flashSaleDiscountText || 'Up to 50% Off',
              flashSaleEndTime: data.flashSaleEndTime || '2026-12-31T23:59',
              facebookUrl: data.facebookUrl || 'https://facebook.com',
              instagramUrl: data.instagramUrl || 'https://instagram.com',
              isLoaded: true,
            });
          }
        } catch (error) {
          console.error('Error fetching global settings in store:', error);
        }
      },
    }),
    {
      name: 'isar-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);