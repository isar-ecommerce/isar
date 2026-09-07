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
  CheckCircle2,
  Plus,
  ExternalLink,
  Sliders
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { useSettingsStore, type HeroBannerItem } from '../../store/settingsStore';
import { uploadImageToCloudinary } from '../../cloudinary/upload';

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
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const updateGlobalStore = useSettingsStore((state) => state.setSettings);

  // Logo State
  const [logoType, setLogoType] = useState<'text' | 'image'>('text');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // Store Identity State
  const [siteName, setSiteName] = useState<string>('ISAR');
  const [siteTagline, setSiteTagline] = useState<string>("Bangladesh's Premier E-commerce Marketplace");
  const [contactEmail, setContactEmail] = useState<string>('support@isar.com.bd');
  const [contactPhone, setContactPhone] = useState<string>('+880 1624789764');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('+880 1624789764');
  const [officeAddress, setOfficeAddress] = useState<string>('Dhaka, Bangladesh');
  
  // Delivery Rates
  const [feeInsideDhaka, setFeeInsideDhaka] = useState<number>(70);
  const [feeOutsideDhaka, setFeeOutsideDhaka] = useState<number>(130);
  const [freeShippingMinAmount, setFreeShippingMinAmount] = useState<number>(5000);

  // Social Links
  const [facebookUrl, setFacebookUrl] = useState<string>('https://facebook.com');
  const [instagramUrl, setInstagramUrl] = useState<string>('https://instagram.com');

  // Flash Sale
  const [flashSaleActive, setFlashSaleActive] = useState<boolean>(true);
  const [flashSaleTitle, setFlashSaleTitle] = useState<string>('Flash Sale Offers');
  const [flashSaleDiscountText, setFlashSaleDiscountText] = useState<string>('Up to 50% Off');
  const [flashSaleEndTime, setFlashSaleEndTime] = useState<string>('2026-12-31T23:59');

  // Hero Banner Slider State
  const [heroBanners, setHeroBanners] = useState<HeroBannerItem[]>([]);
  const [newBadge, setNewBadge] = useState<string>('Mega Anniversary Sale');
  const [newTitle, setNewTitle] = useState<string>('Upgrade Your');
  const [newHighlight, setNewHighlight] = useState<string>('Everyday Carry');
  const [newDesc, setNewDesc] = useState<string>('Discover premium backpacks, gadgets & accessories.');
  const [newBtnText, setNewBtnText] = useState<string>('Shop Collection');
  const [newLinkUrl, setNewLinkUrl] = useState<string>('/products');
  const [newBannerImg, setNewBannerImg] = useState<string>('');
  const [isUploadingBannerImg, setIsUploadingBannerImg] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

          if (Array.isArray(data.heroBanners)) setHeroBanners(data.heroBanners);
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

  const handleBannerImgUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingBannerImg(true);
      const file = files[0];
      const uploadedUrl = await uploadImageToCloudinary(file);
      setNewBannerImg(uploadedUrl);
      toast.success('Banner image uploaded!');
    } catch (error: unknown) {
      console.error('Banner upload error:', error);
      toast.error('Failed to upload banner image');
    } finally {
      setIsUploadingBannerImg(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleAddBannerSlide = () => {
    if (!newTitle.trim() || !newLinkUrl.trim()) {
      toast.error('Banner Title and Destination Link URL are required');
      return;
    }

    const newSlide: HeroBannerItem = {
      id: `banner-${Date.now()}`,
      badge: newBadge.trim() || 'Featured Offer',
      title: newTitle.trim(),
      highlightText: newHighlight.trim(),
      description: newDesc.trim(),
      buttonText: newBtnText.trim() || 'Shop Now',
      linkUrl: newLinkUrl.trim(),
      imageUrl: newBannerImg || undefined,
      bgGradient: 'from-navy via-slate-900 to-primary/90',
    };

    setHeroBanners(prev => [...prev, newSlide]);
    setNewBannerImg('');
    toast.success('New banner slide added! Click "Save Global Settings" to publish.');
  };

  const handleRemoveBannerSlide = (slideId: string) => {
    setHeroBanners(prev => prev.filter(b => b.id !== slideId));
    toast.success('Banner slide removed. Click "Save Global Settings" to update.');
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
        contactEmail: contactEmail.trim() || 'isar.store.bd@gmail.com',
        contactPhone: contactPhone.trim() || '+880 1624789764',
        whatsappNumber: whatsappNumber.trim() || contactPhone.trim() || '+880 1624789764',
        officeAddress: officeAddress.trim() || 'Dhaka, Bangladesh',
        feeInsideDhaka: Number(feeInsideDhaka) || 70,
        feeOutsideDhaka: Number(feeOutsideDhaka) || 130,
        freeShippingMinAmount: Number(freeShippingMinAmount) || 5000,
        facebookUrl: facebookUrl.trim() || 'https://facebook.com',
        instagramUrl: instagramUrl.trim() || 'https://instagram.com',
        flashSaleActive,
        flashSaleTitle: flashSaleTitle.trim() || 'Flash Sale Offers',
        flashSaleDiscountText: flashSaleDiscountText.trim() || 'Up to 50% Off',
        flashSaleEndTime,
        heroBanners: heroBanners,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, firestorePayload, { merge: true });

      updateGlobalStore({
        ...firestorePayload,
        isLoaded: true,
      });

      toast.success('Website settings & hero banners saved successfully!');
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
              Configure brand logo, slider banners, live delivery rates and store details
            </p>
          </div>
        </div>

        <span className="text-xs font-black text-brand-green bg-brand-green/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-brand-green/20">
          <ShieldCheck className="w-4 h-4" /> Global Configuration
        </span>
      </div>

      {/* Security Architecture Banner */}
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
          
          {/* Banner Slider Manager */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-base font-black text-navy flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" /> Hero Banner Slider Manager (Homepage)
              </h2>
              <span className="text-xs font-bold text-gray-400 font-mono">{heroBanners.length} Custom Banner(s)</span>
            </div>

            {/* List of Active Banner Slides */}
            {heroBanners.length > 0 && (
              <div className="space-y-3">
                {heroBanners.map((slide, idx) => (
                  <div key={slide.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white font-mono">Slide #{idx + 1}</span>
                        <span className="text-xs font-extrabold text-navy">{slide.title} {slide.highlightText}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{slide.description}</p>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary font-mono">
                        <ExternalLink className="w-3 h-3" /> Target Link: {slide.linkUrl}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBannerSlide(slide.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end sm:self-center shrink-0"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Slide Box */}
            <div className="p-5 bg-primary/5 rounded-3xl border border-primary/20 space-y-4">
              <h3 className="text-xs font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" /> Add New Banner Slide
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Badge Text</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. Mega Anniversary Sale"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-navy focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Title *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Upgrade Your"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-navy focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Highlight Text (Gold)</label>
                  <input
                    type="text"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    placeholder="e.g. Everyday Carry"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-navy focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-navy">Description</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Premium bags & smartphone accessories with fast shipping."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-navy focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-navy">Button Label</label>
                  <input
                    type="text"
                    value={newBtnText}
                    onChange={(e) => setNewBtnText(e.target.value)}
                    placeholder="e.g. Shop Collection"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-xs font-medium text-navy focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Destination Link URL */}
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-[11px] font-bold text-navy flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" /> Destination Page Link URL *
                  </label>
                  <input
                    type="text"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="e.g. /products?category=smart-phone or /products"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-mono font-bold text-primary focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-gray-400">Clicking anywhere on this banner will take the customer to this page.</p>
                </div>

                {/* Banner Background Image Upload Box */}
                <div className="space-y-1 sm:col-span-3">
                  <label className="text-[11px] font-bold text-navy flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> Custom Banner Image (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={bannerFileInputRef}
                      onChange={handleBannerImgUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      disabled={isUploadingBannerImg}
                      className="px-4 py-2 bg-white border border-gray-200 hover:border-primary text-navy text-xs font-bold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingBannerImg ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading Image...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" /> {newBannerImg ? 'Change Image' : 'Upload Banner Image'}
                        </>
                      )}
                    </button>
                    {newBannerImg && (
                      <div className="flex items-center gap-2">
                        <img src={newBannerImg} alt="Banner Preview" className="h-8 w-16 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setNewBannerImg('')}
                          className="text-red-500 hover:underline text-[10px] font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddBannerSlide}
                  className="px-5 py-2.5 bg-navy hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Slide to Carousel
                </button>
              </div>
            </div>
          </div>

          {/* 1. Brand Logo Settings Card */}
          <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
            <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" /> Brand Logo Control
            </h2>

            <div className="space-y-4">
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
                <label className="text-xs font-bold text-navy">Inside Dhaka Base Fee (৳)</label>
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
                <label className="text-xs font-bold text-navy">Outside Dhaka Base Fee (৳)</label>
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
                <Flame className="w-5 h-5 text-amber-500" /> Flash Sale Countdown Control
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
                    placeholder="+880 1624789764"
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
                    placeholder="+880 1624789764"
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
                    placeholder="isar.store.bd@gmail.com"
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
                    placeholder="Dhaka, Bangladesh"
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
                  placeholder="https://facebook.com"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Instagram URL</label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com"
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