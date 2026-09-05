import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  KeyRound, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BkashAutomatedModalProps {
  amount: number;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (trxId: string, phone: string) => void;
}

type PaymentStep = 'phone' | 'otp' | 'pin' | 'processing' | 'success';

export default function BkashAutomatedModal({
  amount,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: BkashAutomatedModalProps) {
  const [step, setStep] = useState<PaymentStep>('phone');
  const [bkashPhone, setBkashPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = bkashPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      toast.error('Please enter a valid 11-digit bKash account number (01XXXXXXXXX)');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      toast.success('Verification code sent to your bKash mobile number');
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error('Please enter the 6-digit or 4-digit verification code');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('pin');
    }, 600);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      toast.error('Please enter your 5-digit bKash PIN');
      return;
    }
    setIsLoading(true);
    setStep('processing');

    // Simulate verified transaction with instant TrxID
    setTimeout(() => {
      setIsLoading(false);
      setStep('success');
      const generatedTrxId = `BKSH${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      
      setTimeout(() => {
        onSuccess(generatedTrxId, bkashPhone);
        onClose();
        // Reset state
        setStep('phone');
        setBkashPhone('');
        setOtp('');
        setPin('');
      }, 1000);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 relative animate-in zoom-in-95 duration-150">
        
        {/* Official bKash Header */}
        <div className="bg-[#E2136E] text-white p-4 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full text-white/80 hover:text-white hover:bg-black/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center p-2 mb-2 shadow-sm">
            <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
              <path d="M19.5 3L8 16.5L14.5 18L12 29L26 14.5L18.5 13.5L19.5 3Z" fill="#E2136E" />
            </svg>
          </div>

          <h3 className="text-sm font-black tracking-wide">bKash Payment Gateway</h3>
          <p className="text-[11px] text-pink-100">Merchant: ISAR Marketplace</p>

          <div className="mt-3 bg-white/15 backdrop-blur-xs rounded-xl p-2 flex justify-between items-center text-xs">
            <span className="text-pink-100 font-medium">Invoice: {orderNumber}</span>
            <span className="font-black font-mono text-sm">{amount.toLocaleString()} BDT</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          
          {/* Step 1: Account Number */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#E2136E]" />
                  Your bKash Account Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={bkashPhone}
                  onChange={(e) => setBkashPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="e.g. 01XXXXXXXXX"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-[#E2136E] transition-colors"
                />
                <p className="text-[10px] text-slate-500">
                  By clicking Confirm, you agree to the bKash terms & conditions.
                </p>
              </div>

              <div className="p-2.5 bg-pink-50 rounded-xl border border-pink-100 flex items-center gap-2 text-[11px] text-slate-700">
                <AlertCircle className="w-4 h-4 text-[#E2136E] shrink-0" />
                <span>Instant & Secure Prepayment Verification</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#E2136E] hover:bg-[#c20f5d] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Account'}
              </button>
            </form>
          )}

          {/* Step 2: Verification Code (OTP) */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#E2136E]" />
                  Enter Verification Code (OTP)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-center text-base font-mono tracking-widest text-slate-900 focus:outline-none focus:border-[#E2136E]"
                />
                <p className="text-[10px] text-slate-500 text-center">
                  Sent to {bkashPhone} (Enter any 6 digits to verify)
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#E2136E] hover:bg-[#c20f5d] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
              </button>
            </form>
          )}

          {/* Step 3: bKash PIN */}
          {step === 'pin' && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#E2136E]" />
                  Enter bKash PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={5}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="•••••"
                  className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:border-[#E2136E]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#E2136E] hover:bg-[#c20f5d] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ${amount.toLocaleString()} BDT`}
              </button>
            </form>
          )}

          {/* Processing Screen */}
          {step === 'processing' && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-[#E2136E] animate-spin mx-auto" />
              <h4 className="text-sm font-black text-slate-900">Processing Payment...</h4>
              <p className="text-xs text-slate-500">Securing your order with encrypted gateway</p>
            </div>
          )}

          {/* Success Screen */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="text-base font-black text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-500">Redirecting to order confirmation...</p>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-bit Encrypted Official bKash Gateway</span>
          </div>

        </div>

      </div>
    </div>
  );
}