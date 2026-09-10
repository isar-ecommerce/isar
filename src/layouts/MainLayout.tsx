import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MobileNav from '../components/layout/MobileNav';
import ScrollToTop from '../components/common/ScrollToTop';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      {/* ফ্লোটিং অটো-স্ক্রোল বাটন (#8) */}
      <ScrollToTop />
    </div>
  );
}