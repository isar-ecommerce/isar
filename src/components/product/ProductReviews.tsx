import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [filterWithPhotosOnly, setFilterWithPhotosOnly] = useState<boolean>(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // লাইটবক্স ফটো প্রিভিউ স্টেট
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // রিভিউ ফরম স্টেট
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<string, boolean>>({});

  // ১. ফায়ারস্টোর থেকে প্রোডাক্টের সব রিভিউ লোড করা (React 19 সেফ)
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

    Promise.resolve().then(() => {
      fetchReviews();
    });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // রেটিং সামারি হিসাব
  const summary: ProductReviewSummary = calculateReviewSummary(reviews);

  // সব কাস্টমারদের আপলোড করা ছবিগুলো সংগ্রহ করা
  const allCustomerPhotos = reviews.flatMap((r) => r.images || []);

  // তারিখ ফরম্যাট হেল্পার ফাংশন
  const formatReviewDate = (timestamp: unknown): string => {
    if (!timestamp) return 'Recently';
    try {
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
        const dateObj = (timestamp as { toDate: () => Date }).toDate();
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      return 'Recently';
    }
    return 'Recently';
  };

  // ফটো কম্প্রেশন ও বেস৬৪ কনভার্টার (Canvas API)
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 4) {
      toast.error('You can upload a maximum of 4 photos');
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload valid image files (JPG, PNG, WEBP)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = (height * maxDim) / width;
            width = maxDim;
          } else if (height > maxDim) {
            width = (width * maxDim) / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setUploadedImages((prev) => [...prev, compressedBase64]);
        };
      };
      reader.readAsDataURL(file);
    });
  };

  // আপলোড করা ছবি রিমুভ করা
  const removeImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // রিভিউ সাবমিট হ্যান্ডলার
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to write a review');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a comment about the product');
      return;
    }

    try {
      setIsSubmitting(true);
      const newReview = await submitProductReview({
        productId,
        userId: user.uid,
        userName: user.displayName || 'Verified Buyer',
        userAvatar: user.photoURL || undefined,
        rating,
        comment,
        images: uploadedImages,
        isVerifiedPurchase: true,
      });

      setReviews((prev) => [newReview, ...prev]);
      toast.success('Thank you! Your review has been submitted.');
      
      // ফরম রিসেট ও মোডাল ক্লোজ
      setComment('');
      setRating(5);
      setUploadedImages([]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // হেল্পফুল আপভোট টগল
  const toggleHelpful = (reviewId: string) => {
    setHelpfulVotes((prev) => {
      const isAlreadyVoted = prev[reviewId];
      if (isAlreadyVoted) {
        toast('Vote removed', { icon: 'ℹ️' });
        return { ...prev, [reviewId]: false };
      } else {
        toast.success('Marked as helpful!');
        return { ...prev, [reviewId]: true };
      }
    });
  };

  // ফিল্টার করা রিভিউ তালিকা
  const filteredReviews = reviews.filter((r) => {
    if (filterWithPhotosOnly && (!r.images || r.images.length === 0)) return false;
    if (selectedStarFilter !== null && Math.round(r.rating) !== selectedStarFilter) return false;
    return true;
  });

  return (
    <section className="bg-white rounded-3xl p-5 sm:p-8 shadow-modern border border-gray-100 space-y-8 mt-10">
      
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-navy">Customer Reviews</h2>
            <span className="px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-black flex items-center gap-1 border border-brand-green/20">
              <ShieldCheck className="w-3.5 h-3.5" /> {reviews.length} Verified Reviews
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Real ratings and actual photos from genuine buyers of {productName}</p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              toast.error('Please login to write a review');
            } else {
              setIsModalOpen(true);
            }
          }}
          className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4" /> Write a Review
        </button>
      </div>

      {/* Ratings Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 bg-gray-50/80 rounded-3xl border border-gray-100">
        
        {/* Overall Rating Box */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b lg:border-b-0 lg:border-r border-gray-200">
          <span className="text-5xl sm:text-6xl font-black text-navy tracking-tight">{summary.averageRating.toFixed(1)}</span>
          
          <div className="flex items-center gap-1.5 my-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= Math.round(summary.averageRating)
                    ? 'fill-brand-gold text-brand-gold'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-gray-500 font-bold">Based on {reviews.length} genuine customer rating(s)</span>
        </div>

        {/* Star Progress Bars */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((starNum) => {
            const count = summary.ratingCounts[starNum as keyof typeof summary.ratingCounts] || 0;
            const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;

            return (
              <button
                key={starNum}
                onClick={() => setSelectedStarFilter(selectedStarFilter === starNum ? null : starNum)}
                className={`flex items-center gap-3 text-xs w-full group text-left transition-all p-2 rounded-xl cursor-pointer ${
                  selectedStarFilter === starNum ? 'bg-white shadow-sm ring-2 ring-primary' : 'hover:bg-gray-100/80'
                }`}
              >
                <div className="flex items-center gap-1 w-14 shrink-0 font-bold text-navy">
                  <span>{starNum} Star</span>
                  <Star className="w-3.5 h-3.5 fill-brand-gold text-brand-gold" />
                </div>

                <div className="grow h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percentage}%` }}
                    className="h-full bg-linear-to-r from-brand-gold to-amber-500 rounded-full transition-all duration-500"
                  />
                </div>

                <span className="w-12 text-right text-gray-500 font-bold shrink-0">{count} ({percentage}%)</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Customer Uploaded Photos Gallery Strip */}
      {allCustomerPhotos.length > 0 && (
        <div className="space-y-3 p-5 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-navy flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" /> Photos From Real Customers ({allCustomerPhotos.length})
            </h3>
            <button
              onClick={() => setFilterWithPhotosOnly(!filterWithPhotosOnly)}
              className={`text-xs font-bold transition-colors cursor-pointer ${
                filterWithPhotosOnly ? 'text-primary underline' : 'text-gray-500 hover:text-navy'
              }`}
            >
              {filterWithPhotosOnly ? 'Showing with photos only (Clear)' : 'Filter with photos'}
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin pt-1">
            {allCustomerPhotos.map((photoUrl, idx) => (
              <button
                key={idx}
                onClick={() => setPreviewImage(photoUrl)}
                className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-white p-1 border-2 border-gray-200 shrink-0 hover:border-primary hover:scale-105 transition-all cursor-pointer shadow-xs"
              >
                <img src={photoUrl} alt="Customer product" className="w-full h-full object-cover rounded-xl" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List Area */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading genuine reviews...</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-navy">No Reviews Found</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {filterWithPhotosOnly || selectedStarFilter
                ? 'No reviews match your selected filter criteria.'
                : 'Be the first to share your experience with this authentic product!'}
            </p>
            {(filterWithPhotosOnly || selectedStarFilter !== null) && (
              <button
                onClick={() => {
                  setFilterWithPhotosOnly(false);
                  setSelectedStarFilter(null);
                }}
                className="text-xs font-bold text-primary underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const hasVoted = helpfulVotes[review.id] || false;
              const displayHelpfulCount = (review.helpfulCount || 0) + (hasVoted ? 1 : 0);

              return (
                <div 
                  key={review.id} 
                  className="bg-gray-50/50 hover:bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all space-y-3.5"
                >
                  
                  {/* Reviewer Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs overflow-hidden shrink-0 border border-primary/20">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-navy">{review.userName}</span>
                          {review.isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-black border border-brand-green/20">
                              <CheckCircle2 className="w-3 h-3" /> Verified Buyer
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? 'fill-brand-gold text-brand-gold'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatReviewDate(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleHelpful(review.id)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        hasVoted
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                      <span>Helpful ({displayHelpfulCount})</span>
                    </button>
                  </div>

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed wrap-break-word font-normal pl-0 sm:pl-13">
                    {review.comment}
                  </p>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex items-center gap-3 pt-1 pl-0 sm:pl-13 flex-wrap">
                      {review.images.map((imgUrl, i) => (
                        <button
                          key={i}
                          onClick={() => setPreviewImage(imgUrl)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white p-1 border-2 border-gray-200 shrink-0 hover:border-primary hover:scale-105 transition-all cursor-pointer shadow-xs"
                        >
                          <img src={imgUrl} alt="Review attachment" className="w-full h-full object-cover rounded-xl" />
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Write a Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-6">
              <h3 className="text-lg sm:text-xl font-black text-navy">Write a Review</h3>
              <p className="text-xs text-gray-500">{productName}</p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5">
              
              {/* Star Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy block">Overall Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                          star <= rating
                            ? 'fill-brand-gold text-brand-gold'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-extrabold text-navy ml-2">{rating} out of 5 Stars</span>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Your Review & Experience *</label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How was the quality, delivery speed, and overall value of this product?"
                  className="w-full p-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-xs sm:text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {/* Photos Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy block">Upload Real Product Photos (Max 4)</label>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={img} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full transition-opacity shadow-sm cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {uploadedImages.length < 4 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary flex flex-col items-center justify-center gap-1 cursor-pointer bg-gray-50 hover:bg-primary/5 transition-all text-gray-400 hover:text-primary">
                      <Camera className="w-5 h-5" />
                      <span className="text-[9px] font-bold">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Review...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Full Size Image Lightbox Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/90 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="relative max-w-2xl max-h-[85vh] p-2 bg-white rounded-3xl shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white rounded-full text-navy shadow-lg hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="Customer full view" 
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

    </section>
  );
}