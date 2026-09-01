import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';

interface BrandLogoProps {
  className?: string;
  isLink?: boolean;
  to?: string;
  adminMode?: boolean;
  showTextBesideLogo?: boolean;
}

export default function BrandLogo({
  className = '',
  isLink = true,
  to = '/',
  adminMode = false,
  showTextBesideLogo = true,
}: BrandLogoProps) {
  // ক্যাশ স্টোর থেকে ইনস্ট্যান্টলি সেটিংস রিড করা (০ মিলিসেকেন্ড ফ্লিকার-ফ্রি)
  const { logoType, logoUrl, siteName, fetchSettings } = useSettingsStore();

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSettings();
    });
  }, [fetchSettings]);

  const logoContent = (
    <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`}>
      {logoType === 'image' && logoUrl ? (
        <>
          {/* গোল শেপের রয়্যাল গোল্ডেন মনোগ্রাম ব্যাজ (Circular Luxury Emblem) */}
          <div
            className={`${
              adminMode
                ? 'w-9 h-9 border-amber-400/50'
                : 'w-10 h-10 sm:w-11 sm:h-11 border-amber-500/40 shadow-sm'
            } rounded-full overflow-hidden bg-black border-2 flex items-center justify-center p-0.5 shrink-0 transition-transform duration-300 group-hover:scale-105`}
          >
            <img
              src={logoUrl}
              alt={siteName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* লোগো ব্যাজের পাশে শুধুমাত্র ব্র্যান্ডের নাম (ISAR) */}
          {showTextBesideLogo && (
            <span
              className={`font-black tracking-wider leading-none ${
                adminMode
                  ? 'text-xl text-white'
                  : 'text-xl sm:text-2xl text-navy group-hover:text-primary transition-colors'
              }`}
            >
              {siteName.toUpperCase()}
            </span>
          )}
        </>
      ) : (
        /* টেক্সট লোগো মোড (শুধুমাত্র ISAR) */
        <span
          className={`font-black tracking-tight leading-none ${
            adminMode
              ? 'text-2xl text-white'
              : 'text-2xl sm:text-3xl text-primary'
          }`}
        >
          {siteName.toUpperCase()}
        </span>
      )}
    </div>
  );

  if (isLink) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}