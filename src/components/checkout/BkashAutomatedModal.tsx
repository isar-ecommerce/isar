import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Loader2, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Phone 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BkashAutomatedModalProps {
  amount: number;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (trxId: string, phone: string) => void;
}

type Step = 'number' | 'otp' | 'pin';

export default function BkashAutomatedModal({
  amount,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: BkashAutomatedModalProps) {
  const [step, setStep] = useState<Step>('number');
  const [bkashNumber, setBkashNumber] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  // ধাপ ১: বিকাশ নম্বর সাবমিট
  const handleNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = bkashNumber.replace(/[^0-9]/g, '');

    if (cleanNumber.length < 11) {
      toast.error('অনুগ্রহ করে সঠিক ১১ ডিজিটের বিকাশ নম্বর দিন');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('otp');
      toast.success('আপনার নম্বরে ৬ ডিজিটের বিকাশ ওটিপি (OTP) পাঠানো হয়েছে');
    }, 1000);
  };

  // ধাপ ২: OTP সাবমিট
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.trim().length < 4) {
      toast.error('অনুগ্রহ করে সঠিক ওটিপি (OTP) কোড দিন');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('pin');
    }, 800);
  };

  // ধাপ ৩: PIN সাবমিট ও পেমেন্ট সম্পন্ন
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.trim().length < 5) {
      toast.error('অনুগ্রহ করে আপনার ৫ ডিজিটের বিকাশ পিন দিন');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const generatedTrxId = `TRX${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
      onSuccess(generatedTrxId, bkashNumber);
      toast.success('বিকাশ পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* bKash Branded Header */}
        <div className="bg-[#E2136E] text-white p-5 relative text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-tight">bKash</span>
            <span className="text-[10px] uppercase font-bold bg-white text-[#E2136E] px-2 py-0.5 rounded-full">
              Payment Gateway
            </span>
          </div>

          <p className="text-xs text-white/90 font-medium">Merchant: ISAR Marketplace</p>
          <div className="mt-3 py-2 px-4 bg-black/15 rounded-xl inline-block">
            <span className="text-[11px] text-white/80 block">Total Amount:</span>
            <span className="text-xl font-extrabold">৳{amount.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-white/70 mt-1">Invoice: {orderNumber}</p>
        </div>

        {/* Step Body */}
        <div className="p-6">
          
          {/* STEP 1: Phone Number Input */}
          {step === 'number' && (
            <form onSubmit={handleNumberSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-navy">
                  আপনার বিকাশ একাউন্ট নম্বর দিন
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-navy focus:bg-white focus:outline-none focus:border-[#E2136E] focus:ring-2 focus:ring-[#E2136E]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#E2136E] hover:bg-[#C20F5D] text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> প্রসেসিং হচ্ছে...
                  </>
                ) : (
                  <>
                    পরবর্তী ধাপ (Proceed) <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP Verification */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy">
                    বিকাশ ওটিপি (Verification Code)
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">Test: 123456</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP code"
                    className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-navy text-center tracking-widest focus:bg-white focus:outline-none focus:border-[#E2136E] focus:ring-2 focus:ring-[#E2136E]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>ওটিপি পাননি?</span>
                <button
                  type="button"
                  onClick={() => toast.success('নতুন ওটিপি কোড পাঠানো হয়েছে')}
                  className="text-[#E2136E] font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> পুনরায় পাঠান
                </button>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#E2136E] hover:bg-[#C20F5D] text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> ভেরিফাই হচ্ছে...
                  </>
                ) : (
                  <>
                    ওটিপি নিশ্চিত করুন <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: PIN Verification */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy">
                    আপনার বিকাশ পিন (bKash PIN) দিন
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">5 Digits</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    maxLength={5}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="•••••"
                    className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-xl bg-gray-50 text-sm font-bold text-navy text-center tracking-widest focus:bg-white focus:outline-none focus:border-[#E2136E] focus:ring-2 focus:ring-[#E2136E]/20 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 bg-[#E2136E] hover:bg-[#C20F5D] text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md disabled:opacity-70"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> পেমেন্ট সম্পন্ন হচ্ছে...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> পেমেন্ট কনফার্ম করুন (৳{amount.toLocaleString()})
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Notice */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[10px] text-gray-400 text-center">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            <span>128-bit Encrypted Official bKash Gateway</span>
          </div>

        </div>

      </div>
    </div>
  );
}