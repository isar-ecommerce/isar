import { useState, useEffect, useRef } from 'react';
import { Phone, MessageCircle, X, Headphones } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { contactPhone, whatsappNumber } = useSettingsStore();

  // কেন্দ্রীয় ফোন ও হোয়াটসঅ্যাপ নম্বর
  const rawPhone = contactPhone || '+8801234567890';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;

  const rawWhatsapp = whatsappNumber || contactPhone || '+8801234567890';
  const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
  const formattedWhatsapp = cleanWhatsapp.startsWith('88') ? cleanWhatsapp : `88${cleanWhatsapp}`;
  
  const whatsappUrl = `https://wa.me/${formattedWhatsapp}?text=${encodeURIComponent('Hello ISAR, I would like to inquire about an order/product.')}`;
  const callUrl = `tel:+${formattedPhone}`;

  // কাস্টমার স্ক্রোল করলে বা বাইরে ক্লিক করলে স্বয়ংক্রিয়ভাবে বন্ধ হওয়ার লজিক
  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => setIsOpen(false);
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-24 sm:bottom-20 md:bottom-8 right-3.5 sm:right-4 z-40 flex flex-col items-end gap-2.5 sm:gap-3 pb-safe-bottom print:hidden"
    >
      
      {/* Quick Contact Buttons */}
      {isOpen && (
        <div className="flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* WhatsApp Chat */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-brand-green hover:bg-emerald-600 text-white font-extrabold py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full shadow-xl text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>WhatsApp Support</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
          </a>

          {/* Direct Phone Call */}
          <a
            href={callUrl}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-extrabold py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full shadow-xl text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Call Helpline</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
          </a>

        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy text-white shadow-2xl hover:shadow-cyan-900/50 flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-2 border-white relative cursor-pointer"
        aria-label="Contact Support"
      >
        {isOpen ? (
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <>
            <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold animate-bounce" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-green rounded-full border-2 border-white"></span>
          </>
        )}
      </button>

    </div>
  );
}