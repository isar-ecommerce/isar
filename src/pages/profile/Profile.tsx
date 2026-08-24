import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Package, 
  Heart, 
  MapPin, 
  Settings, 
  Camera,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { useAuthStore } from '../../store/authStore';
import { logoutUser } from '../../firebase/auth';
import { uploadImageToCloudinary } from '../../cloudinary/upload';
import { auth, db } from '../../firebase/config';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await logoutUser();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ফাইল ভ্যালিডেশন
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB Limit
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      
      // ১. Cloudinary-তে আপলোড
      const imageUrl = await uploadImageToCloudinary(file);

      if (auth.currentUser && user) {
        // ২. Firebase Auth প্রোফাইল আপডেট
        await updateProfile(auth.currentUser, { photoURL: imageUrl });
        
        // ৩. Firestore ডেটাবেস আপডেট
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          photoURL: imageUrl,
          updatedAt: serverTimestamp()
        });

        // ৪. গ্লোবাল Zustand স্টেট আপডেট
        setUser({ ...user, photoURL: imageUrl });
        toast.success('Profile picture updated successfully!');
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to update profile picture');
    } finally {
      setIsUploading(false);
      // ইনপুট ক্লিয়ার করা যাতে একই ছবি পুনরায় আপলোড করা যায়
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const profileLinks = [
    { name: 'My Orders', icon: Package, path: '/orders', count: 0 },
    { name: 'Wishlist', icon: Heart, path: '/wishlist', count: 0 },
    { name: 'Saved Addresses', icon: MapPin, path: '/profile/addresses' },
    { name: 'Account Settings', icon: Settings, path: '/profile/settings' },
  ];

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>My Profile | ISAR Marketplace</title>
        <meta name="description" content="Manage your ISAR account, track orders, and update your profile." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold text-navy mb-8">My Account</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Left Column: Sidebar / Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info Card */}
            <div className="bg-white rounded-2xl shadow-modern p-6 text-center border border-gray-100">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto flex items-center justify-center border-4 border-white shadow-sm overflow-hidden relative group">
                  {isUploading ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  ) : null}
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user?.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                {/* Image Upload Button */}
                <button 
                  onClick={handleImageClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed z-20"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-lg font-bold text-navy truncate">{user?.displayName || 'ISAR User'}</h2>
              <p className="text-sm text-gray-500 mb-2">{user?.role?.toUpperCase() || 'CUSTOMER'}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                Active Account
              </div>
            </div>

            {/* Navigation Menu for Desktop */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-modern overflow-hidden border border-gray-100">
              <nav className="flex flex-col">
                {profileLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={index} 
                      to={link.path}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex items-center gap-3 text-navy font-medium group-hover:text-primary transition-colors">
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        {link.name}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-red-50 text-red-600 font-medium transition-colors text-left w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </nav>
            </div>
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Personal Information Section */}
            <div className="bg-white rounded-2xl shadow-modern p-6 md:p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-navy">Personal Information</h3>
                <button className="text-sm font-semibold text-primary hover:text-primary-dark">
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Full Name</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-navy">{user?.displayName || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Email Address</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-navy">{user?.email || 'Not provided'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-500">Phone Number</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-navy">{user?.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            <div className="lg:hidden bg-white rounded-2xl shadow-modern overflow-hidden border border-gray-100">
              <nav className="flex flex-col">
                {profileLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <Link 
                      key={index} 
                      to={link.path}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex items-center gap-3 text-navy font-medium group-hover:text-primary transition-colors">
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        {link.name}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-red-50 text-red-600 font-medium transition-colors text-left w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </nav>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}