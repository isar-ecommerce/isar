import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminRoute() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast.error('Access Denied: You do not have admin privileges');
    }
  }, [isLoading, isAuthenticated, isAdmin]);

  // ফায়ারবেস অথেন্টিকেশন লোড হওয়া পর্যন্ত অপেক্ষা
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // লগইন করা না থাকলে লগইন পেজে পাঠাবে
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // অ্যাডমিন না হলে হোম পেজে রিডাইরেক্ট করবে
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // সিকিউরড অ্যাডমিন লেআউট রেন্ডার করবে
  return <Outlet />;
}