import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MobileNav from '../components/layout/MobileNav';
import FloatingContact from '../components/common/FloatingContact';

export default function MainLayout() {
  const location = useLocation();

  // ফুটার শুধুমাত্র এবং শুধুমাত্র হোমপেজে (/) লোড হবে
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen bg-secondary print:bg-white">
      {/* Global Header (Hidden during print) */}
      <div className="print:hidden">
        <Header />
      </div>

      {/* Main Content Area */}
      <main className="grow pb-16 md:pb-0 print:pb-0 print:m-0">
        <Outlet />
      </main>

      {/* Floating WhatsApp & Call Widget */}
      <div className="print:hidden">
        <FloatingContact />
      </div>

      {/* Footer strictly on Homepage ONLY */}
      {isHomePage && (
        <div className="print:hidden">
          <Footer />
        </div>
      )}
      
      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileNav />
      </div>
    </div>
  );
}