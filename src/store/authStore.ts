import { create } from 'zustand';

// আমাদের প্রজেক্টের রিকোয়ারমেন্ট অনুযায়ী ইউজারের বিভিন্ন রোল
export type UserRole = 'customer' | 'seller' | 'admin' | 'super_admin';

// ইউজারের ডেটার টাইপ ডিফাইন করা হলো
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phoneNumber: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // স্টেট পরিবর্তন করার অ্যাকশনগুলো
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // শুরুতে true থাকবে, যতক্ষণ না Firebase চেক করে ইউজার লগইন আছে কিনা
  
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user, 
    isLoading: false 
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    isLoading: false 
  }),
}));