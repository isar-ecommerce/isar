import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { 
  Star, 
  CheckCircle2, 
  ThumbsUp, 
  Camera, 
  X, 
  Loader2, 
  MessageSquare, 
  User, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { uploadImageToCloudinary } from '../../cloudinary/upload';
import { 
  getProductReviews, 
  submitProductReview, 
  calculateReviewSummary 
} from '../../services/reviewService';
import type { Review, ProductReviewSummary } from '../../types/review';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { user } = useAuthStore();
  const { language } = useSettingsStore();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [filterWithPhotosOnly, setFilterWithPhotosOnly] = useState<boolean>(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // পেজ লম্বা না করার জন্য শুরুতে ৪টি রিভিউ দেখাবে (২x২ গ্রিড)
  const [showAllReviews, setShowAllReviews] = useState<boolean>(false);

  // লাইটবক্স ফটো প্রিভিউ স্টেট
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // রিভিউ ফরম স্টেট
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({});

  // বাই-লিঙ্গুয়াল টেক্সট ডিকশনারি (English by default)
  const t = {
    en: {
      title: 'Customer Reviews & Ratings',
      verifiedCount: (count: number) => `${count} Verified Reviews`,
      subtitle: `Genuine feedback and real photos from verified buyers of ${productName}`,
      writeBtn: 'Write a Review',
      avgRatingLabel: 'Average Customer Rating',
      starText: 'Star',
      customerPhotos: 'Photos From Real Customers',
      allPhotos: 'Show All',
      filterPhotos: 'Filter with photos only',
      noReviews: 'No Reviews Found Yet',
      noReviewsSub: 'Be the first genuine buyer to share your experience with this product!',
      verifiedBuyer: 'Verified Buyer',
      helpful: 'Helpful',
      showLess: 'Show Less Reviews',
      showAll: (count: number) => `See All Reviews (${count})`,
      modalTitle: 'Write a Product Review',
      ratePrompt: 'Select Your Rating *',
      starsCount: 'out of 5 Stars',
      experiencePrompt: 'Your Review & Feedback *',
      commentPlaceholder: 'How was the product quality, packaging, and delivery speed?',
      photosPrompt: 'Upload Real Photos (Max 4)',
      addPhotoText: 'Add Photo',
      submitBtn: 'Submit Review',
      submittingText: 'Submitting Review...',
      loginError: 'Please login to write a review',
      commentError: 'Please write your feedback about the product',
      maxPhotosError: 'You can upload a maximum of 4 photos',
      uploadSuccess: 'Photo uploaded successfully to cloud!',
      uploadError: 'Photo upload failed. Please try again.',
      successMsg: 'Thank you! Your verified review has been submitted.',
    },
    bn: {
      title: 'কাস্টমার রিভিউ ও রেটিং',
      verifiedCount: (count: number) => `${count} ভেরিফায়েড রিভিউ`,
      subtitle: `${productName}-এর প্রকৃত ক্রেতাদের আসল অভিজ্ঞতা ও ছবি`,
      writeBtn: 'মতামত দিন',
      avgRatingLabel: 'ক্রেতাদের গড় রেটিং',
      starText: 'স্টার',
      customerPhotos: 'ক্রেতাদের পাঠানো ছবি',
      allPhotos: 'সবগুলো দেখুন',
      filterPhotos: 'শুধুমাত্র ছবিসহ ফিল্টার',
      noReviews: 'কোনো রিভিউ পাওয়া যায়নি',
      noReviewsSub: 'এই পণ্যটি কেনার পর প্রথম রিভিউটি আপনিই দিন!',
      verifiedBuyer: 'ভেরিফায়েড ক্রেতা',
      helpful: 'দরকারী',
      showLess: 'কম রিভিউ দেখুন',
      showAll: (count: number) => `সব রিভিউ দেখুন (${count}টি)`,
      modalTitle: 'আপনার মতামত দিন',
      ratePrompt: 'রেটিং নির্বাচন করুন *',
      starsCount: 'স্টার',
      experiencePrompt: 'পণ্যের অভিজ্ঞতা *',
      commentPlaceholder: 'পণ্যের মান, ডেলিভারি ও প্যাকেজিং কেমন লেগেছে তা লিখুন...',
      photosPrompt: 'পণ্যের ছবি যুক্ত করুন (সর্বোচ্চ ৪টি)',
      addPhotoText: 'ছবি দিন',
      submitBtn: 'রিভিউ জমা দিন',
      submittingText: 'জমা দেওয়া হচ্ছে...',
      loginError: 'রিভিউ দিতে অনুগ্রহ করে লগইন করুন',
      commentError: 'অনুগ্রহ করে পণ্যের ব্যাপারে আপনার মতামত লিখুন',
      maxPhotosError: 'সর্বোচ্চ ৪টি ছবি আপলোড করা যাবে',
      uploadSuccess: 'ছবি সফলভাবে ক্লাউডে আপলোড হয়েছে!',
      uploadError: 'ছবি আপলোড ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।',
      successMsg: 'ধন্যবাদ! আপনার রিভিউ সফলভাবে যুক্ত হয়েছে।',
    }
  }[language];

  // ফায়ারস্টোর থেকে প্রোডাক্টের সব রিভিউ লোড করা
  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const data = await getProductReviews(productId);
        if (isMounted) {
          setReviews(data);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // রেটিং সামারি হিসাব
  const summary: ProductReviewSummary = useMemo(() => {
    return calculateReviewSummary(reviews);
  }, [reviews]);

  // কাস্টমারদের আপলোড করা সব আসল ছবির তালিকা
  const allCustomerPhotos = useMemo(() => {
    return reviews.flatMap((r) => r.images || []);
  }, [reviews]);

  // তারিখ ফরম্যাট হেল্পার
  const formatReviewDate = (timestamp: unknown): string => {
    if (!timestamp) return language === 'en' ? 'Recently' : 'সম্প্রতি';
    try {
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
        const dateObj = (timestamp as { toDate: () => Date }).toDate();
        return dateObj.toLocaleDateString(language === 'en' ? 'en-GB' : 'bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString(language === 'en' ? 'en-GB' : 'bn-BD', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      return language === 'en' ? 'Recently' : 'সম্প্রতি';
    }
    return language === 'en' ? 'Recently' : 'সম্প্রতি';
  };

  // ক্লাউডিনারি রিয়েল-টাইম ১:১ স্কয়ার ইমেজ আপলোড হ্যান্ডলার
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 4) {
      toast.error(t.maxPhotosError);
      return;
    }

    try {
      setIsUploadingToCloud(true);
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          return null;
        }
        return await uploadImageToCloudinary(file);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => Boolean(url));
      
      setUploadedImages((prev) => [...prev, ...validUrls]);
      toast.success(t.uploadSuccess);
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      toast.error(t.uploadError);
    } finally {
      setIsUploadingToCloud(false);
      e.target.value = '';
    }
  };

  // ছবি রিমুভ করা
  const removeImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // রিভিউ সাবমিট হ্যান্ডলার
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t.loginError);
      return;
    }

    if (!comment.trim()) {
      toast.error(t.commentError);
      return;
    }

    try {
      setIsSubmitting(true);
      const newReview = await submitProductReview({
        productId,
        userId: user.uid,
        userName: user.displayName || (language === 'en' ? 'Verified Buyer' : 'ভেরিফায়েড ক্রেতা'),
        userAvatar: user.photoURL || undefined,
        rating,
        comment,
        images: uploadedImages,
        isVerifiedPurchase: true,
      });

      setReviews((prev) => [newReview, ...prev]);
      toast.success(t.successMsg);
      
      setComment('');
      setRating(5);
      setUploadedImages([]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // হেল্পফুল আপভোট
  const toggleHelpful = (reviewId: string) => {
    setHelpfulVotes((prev) => {
      const isAlreadyVoted = prev[reviewId];
      if (isAlreadyVoted) {
        return { ...prev, [reviewId]: false };
      } else {
        toast.success(language === 'en' ? 'Marked as helpful!' : 'দরকারী হিসেবে চিহ্নিত!');
        return { ...prev, [reviewId]: true };
      }
    });
  };

  // ফিল্টার করা রিভিউ তালিকা
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (filterWithPhotosOnly && (!r.images || r.images.length === 0)) return false;
      if (selectedStarFilter !== null && Math.round(r.rating) !== selectedStarFilter) return false;
      return true;
    });
  }, [reviews, filterWithPhotosOnly, selectedStarFilter]);

  // শুরুতে মাত্র ৪টি রিভিউ দেখাবে (২x২ গ্রিড) যাতে পেজ লম্বা না হয়
  const displayedReviews = useMemo(() => {
    return showAllReviews ? filteredReviews : filteredReviews.slice(0, 4);
  }, [showAllReviews, filteredReviews]);

  return (
    <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-modern border border-gray-100 space-y-6 mt-10">
      
      {/* Top Header & Overview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-navy">{t.title}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-xs font-black flex items-center gap-1 border border-brand-green/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {t.verifiedCount(reviews.length)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              toast.error(t.loginError);
            } else {
              setIsModalOpen(true);
            }
          }}
          className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4" /> {t.writeBtn}
        </button>
      </div>

      {/* Compact Ratings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 bg-gray-50/80 rounded-2xl border border-gray-100 items-center">
        
        {/* Rating Score Card */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center pb-4 md:pb-0 md:border-r border-gray-200">
          <span className="text-4xl sm:text-5xl font-black text-navy tracking-tight">{summary.averageRating.toFixed(1)}</span>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(summary.averageRating)
                    ? 'fill-brand-gold text-brand-gold'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[11px] text-gray-500 font-bold">{reviews.length} {t.avgRatingLabel}</span>
        </div>

        {/* Compact Star Progress Bars */}
        <div className="md:col-span-8 space-y-1.5">
          {[5, 4, 3, 2, 1].map((starNum) => {
            const count = summary.ratingCounts[starNum as keyof typeof summary.ratingCounts] || 0;
            const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;

            return (
              <button
                key={starNum}
                onClick={() => setSelectedStarFilter(selectedStarFilter === starNum ? null : starNum)}
                className={`flex items-center gap-2.5 text-xs w-full transition-all px-2.5 py-1 rounded-lg cursor-pointer ${
                  selectedStarFilter === starNum ? 'bg-white shadow-xs ring-1 ring-primary' : 'hover:bg-gray-100/70'
                }`}
              >
                <span className="w-14 font-bold text-navy text-left">{starNum} {t.starText}</span>
                <div className="grow h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percentage}%` }}
                    className="h-full bg-linear-to-r from-brand-gold to-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
                <span className="w-14 text-right text-[11px] text-gray-500 font-bold shrink-0">{count} ({percentage}%)</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Customer Photos Strip */}
      {allCustomerPhotos.length > 0 && (
        <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-navy">
            <span className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary" /> {t.customerPhotos} ({allCustomerPhotos.length})
            </span>
            <button
              onClick={() => setFilterWithPhotosOnly(!filterWithPhotosOnly)}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              {filterWithPhotosOnly ? t.allPhotos : t.filterPhotos}
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {allCustomerPhotos.map((photoUrl, idx) => (
              <button
                key={idx}
                onClick={() => setPreviewImage(photoUrl)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white p-0.5 border border-gray-200 shrink-0 hover:border-primary hover:scale-105 transition-all cursor-pointer shadow-2xs"
              >
                <img src={photoUrl} alt="Customer product" className="w-full h-full object-cover rounded-lg" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Cards: ২-কলামের কমপ্যাক্ট গ্রিড */}
      <div>
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">{language === 'en' ? 'Loading reviews...' : 'রিভিউ লোড হচ্ছে...'}</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl space-y-2">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="text-sm font-bold text-navy">{t.noReviews}</h4>
            <p className="text-xs text-gray-400">{t.noReviewsSub}</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedReviews.map((review) => {
                const hasVoted = helpfulVotes[review.id] || false;
                const displayHelpfulCount = (review.helpfulCount || 0) + (hasVoted ? 1 : 0);

                return (
                  <div 
                    key={review.id} 
                    className="bg-gray-50/70 hover:bg-white rounded-2xl p-4 border border-gray-100 hover:border-gray-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs overflow-hidden shrink-0">
                            {review.userAvatar ? (
                              <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-navy">{review.userName}</span>
                              {review.isVerifiedPurchase && (
                                <CheckCircle2 className="w-3 h-3 text-brand-green" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{formatReviewDate(review.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= review.rating
                                  ? 'fill-brand-gold text-brand-gold'
                                  : 'fill-gray-200 text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 mt-2.5 leading-relaxed wrap-break-word">
                        {review.comment}
                      </p>

                      {review.images && review.images.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          {review.images.map((imgUrl, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewImage(imgUrl)}
                              className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0 hover:border-primary cursor-pointer"
                            >
                              <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => toggleHelpful(review.id)}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          hasVoted
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <ThumbsUp className={`w-3 h-3 ${hasVoted ? 'fill-current' : ''}`} />
                        <span>{t.helpful} ({displayHelpfulCount})</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredReviews.length > 4 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="px-5 py-2.5 bg-white border border-gray-200 hover:border-primary text-navy hover:text-primary rounded-xl text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {showAllReviews ? (
                    <>
                      <span>{t.showLess}</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>{t.showAll(filteredReviews.length)}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-navy hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-black text-navy">{t.modalTitle}</h3>
              <p className="text-xs text-gray-500 truncate">{productName}</p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-navy block mb-1">{t.ratePrompt}</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'fill-brand-gold text-brand-gold'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-navy ml-2">{rating} {t.starsCount}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-navy block mb-1">{t.experiencePrompt}</label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t.commentPlaceholder}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy block mb-1">{t.photosPrompt}</label>
                
                <div className="flex flex-wrap items-center gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                      <img src={img} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {uploadedImages.length < 4 && (
                    <label className={`w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary flex flex-col items-center justify-center gap-0.5 cursor-pointer bg-gray-50 hover:bg-primary/5 transition-all text-gray-400 hover:text-primary ${isUploadingToCloud ? 'opacity-50 pointer-events-none' : ''}`}>
                      {isUploadingToCloud ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span className="text-[9px] font-bold">{t.addPhotoText}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingToCloud}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingToCloud}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t.submittingText}
                  </>
                ) : (
                  t.submitBtn
                )}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/90 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative max-w-lg max-h-[80vh] p-2 bg-white rounded-2xl shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white rounded-full text-navy shadow-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={previewImage} 
              alt="Customer full view" 
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

    </section>
  );
}