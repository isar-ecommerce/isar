import { useState } from 'react';
import { Phone, MessageCircle, X, Headphones } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { contactPhone } = useSettingsStore();

  // ফোন নম্বর ফরম্যাটিং
  const rawPhone = contactPhone || '+8801234567890';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
  
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent('Hello ISAR, I would like to inquire about a product/order.')}`;
  const callUrl = `tel:+${formattedPhone}`;

  return (
    <div className="fixed bottom-24 sm:bottom-20 md:bottom-8 right-3.5 sm:right-4 z-40 flex flex-col items-end gap-2.5 sm:gap-3 pb-safe-bottom print:hidden">
      
      {/* Expanded Quick Contact Options */}
      {isOpen && (
        <div className="flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* WhatsApp Chat Option */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-brand-green hover:bg-emerald-600 text-white font-extrabold py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full shadow-xl text-xs transition-all hover:scale-105 active:scale-95"
          >
            <span>WhatsApp-এ মেসেজ দিন</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
          </a>

          {/* Direct Phone Call Option */}
          <a
            href={callUrl}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-extrabold py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-full shadow-xl text-xs transition-all hover:scale-105 active:scale-95"
          >
            <span>সরাসরি কল করুন</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
          </a>

        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy text-white shadow-2xl hover:shadow-cyan-900/50 flex items-center justify-center transition-all hover:scale-110 active:scale-90 border-2 border-white relative group"
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