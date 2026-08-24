import type { LucideIcon } from 'lucide-react';
import { 
  Smartphone, 
  Monitor, 
  Watch, 
  Headphones, 
  Camera, 
  Shirt, 
  ShoppingBag, 
  Footprints, 
  BookOpen, 
  Sparkles, 
  Utensils, 
  Home, 
  Gem, 
  Cpu, 
  Baby, 
  Dumbbell, 
  FolderTree 
} from 'lucide-react';

export interface CategoryIconConfig {
  icon: LucideIcon;
  color: string;
}

/**
 * ক্যাটাগরির নাম বা স্লাগ অনুযায়ী স্বয়ংক্রিয়ভাবে মানানসই আইকন ও থিম কালার রিটার্ন করার স্মার্ট ইঞ্জিন
 */
export const getCategoryIconConfig = (nameOrSlug: string = ''): CategoryIconConfig => {
  const query = nameOrSlug.toLowerCase().trim();

  // ১. ব্যাগ ও লাগেজ
  if (query.includes('bag') || query.includes('backpack') || query.includes('luggage') || query.includes('ব্যাগ')) {
    return { icon: ShoppingBag, color: 'bg-indigo-100 text-indigo-600' };
  }

  // ২. মোবাইল ও স্মার্টফোন
  if (query.includes('phone') || query.includes('mobile') || query.includes('smartphone') || query.includes('মোবাইল')) {
    return { icon: Smartphone, color: 'bg-blue-100 text-blue-600' };
  }

  // ৩. কম্পিউটার ও ল্যাপটপ
  if (query.includes('laptop') || query.includes('computer') || query.includes('pc') || query.includes('ল্যাপটপ')) {
    return { icon: Monitor, color: 'bg-purple-100 text-purple-600' };
  }

  // ৪. ঘড়ি
  if (query.includes('watch') || query.includes('clock') || query.includes('ঘড়ি') || query.includes('ঘড়ি')) {
    return { icon: Watch, color: 'bg-amber-100 text-amber-600' };
  }

  // ৫. হেডফোন ও অডিও
  if (query.includes('audio') || query.includes('headphone') || query.includes('earphone') || query.includes('speaker') || query.includes('হেডফোন')) {
    return { icon: Headphones, color: 'bg-red-100 text-red-600' };
  }

  // ৬. ক্যামেরা ও ফটোগ্রাফি
  if (query.includes('camera') || query.includes('photo') || query.includes('video') || query.includes('ক্যামেরা')) {
    return { icon: Camera, color: 'bg-emerald-100 text-emerald-600' };
  }

  // ৭. জামাকাপড় ও ফ্যাশন
  if (query.includes('fashion') || query.includes('shirt') || query.includes('pant') || query.includes('dress') || query.includes('cloth') || query.includes('পোশাক')) {
    return { icon: Shirt, color: 'bg-pink-100 text-pink-600' };
  }

  // ৮. জুতা
  if (query.includes('shoe') || query.includes('footwear') || query.includes('sneaker') || query.includes('sandal') || query.includes('জুতা')) {
    return { icon: Footprints, color: 'bg-orange-100 text-orange-600' };
  }

  // ৯. বই ও স্টেশনারি
  if (query.includes('book') || query.includes('stationery') || query.includes('বই') || query.includes('খাতা')) {
    return { icon: BookOpen, color: 'bg-teal-100 text-teal-600' };
  }

  // ১০. বিউটি ও কসমেটিক্স
  if (query.includes('beauty') || query.includes('cosmetic') || query.includes('makeup') || query.includes('skin')) {
    return { icon: Sparkles, color: 'bg-rose-100 text-rose-600' };
  }

  // ১১. খাবার, মধু ও গ্রোসারি
  if (query.includes('food') || query.includes('grocery') || query.includes('honey') || query.includes('organic') || query.includes('খাবার') || query.includes('মধু')) {
    return { icon: Utensils, color: 'bg-lime-100 text-lime-700' };
  }

  // ১২. ফার্নিচার ও হোম
  if (query.includes('home') || query.includes('furniture') || query.includes('bed') || query.includes('chair')) {
    return { icon: Home, color: 'bg-cyan-100 text-cyan-700' };
  }

  // ১৩. গহনা ও জুয়েলারি
  if (query.includes('jewel') || query.includes('ring') || query.includes('gold') || query.includes('diamond')) {
    return { icon: Gem, color: 'bg-yellow-100 text-yellow-700' };
  }

  // ১৪. গ্যাজেট ও ইলেকট্রনিক্স
  if (query.includes('gadget') || query.includes('electronic') || query.includes('device') || query.includes('chip')) {
    return { icon: Cpu, color: 'bg-violet-100 text-violet-600' };
  }

  // ১৫. বাচ্চা ও খেলনা
  if (query.includes('baby') || query.includes('kid') || query.includes('toy') || query.includes('বাচ্চা')) {
    return { icon: Baby, color: 'bg-sky-100 text-sky-600' };
  }

  // ১৬. স্পোর্টস ও জিম
  if (query.includes('sport') || query.includes('gym') || query.includes('fitness')) {
    return { icon: Dumbbell, color: 'bg-stone-200 text-stone-700' };
  }

  // ডিফল্ট ক্যাটাগরি আইকন
  return { icon: FolderTree, color: 'bg-blue-100 text-blue-600' };
};