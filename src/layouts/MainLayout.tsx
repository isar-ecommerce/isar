import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MobileNav from '../components/layout/MobileNav';
import FloatingContact from '../components/common/FloatingContact';

export default function MainLayout() {
  const location = useLocation();

  const isHomePage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="flex flex-col min-h-screen bg-secondary print:bg-white">
      {/* Global Header */}
      <div className="print:hidden">
        <Header />
      </div>

      {/* Main Content: Removes bottom padding on auth pages for perfect centering */}
      <main className={`grow ${isAuthPage ? 'pb-0' : 'pb-16 md:pb-0'} print:pb-0 print:m-0`}>
        <Outlet />
      </main>

      {/* Floating WhatsApp Widget: Strictly hidden on Login & Register */}
      {!isAuthPage && (
        <div className="print:hidden">
          <FloatingContact />
        </div>
      )}

      {/* Footer strictly on Homepage ONLY */}
      {isHomePage && (
        <div className="print:hidden">
          <Footer />
        </div>
      )}
      
      {/* Mobile Bottom Navigation: Hidden on Login & Register */}
      {!isAuthPage && (
        <div className="print:hidden">
          <MobileNav />
        </div>
      )}
    </div>
  );
}