import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsStore } from '../../store/settingsStore';

interface BrandLogoProps {
  className?: string;
  isLink?: boolean;
  to?: string;
  adminMode?: boolean;
}

export default function BrandLogo({
  className = '',
  isLink = true,
  to = '/',
  adminMode = false,
}: BrandLogoProps) {
  // ক্যাশ স্টোর থেকে ইনস্ট্যান্টলি সেটিংস রিড করা (০ মিলিসেকেন্ড ফ্লিকার-ফ্রি)
  const { logoType, logoUrl, siteName, fetchSettings } = useSettingsStore();

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSettings();
    });
  }, [fetchSettings]);

  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      {logoType === 'image' && logoUrl ? (
        <img
          src={logoUrl}
          alt={siteName}
          className={`${adminMode ? 'h-8 max-w-32' : 'h-8 sm:h-10 max-w-40'} w-auto object-contain`}
        />
      ) : (
        <span className={`font-extrabold tracking-tight ${adminMode ? 'text-2xl text-white' : 'text-2xl sm:text-3xl text-primary'}`}>
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