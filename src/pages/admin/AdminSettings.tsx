import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Settings, 
  Save, 
  Loader2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Truck, 
  Share2, 
  ShieldCheck, 
  Flame, 
  Calendar, 
  Upload, 
  Trash2, 
  ImageIcon,
  MessageCircle,
  Sparkles,
  Server,
  CheckCircle2
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { useSettingsStore } from '../../store/settingsStore';

/**
 * ব্র্যান্ড লোগোকে স্ট্যান্ডার্ড ওয়েব সাইজে (Max 400x160px) অপটিমাইজ করার ফাংশন
 */
const optimizeLogoImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 400;
        const maxHeight = 160;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedBase64 = canvas.toDataURL('image/png', 0.95);
        resolve(optimizedBase64);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function AdminSettings() {
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const updateGlobalStore = useSettingsStore((state) => state.setSettings);

  // ব্র্যান্ড লোগো স্টেট
  const [logoType, setLogoType] = useState<'text' | 'image'>('text');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // স্টোর আইডেন্টিটি স্টেট
  const [siteName, setSiteName] = useState<string>('ISAR');
  const [siteTagline, setSiteTagline] = useState<string>("Bangladesh's Premier E-commerce Marketplace");
  const [contactEmail, setContactEmail] = useState<string>('support@isar.com.bd');
  const [contactPhone, setContactPhone] = useState<string>('+880 1234 567890');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('+880 1234 567890');
  const [officeAddress, setOfficeAddress] = useState<string>('Dhaka, Bangladesh');
  
  // ডেলিভারি চার্জ স্টেট
  const [feeInsideDhaka, setFeeInsideDhaka] = useState<number>(60);
  const [feeOutsideDhaka, setFeeOutsideDhaka] = useState<number>(150);
  const [freeShippingMinAmount, setFreeShippingMinAmount] = useState<number>(5000);

  // সোশ্যাল মিডিয়া লিংক
  const [facebookUrl, setFacebookUrl] = useState<string>('https://facebook.com');
  const [instagramUrl, setInstagramUrl] = useState<string>('https://instagram.com');

  // ফ্ল্যাশ সেল স্টেট
  const [flashSaleActive, setFlashSaleActive] = useState<boolean>(true);
  const [flashSaleTitle, setFlashSaleTitle] = useState<string>('Flash Sale Offers');
  const [flashSaleDiscountText, setFlashSaleDiscountText] = useState<string>('Up to 50% Off');
  const [flashSaleEndTime, setFlashSaleEndTime] = useState<string>('2026-12-31T23:59');

  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ফায়ারস্টোর থেকে গ্লোবাল সেটিংস লোড করা (React 19 সেফ)
  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snapshot = await getDoc(docRef);

        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          
          if (data.logoType) setLogoType(data.logoType);
          if (data.logoUrl) setLogoUrl(data.logoUrl);

          if (data.siteName) setSiteName(data.siteName);
          if (data.siteTagline) setSiteTagline(data.siteTagline);
          if (data.contactEmail) setContactEmail(data.contactEmail);
          if (data.contactPhone) setContactPhone(data.contactPhone);
          if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
          if (data.officeAddress) setOfficeAddress(data.officeAddress);
          
          if (data.feeInsideDhaka !== undefined) setFeeInsideDhaka(Number(data.feeInsideDhaka));
          if (data.feeOutsideDhaka !== undefined) setFeeOutsideDhaka(Number(data.feeOutsideDhaka));
          if (data.freeShippingMinAmount !== undefined) setFreeShippingMinAmount(Number(data.freeShippingMinAmount));
          
          if (data.facebookUrl) setFacebookUrl(data.facebookUrl);
          if (data.instagramUrl) setInstagramUrl(data.instagramUrl);

          if (data.flashSaleActive !== undefined) setFlashSaleActive(data.flashSaleActive);
          if (data.flashSaleTitle) setFlashSaleTitle(data.flashSaleTitle);
          if (data.flashSaleDiscountText) setFlashSaleDiscountText(data.flashSaleDiscountText);
          if (data.flashSaleEndTime) setFlashSaleEndTime(data.flashSaleEndTime);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchSettings();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // লোগো ছবি আপলোড হ্যান্ডলার
  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingLogo(true);
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file (PNG, JPG, SVG)');
        return;
      }

      const optimizedLogo = await optimizeLogoImage(file);
      setLogoUrl(optimizedLogo);
      setLogoType('image');
      toast.success('Brand logo processed & ready to save!');
    } catch (error: unknown) {
      console.error('Logo upload error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to process logo');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      const docRef = doc(db, 'settings', 'general');

      const firestorePayload = {
        logoType,
        logoUrl: logoUrl || '',
        siteName: siteName.trim() || 'ISAR',
        siteTagline: siteTagline.trim() || "Bangladesh's Premier E-commerce Marketplace",
        contactEmail: contactEmail.trim() || 'support@isar.com.bd',
        contactPhone: contactPhone.trim() || '+880 1234 567890',
        whatsappNumber: whatsappNumber.trim() || contactPhone.trim() || '+880 1234 567890',
        officeAddress: officeAddress.trim() || 'Dhaka, Bangladesh',
        feeInsideDhaka: Number(feeInsideDhaka) || 0,
        feeOutsideDhaka: Number(feeOutsideDhaka) || 0,
        freeShippingMinAmount: Number(freeShippingMinAmount) || 0,
        facebookUrl: facebookUrl.trim() || 'https://facebook.com',
        instagramUrl: instagramUrl.trim() || 'https://instagram.com',
        flashSaleActive,
        flashSaleTitle: flashSaleTitle.trim() || 'Flash Sale Offers',
        flashSaleDiscountText: flashSaleDiscountText.trim() || 'Up to 50% Off',
        flashSaleEndTime,
        updatedAt: serverTimestamp(),
      };

      // ১. ফায়ারস্টোর ডেটাবেসে সেভ করা
      await setDoc(docRef, firestorePayload, { merge: true });

      // ২. গ্লোবাল Zustand ক্যাশ স্টোরে সেভ করা
      updateGlobalStore({
        logoType,
        logoUrl: logoUrl || '',
        siteName: siteName.trim() || 'ISAR',
        siteTagline: siteTagline.trim() || "Bangladesh's Premier E-commerce Marketplace",
        contactEmail: contactEmail.trim() || 'support@isar.com.bd',
        contactPhone: contactPhone.trim() || '+880 1234 567890',
        whatsappNumber: whatsappNumber.trim() || contactPhone.trim() || '+880 1234 567890',
        officeAddress: officeAddress.trim() || 'Dhaka, Bangladesh',
        feeInsideDhaka: Number(feeInsideDhaka) || 0,
        feeOutsideDhaka: Number(feeOutsideDhaka) || 0,
        freeShippingMinAmount: Number(freeShippingMinAmount) || 0,
        facebookUrl: facebookUrl.trim() || 'https://facebook.com',
        instagramUrl: instagramUrl.trim() || 'https://instagram.com',
        flashSaleActive,
        flashSaleTitle: flashSaleTitle.trim() || 'Flash Sale Offers',
        flashSaleDiscountText: flashSaleDiscountText.trim() || 'Up to 50% Off',
        flashSaleEndTime,
        isLoaded: true,
      });

      toast.success('Website settings & brand configurations saved successfully!');
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Helmet>
        <title>Website Settings | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-navy">Website Settings</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure brand logo, contact details, live delivery rates and flash sale
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-brand-green bg-brand-green/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-brand-green/20">
          <ShieldCheck className="w-4 h-4" /> Global Configuration
        </span>
      </div>

      {/* Enterprise Security Architecture Banner */}
      <div className="bg-navy text-white rounded-3xl p-5 sm:p-6 shadow-modern flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-navy-light">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-brand-gold shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              Serverless Backend Security Active <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            </h3>
            <p className="text-xs text-gray-300 mt-0.5">
              Steadfast Courier, bKash PGW & SMS API secrets are isolated securely in server environment variables.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-brand-green/20 text-brand-green border border-brand-green/40 text-[10px] font-black shrink-0 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Enterprise Protected
        </span>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-modern border border-gray-100 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-xs text-gray-500 font-bold">Loading store settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* 1. Brand Logo Settings Card */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" /> Brand Logo Control
            </h2>

            <div className="space-y-4">
              
              {/* Logo Mode Selection */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer">
                  <input
                    type="radio"
                    name="logoType"
                    value="text"
                    checked={logoType === 'text'}
                    onChange={() => setLogoType('text')}
                    className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                  />
                  Text Logo ("ISAR")
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer">
                  <input
                    type="radio"
                    name="logoType"
                    value="image"
                    checked={logoType === 'image'}
                    onChange={() => setLogoType('image')}
                    className="w-4 h-4 text-primary focus:ring-primary cursor-pointer"
                  />
                  Custom Image Logo
                </label>
              </div>

              {/* Logo Image Upload & Standard Preview */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center gap-6">
                {logoUrl ? (
                  <div className="relative w-44 h-16 rounded-xl bg-white border border-gray-200 p-2 flex items-center justify-center overflow-hidden shadow-xs">
                    <img src={logoUrl} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => { setLogoUrl(''); setLogoType('text'); }}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-44 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 font-bold uppercase">
                    No Logo (Text Active)
                  </div>
                )}

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="px-4 py-2 bg-navy hover:bg-navy-dark text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Upload Brand Logo Image
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-400 font-medium">Standard Size: 180×44px • PNG, SVG or JPG (Transparent background recommended)</p>
                </div>
              </div>

            </div>
          </div>

          {/* 2. Delivery Rates Settings */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-green" /> Delivery Rate Settings (BDT)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Inside Dhaka Delivery Fee (৳)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={feeInsideDhaka}
                  onChange={(e) => setFeeInsideDhaka(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-black text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Outside Dhaka Delivery Fee (৳)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={feeOutsideDhaka}
                  onChange={(e) => setFeeOutsideDhaka(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-black text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Free Delivery Min Order (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={freeShippingMinAmount}
                  onChange={(e) => setFreeShippingMinAmount(Number(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-black text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Flash Sale Countdown Controls */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" /> Flash Sale Countdown Control (Bangladesh Time)
              </h2>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flashSaleActive}
                  onChange={(e) => setFlashSaleActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green"></div>
                <span className="ml-2 text-xs font-black text-navy">
                  {flashSaleActive ? 'Active (Live)' : 'Disabled (Hidden)'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Offer Heading *</label>
                <input
                  type="text"
                  required
                  value={flashSaleTitle}
                  onChange={(e) => setFlashSaleTitle(e.target.value)}
                  placeholder="e.g. Flash Sale Offers"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Discount Badge Text *</label>
                <input
                  type="text"
                  required
                  value={flashSaleDiscountText}
                  onChange={(e) => setFlashSaleDiscountText(e.target.value)}
                  placeholder="e.g. Up to 50% Off"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Offer End Date & Time *</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    required
                    value={flashSaleEndTime}
                    onChange={(e) => setFlashSaleEndTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Store Identity & Contact Info */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Store Identity & Contact Info
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Website Name *</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="ISAR Marketplace"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Store Tagline / Slogan</label>
                <input
                  type="text"
                  value={siteTagline}
                  onChange={(e) => setSiteTagline(e.target.value)}
                  placeholder="Bangladesh's Premier E-commerce Marketplace"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Helpline Phone Number *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+880 1234 567890"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">WhatsApp Support Number</label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+880 1234 567890"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Support Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="support@isar.com.bd"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Physical Office Address *</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="House #10, Road #2, Dhanmondi, Dhaka, Bangladesh"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Social Media Links */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-600" /> Social Media Links
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Facebook Page URL</label>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="https://facebook.com/isarbd"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/isarbd"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 bg-primary hover:bg-primary-dark text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-102"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Settings...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Global Settings
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}