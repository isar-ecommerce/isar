import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Share2 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white pt-16 pb-8 pb-safe-bottom">
      <div className="container mx-auto px-4">
        {/* Footer Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Column 1: Brand & Contact */}
          <div className="space-y-4">
            <Link className="inline-block" to="/">
              <span className="text-3xl font-extrabold text-white tracking-tight">ISAR</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Bangladesh's premium e-commerce marketplace. Shop the best products with authentic quality and fast delivery.
            </p>
            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Phone className="w-4 h-4 text-primary-light"/>
                <span>+880 1234 567890</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-primary-light"/>
                <span>support@isar.com.bd</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <MapPin className="w-4 h-4 text-primary-light flex-shrink-0 mt-0.5"/>
                <span>Dhaka, Bangladesh</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/products">Shop All Products</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/categories">Categories</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/about-us">About Us</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/contact">Contact Support</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/faq">FAQ</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal & Policies */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Customer Policies</h3>
            <ul className="space-y-3">
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/terms">Terms & Conditions</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/refund-policy">Refund Policy</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/return-policy">Return Policy</Link></li>
              <li><Link className="text-sm text-gray-400 hover:text-white transition-colors" to="/shipping-policy">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Column 4: Social Media & Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Follow Us</h3>
            <div className="flex items-center gap-3 mb-8">
              <a href="#" className="p-2.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-primary transition-all">FB</a>
              <a href="#" className="p-2.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-primary transition-all">IG</a>
              <a href="#" className="p-2.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-primary transition-all">YT</a>
              <a href="#" className="p-2.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-primary transition-all flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5"/>
              </a>
            </div>
            <h3 className="text-lg font-semibold mb-4 text-white">Secure Payments</h3>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-400">
              <span className="px-3 py-1.5 border border-gray-700 rounded-md bg-white/5">bKash</span>
              <span className="px-3 py-1.5 border border-gray-700 rounded-md bg-white/5">Nagad</span>
              <span className="px-3 py-1.5 border border-gray-700 rounded-md bg-white/5">Visa</span>
              <span className="px-3 py-1.5 border border-gray-700 rounded-md bg-white/5">MasterCard</span>
            </div>
          </div>

        </div>

        {/* Footer Bottom / Copyright */}
        <div className="pt-8 border-t border-gray-800 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} ISAR Marketplace. All rights reserved.
          </p>
          <div className="text-sm text-gray-500 flex gap-4">
            <span>Designed for Bangladesh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}