import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import BrandLogo from '../common/BrandLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { 
    contactPhone, 
    contactEmail, 
    officeAddress, 
    facebookUrl, 
    instagramUrl 
  } = useSettingsStore();

  return (
    <footer className="bg-navy text-white pt-10 md:pt-14 pb-8 pb-safe-bottom print:hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Footer Grid (Clean 4-Column Architecture) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10">
          
          {/* Column 1: Brand & Live Contact */}
          <div className="space-y-3.5">
            <BrandLogo adminMode={true} />
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-xs">
              Premium destination for authentic bags, smartphone accessories, and everyday lifestyle gear.
            </p>
            <div className="space-y-2 pt-1 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-gold shrink-0" />
                <span>{contactPhone || '+880 1624789764'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-gold shrink-0" />
                <span>{contactEmail || 'isar.store.bd@gmail.com'}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <span className="leading-snug">{officeAddress || 'Dhaka, Bangladesh'}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links (Wishlist Removed, Orders & Catalog Kept) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/products">
                  Shop All Products
                </Link>
              </li>
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/categories">
                  Categories
                </Link>
              </li>
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5" to="/orders">
                  <Truck className="w-3.5 h-3.5 text-brand-gold" /> My Orders & Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Policies */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Policies</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/terms">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/refund-policy">
                  Return & Refund Policy
                </Link>
              </li>
              <li>
                <Link className="text-gray-400 hover:text-white transition-colors" to="/shipping-policy">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Social Links & Verified Payments */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2.5">Follow Us</h3>
              <div className="flex items-center gap-2.5">
                <a 
                  href={facebookUrl || 'https://facebook.com'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-primary transition-all cursor-pointer"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                
                <a 
                  href={instagramUrl || 'https://instagram.com'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-pink-600 transition-all cursor-pointer"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-green" /> Secure Payments
              </h3>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-gray-300">
                <span className="px-2.5 py-1 border border-gray-800 rounded-lg bg-white/5">bKash</span>     
                <span className="px-2.5 py-1 border border-gray-800 rounded-lg bg-white/5">Cash on Delivery</span>
              </div>
            </div>
          </div>

        </div>

        {/* Clean & Concise Copyright */}
        <div className="pt-6 border-t border-gray-800/80 text-center text-xs text-gray-500">
          <p>&copy; {currentYear} ISAR. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
}