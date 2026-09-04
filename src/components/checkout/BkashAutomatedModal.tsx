import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Loader2, 
  ExternalLink, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { initiateBkashPayment } from '../../services/paymentService';

interface BkashAutomatedModalProps {
  amount: number;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (trxId: string, phone: string) => void;
}

export default function BkashAutomatedModal({
  amount,
  orderNumber,
  isOpen,
  onClose,
}: BkashAutomatedModalProps) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // অফিশিয়াল বিকাশ পেমেন্ট ইনিশিয়েট ও রিডাইরেক্ট
  const handleProceedToBkash = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);

      // আমাদের সার্ভারলেস ব্যাকএন্ড থেকে বিকাশ গেটওয়ে লিংক তৈরি
      const result = await initiateBkashPayment(orderNumber, amount);

      if (!result.success || !result.bkashURL) {
        throw new Error(result.message || 'বিকাশ গেটওয়েতে সংযোগ করা সম্ভব হয়নি। পুনরায় চেষ্টা করুন।');
      }

      toast.success('অফিশিয়াল বিকাশ গেটওয়েতে রিডাইরেক্ট করা হচ্ছে...');

      // সরাসরি বিকাশের অফিশিয়াল পেমেন্ট পোর্টালে রিডাইরেক্ট
      window.location.href = result.bkashURL;

    } catch (error: unknown) {
      console.error('bKash Checkout Error:', error);
      const err = error as Error;
      setErrorMessage(err.message || 'পেমেন্ট গেটওয়েতে সমস্যা দেখা দিয়েছে।');
      toast.error(err.message || 'পেমেন্ট শুরু করা যায়নি');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* bKash Branded Header */}
        <div className="bg-[#E2136E] text-white p-5 relative text-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-1 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-tight">bKash</span>
            <span className="text-[10px] uppercase font-bold bg-white text-[#E2136E] px-2 py-0.5 rounded-full">
              Official Gateway
            </span>
          </div>

          <p className="text-xs text-white/90 font-medium">Merchant: ISAR Marketplace</p>
          
          <div className="mt-3 py-2 px-5 bg-black/15 rounded-xl inline-block">
            <span className="text-[11px] text-white/80 block">পরিশোধের মোট পরিমাণ:</span>
            <span className="text-2xl font-black tracking-tight">৳{amount.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-white/70 mt-1">Invoice: {orderNumber}</p>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left flex items-start gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2 text-left bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 text-xs font-bold text-navy">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
              <span>নিরাপদ ও অফিশিয়াল পেমেন্ট</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed pl-6">
              পরবর্তী বাটনে চাপলে আপনাকে বিকাশের অফিশিয়াল সুরক্ষিত পেজে নিয়ে যাওয়া হবে। সেখানে আপনার বিকাশ নম্বর ও পিন দিয়ে নিরাপদে পেমেন্ট সম্পন্ন করুন।
            </p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleProceedToBkash}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 bg-[#E2136E] hover:bg-[#C20F5D] text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> সংযোগ করা হচ্ছে...
              </>
            ) : (
              <>
                <span>বিকাশ গেটওয়েতে যান</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Security Guarantee */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-brand-green" />
            <span>256-bit SSL Secured Official bKash Portal</span>
          </div>

        </div>

      </div>
    </div>
  );
}