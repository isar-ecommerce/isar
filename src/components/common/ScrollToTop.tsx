import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className="fixed bottom-20 sm:bottom-6 right-5 z-40 p-3 bg-navy/90 hover:bg-primary text-white rounded-2xl shadow-xl backdrop-blur-xs border border-white/20 transition-all hover:scale-110 active:scale-95 cursor-pointer animate-in fade-in duration-200"
      aria-label="Scroll to top"
      title="পেজের ওপরে উঠুন"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}