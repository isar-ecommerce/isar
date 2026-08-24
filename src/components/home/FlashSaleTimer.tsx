import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Clock, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

interface FlashSaleTimerProps {
  targetHours?: number;
}

export default function FlashSaleTimer({ targetHours }: FlashSaleTimerProps) {
  // ক্যাশ স্টোর থেকে ইনস্ট্যান্টলি সেটিংস রিড করা (০ মিলিসেকেন্ড ফ্লিকার-ফ্রি)
  const { 
    flashSaleActive, 
    flashSaleTitle, 
    flashSaleDiscountText, 
    flashSaleEndTime, 
    fetchSettings 
  } = useSettingsStore();

  const calculateTimeLeft = useCallback(() => {
    const targetDate = new Date(flashSaleEndTime).getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0 || !flashSaleActive) {
      return { days: 0, hours: targetHours || 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  }, [flashSaleActive, flashSaleEndTime, targetHours]);

  // শুরুর ফ্রেমেই ইনস্ট্যান্ট সময় হিসাব করা (ফ্লিকার বন্ধ)
  const [timeRemaining, setTimeRemaining] = useState(() => calculateTimeLeft());

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSettings();
    });
  }, [fetchSettings]);

  // প্রতি ১ সেকেন্ড পর পর কাউন্টডাউন আপডেট করা
  useEffect(() => {
    if (!flashSaleActive) return;

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeRemaining(remaining);
      if (remaining.isExpired) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSaleActive, calculateTimeLeft]);

  // যদি অ্যাডমিন অফ করে দেয় অথবা অফারের সময় শেষ হয়ে যায়, তবে ব্যানারটি হাইড থাকবে
  if (!flashSaleActive || timeRemaining.isExpired) {
    return null;
  }

  const formatNumber = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div className="bg-navy rounded-2xl p-4 sm:p-6 text-white shadow-modern-lg border border-navy-light my-6 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        
        {/* Left: Title & Discount Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Flame className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">{flashSaleTitle}</h3>
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {flashSaleDiscountText}
              </span>
            </div>
            <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-brand-gold" /> Hurry up! Live offer ends soon.
            </p>
          </div>
        </div>

        {/* Middle: Live Countdown Clock Boxes */}
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          
          {/* Days Box */}
          {timeRemaining.days > 0 && (
            <>
              <div className="flex flex-col items-center">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-base sm:text-xl font-extrabold text-brand-gold font-mono shadow-inner">
                  {formatNumber(timeRemaining.days)}
                </div>
                <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Days</span>
              </div>
              <span className="text-lg font-bold text-brand-gold pb-4">:</span>
            </>
          )}

          {/* Hours Box */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-base sm:text-xl font-extrabold text-brand-gold font-mono shadow-inner">
              {formatNumber(timeRemaining.hours)}
            </div>
            <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Hours</span>
          </div>

          <span className="text-lg font-bold text-brand-gold pb-4">:</span>

          {/* Minutes Box */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-base sm:text-xl font-extrabold text-white font-mono shadow-inner">
              {formatNumber(timeRemaining.minutes)}
            </div>
            <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Mins</span>
          </div>

          <span className="text-lg font-bold text-brand-gold pb-4">:</span>

          {/* Seconds Box */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-red-500/80 border border-red-400 flex items-center justify-center text-base sm:text-xl font-extrabold text-white font-mono shadow-md animate-pulse">
              {formatNumber(timeRemaining.seconds)}
            </div>
            <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Secs</span>
          </div>

        </div>

        {/* Right: View All Deals Button */}
        <Link
          to="/products"
          className="px-5 py-2.5 bg-primary hover:bg-primary-light text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 ml-auto sm:ml-0 shrink-0"
        >
          View Flash Deals <ArrowRight className="w-4 h-4" />
        </Link>

      </div>
    </div>
  );
}