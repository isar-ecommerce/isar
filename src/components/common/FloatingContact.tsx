import { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, Headphones } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function FloatingContact() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('8801234567890');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.contactPhone) {
            // কেবল ডিজিটগুলো ফিল্টার করে রাখা
            const cleanPhone = data.contactPhone.replace(/[^0-9]/g, '');
            setContactPhone(cleanPhone || '8801234567890');
          }
        }
      } catch (error) {
        console.error('Error fetching contact phone for widget:', error);
      }
    };

    Promise.resolve().then(() => {
      fetchSettings();
    });
  }, []);

  const formattedPhone = contactPhone.startsWith('88') ? contactPhone : `88${contactPhone}`;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent('Hello ISAR, I would like to inquire about an order.')}`;
  const callUrl = `tel:+${formattedPhone}`;

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 z-40 flex flex-col items-end gap-3 pb-safe-bottom">
      
      {/* Expanded Quick Options */}
      {isOpen && (
        <div className="flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* WhatsApp Option */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-brand-green hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-full shadow-lg text-xs transition-all hover:scale-105"
          >
            <span>WhatsApp-এ মেসেজ দিন</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </a>

          {/* Direct Call Option */}
          <a
            href={callUrl}
            className="flex items-center gap-2.5 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-full shadow-lg text-xs transition-all hover:scale-105"
          >
            <span>কল করে অর্ডার দিন</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </a>

        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-navy text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-110 border-2 border-white relative group"
        aria-label="Contact Support"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Headphones className="w-6 h-6 text-brand-gold animate-bounce" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-white"></span>
          </>
        )}
      </button>

    </div>
  );
}