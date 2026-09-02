import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  Camera,
  LogOut,
  ChevronRight,
  Loader2,
  Edit,
  Save,
  X,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { logoutUser } from '../../firebase/auth';
import { uploadImageToCloudinary } from '../../cloudinary/upload';
import { auth, db } from '../../firebase/config';
import { 
  BANGLADESH_DIVISIONS, 
  getDistrictsByDivision, 
  getUpazilasByDistrict 
} from '../../data/bangladeshGeoData';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { items: wishlistItems } = useWishlistStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [orderCount, setOrderCount] = useState<number>(0);

  // ব্যক্তিগত তথ্য এডিট স্টেট
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>(() => user?.displayName || '');
  const [editPhone, setEditPhone] = useState<string>(() => user?.phoneNumber || '');
  const [isSavingInfo, setIsSavingInfo] = useState<boolean>(false);

  // ৩-টিয়ার সেভড অ্যাড্রেস স্টেট
  const [hasSavedAddress, setHasSavedAddress] = useState<boolean>(false);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);

  const [addressFullName, setAddressFullName] = useState<string>('');
  const [addressPhone, setAddressPhone] = useState<string>('');
  const [division, setDivision] = useState<string>('Dhaka');
  const [district, setDistrict] = useState<string>('Dhaka');
  const [upazila, setUpazila] = useState<string>('Dhanmondi');
  const [fullAddress, setFullAddress] = useState<string>('');

  const [availableDistricts, setAvailableDistricts] = useState(() => getDistrictsByDivision('Dhaka'));
  const [availableUpazilas, setAvailableUpazilas] = useState(() => getUpazilasByDistrict('Dhaka', 'Dhaka'));

  // ফায়ারস্টোর থেকে ইউজারের সেভড অ্যাড্রেস ও অর্ডার সংখ্যা লোড করা (React 19 সেফ)
  useEffect(() => {
    let isMounted = true;
    if (!user?.uid) return;

    const loadUserProfileData = async () => {
      try {
        // ১. সেভড অ্যাড্রেস ফেচ
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && isMounted) {
          const data = userSnap.data();
          if (data.savedAddress) {
            const addr = data.savedAddress;
            setAddressFullName(addr.fullName || user.displayName || '');
            setAddressPhone(addr.phone || user.phoneNumber || '');
            setDivision(addr.division || 'Dhaka');
            setDistrict(addr.district || 'Dhaka');
            setUpazila(addr.upazila || 'Dhanmondi');
            setFullAddress(addr.fullAddress || '');
            setHasSavedAddress(true);

            const dists = getDistrictsByDivision(addr.division || 'Dhaka');
            setAvailableDistricts(dists);
            const upas = getUpazilasByDistrict(addr.division || 'Dhaka', addr.district || 'Dhaka');
            setAvailableUpazilas(upas);
          }
        }

        // ২. ইউজারের মোট অর্ডার সংখ্যা ফেচ
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const ordersSnap = await getDocs(q);
        if (isMounted) {
          setOrderCount(ordersSnap.size);
        }
      } catch (err) {
        console.warn('Error loading user profile details:', err);
      }
    };

    Promise.resolve().then(() => {
      loadUserProfileData();
    });

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.displayName, user?.phoneNumber]);

  // বিভাগ পরিবর্তন হ্যান্ডলার
  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    const districts = getDistrictsByDivision(newDivision);
    setAvailableDistricts(districts);

    const firstDistrict = districts[0]?.name || '';
    setDistrict(firstDistrict);

    const upazilas = getUpazilasByDistrict(newDivision, firstDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');
  };

  // জেলা পরিবর্তন হ্যান্ডলার
  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const upazilas = getUpazilasByDistrict(division, newDistrict);
    setAvailableUpazilas(upazilas);
    setUpazila(upazilas[0] || '');
  };

  // লগআউট
  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  // প্রোফাইল ছবি আপলোড (Cloudinary)
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const imageUrl = await uploadImageToCloudinary(file);

      if (auth.currentUser && user) {
        await updateProfile(auth.currentUser, { photoURL: imageUrl });
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: imageUrl,
          updatedAt: serverTimestamp(),
        });

        setUser({ ...user, photoURL: imageUrl });
        toast.success('Profile picture updated successfully!');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ব্যক্তিগত তথ্য সেভ করা
  const handleSavePersonalInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error('Full name is required');
      return;
    }

    try {
      setIsSavingInfo(true);
      if (auth.currentUser && user) {
        await updateProfile(auth.currentUser, { displayName: editName.trim() });
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: editName.trim(),
          phoneNumber: editPhone.trim() || null,
          updatedAt: serverTimestamp(),
        });

        setUser({ 
          ...user, 
          displayName: editName.trim(), 
          phoneNumber: editPhone.trim() || null 
        });
        setIsEditingInfo(false);
        toast.success('Personal information updated!');
      }
    } catch (err) {
      console.error('Save info error:', err);
      toast.error('Failed to update personal information');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // ৩-টিয়ার ডেলিভারি ঠিকানা সেভ করা
  const handleSaveDeliveryAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (!addressFullName.trim() || !addressPhone.trim() || !fullAddress.trim()) {
      toast.error('Please fill in all address fields');
      return;
    }

    const cleanPhone = addressPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      toast.error('Please enter a valid 11-digit mobile number');
      return;
    }

    try {
      setIsSavingAddress(true);
      if (user?.uid) {
        const savedAddressData = {
          fullName: addressFullName.trim(),
          phone: cleanPhone,
          division,
          district,
          upazila,
          fullAddress: fullAddress.trim(),
          updatedAt: new Date().toISOString(),
        };

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          savedAddress: savedAddressData,
          updatedAt: serverTimestamp(),
        });

        setHasSavedAddress(true);
        setIsEditingAddress(false);
        toast.success('Default delivery address saved!');
      }
    } catch (err) {
      console.error('Save address error:', err);
      toast.error('Failed to save delivery address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>My Profile | ISAR Marketplace</title>
        <meta name="description" content="Manage your ISAR account, saved addresses, and track your orders." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        
        {/* Page Title & Breadcrumb */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-navy">My Account</h1>
          <p className="text-xs text-gray-500 mt-1">Manage your profile information, delivery address book, and order history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Left Column: Profile Card & Quick Nav */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* User Profile Card */}
            <div className="bg-white rounded-3xl shadow-modern p-6 text-center border border-gray-100 relative">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center border-4 border-white shadow-md overflow-hidden relative group">
                  {isUploading && (
                    <div className="absolute inset-0 bg-navy/60 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user?.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-primary-dark transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-lg font-black text-navy truncate">{user?.displayName || 'Customer'}</h2>
              <p className="text-xs text-gray-400 font-medium truncate mb-3">{user?.email}</p>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold border border-brand-green/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Account</span>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="bg-white rounded-3xl shadow-modern overflow-hidden border border-gray-100">
              <nav className="flex flex-col divide-y divide-gray-50">
                
                {/* Admin Shortcut if Admin */}
                {isAdmin && (
                  <Link 
                    to="/admin"
                    className="flex items-center justify-between px-5 py-4 hover:bg-red-50/70 transition-colors text-red-600 font-black text-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Admin Control Panel</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}

                <Link 
                  to="/orders"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-navy font-bold text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-primary" />
                    <span>My Orders ({orderCount})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>

                <Link 
                  to="/wishlist"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-navy font-bold text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>My Wishlist ({wishlistItems.length})</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                </Link>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-red-50 text-red-600 font-bold text-xs transition-colors text-left w-full cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>

          </div>

          {/* Right Column: Information & Saved 3-Tier Address Book */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. Personal Information Card */}
            <div className="bg-white rounded-3xl shadow-modern p-6 sm:p-8 border border-gray-100 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-black text-navy flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" /> Personal Information
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Your personal profile credentials on ISAR</p>
                </div>

                {!isEditingInfo ? (
                  <button 
                    onClick={() => {
                      setEditName(user?.displayName || '');
                      setEditPhone(user?.phoneNumber || '');
                      setIsEditingInfo(true);
                    }}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary hover:text-white text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingInfo(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-navy text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>

              {!isEditingInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold block">Full Name</span>
                    <span className="font-extrabold text-navy text-sm block">{user?.displayName || 'Not provided'}</span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <span className="text-gray-400 font-bold block">Email Address</span>
                    <span className="font-extrabold text-navy text-sm block">{user?.email || 'Not provided'}</span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 sm:col-span-2">
                    <span className="text-gray-400 font-bold block">Primary Mobile Number</span>
                    <span className="font-extrabold text-navy text-sm block">{user?.phoneNumber || 'Not linked yet'}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Rahim Chowdhury"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">Phone Number (11 Digits)</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="01712345678"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingInfo}
                      className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSavingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 2. Saved 3-Tier Delivery Address Book Card */}
            <div className="bg-white rounded-3xl shadow-modern p-6 sm:p-8 border border-gray-100 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-black text-navy flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-green" /> Default Delivery Address Book
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">3-tier Bangladesh address for automated express checkout</p>
                </div>

                {!isEditingAddress ? (
                  <button 
                    onClick={() => {
                      if (!addressFullName && user?.displayName) setAddressFullName(user.displayName);
                      if (!addressPhone && user?.phoneNumber) setAddressPhone(user.phoneNumber);
                      setIsEditingAddress(true);
                    }}
                    className="px-4 py-2 bg-brand-green/10 hover:bg-brand-green hover:text-white text-brand-green text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> {hasSavedAddress ? 'Edit Address' : '+ Add Address'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditingAddress(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-navy text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>

              {!isEditingAddress ? (
                hasSavedAddress ? (
                  <div className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-navy text-sm">{addressFullName}</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-brand-green/10 text-brand-green text-[10px] font-black">
                        Default Address
                      </span>
                    </div>
                    <p className="text-gray-600 font-semibold">{addressPhone}</p>
                    <p className="text-gray-700 leading-relaxed font-medium">
                      {fullAddress}, {upazila}, {district}, {division}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl space-y-3">
                    <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
                    <h4 className="text-sm font-bold text-navy">No Default Address Saved</h4>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      Save your Division, District, and Thana once, and checkout will be 1-click easy next time!
                    </p>
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer hover:bg-primary-dark"
                    >
                      + Add Address Now
                    </button>
                  </div>
                )
              ) : (
                <form onSubmit={handleSaveDeliveryAddress} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">Recipient Name *</label>
                      <input
                        type="text"
                        required
                        value={addressFullName}
                        onChange={(e) => setAddressFullName(e.target.value)}
                        placeholder="Rahim Chowdhury"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">Mobile Number (11 Digits) *</label>
                      <input
                        type="tel"
                        required
                        value={addressPhone}
                        onChange={(e) => setAddressPhone(e.target.value)}
                        placeholder="01712345678"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary"
                      />
                    </div>

                    {/* Division */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">বিভাগ (Division) *</label>
                      <select
                        value={division}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {BANGLADESH_DIVISIONS.map((d) => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* District */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-navy">জেলা (District) *</label>
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {availableDistricts.map((dist) => (
                          <option key={dist.name} value={dist.name}>{dist.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Upazila / Thana */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-navy">থানা / উপজেলা (Upazila / Thana) *</label>
                      <select
                        value={upazila}
                        onChange={(e) => setUpazila(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                      >
                        {availableUpazilas.map((upa) => (
                          <option key={upa} value={upa}>{upa}</option>
                        ))}
                      </select>
                    </div>

                    {/* Full Address */}
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-navy">বিস্তারিত ঠিকানা (বাড়ি, রোড, এলাকা) *</label>
                      <textarea
                        required
                        rows={2}
                        value={fullAddress}
                        onChange={(e) => setFullAddress(e.target.value)}
                        placeholder="যেমন: হাউজ #১২, রোড #৪, ব্লক #বি, শান্তিনগর"
                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="px-6 py-2.5 bg-brand-green hover:bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSavingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Delivery Address
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}