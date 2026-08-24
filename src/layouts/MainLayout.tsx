import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MobileNav from '../components/layout/MobileNav';
import FloatingContact from '../components/common/FloatingContact';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary print:bg-white">
      {/* গ্লোবাল হেডার (প্রিন্টের সময় স্বয়ংক্রিয়ভাবে অদৃশ্য থাকবে) */}
      <div className="print:hidden">
        <Header />
      </div>

      {/* মেইন কনটেন্ট এরিয়া */}
      <main className="grow pb-16 md:pb-0 print:pb-0 print:m-0">
        <Outlet />
      </main>

      {/* ভাসমান হোয়াটসঅ্যাপ ও সরাসরি কল বাটন (প্রিন্টের সময় অদৃশ্য) */}
      <div className="print:hidden">
        <FloatingContact />
      </div>

      {/* গ্লোবাল ফুটার (প্রিন্টের সময় অদৃশ্য) */}
      <div className="print:hidden">
        <Footer />
      </div>
      
      {/* মোবাইল বটম নেভিগেশন (প্রিন্টের সময় অদৃশ্য) */}
      <div className="print:hidden">
        <MobileNav />
      </div>
    </div>
  );
}