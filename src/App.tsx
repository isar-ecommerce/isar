import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import AppRoutes from './routes/AppRoutes';
import { initAuthListener } from './firebase/auth';

export default function App() {
  useEffect(() => {
    // ওয়েবসাইট লোড হওয়ার সাথে সাথে ফায়ারবেস Auth Listener চালু হবে
    const unsubscribe = initAuthListener();
    
    // কম্পোনেন্ট আনমাউন্ট হলে লিসেনার ক্লিন-আপ (বন্ধ) করে দেওয়া হবে
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* গ্লোবাল SEO (Search Engine Optimization) মেটা ট্যাগ */}
      <Helmet>
        <title>ISAR | Modern Bangladeshi E-commerce</title>
        <meta 
          name="description" 
          content="Shop the best products at ISAR - Bangladesh's premium e-commerce marketplace." 
        />
      </Helmet>
      
      {/* ওয়েবসাইটের মূল রাউটিং সিস্টেম */}
      <AppRoutes />

      {/* গ্লোবাল নোটিফিকেশন (Toast) স্টাইলিং */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#FFFFFF',
            color: '#0B192C',
            borderRadius: '8px',
            border: '1px solid #E9ECEF',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          },
          success: {
            iconTheme: {
              primary: '#28A745', // ISAR Green
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444', // Red for errors
              secondary: '#FFFFFF',
            },
          },
        }} 
      />
    </div>
  );
}