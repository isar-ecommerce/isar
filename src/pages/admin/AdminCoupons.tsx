import { useState, useEffect, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Copy, 
  Check, 
  Loader2, 
  Calendar, 
  Percent, 
  DollarSign, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  X 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { 
  getCoupons, 
  createCoupon, 
  updateCouponStatus, 
  deleteCoupon 
} from '../../services/couponService';
import type { Coupon, CreateCouponParams, CouponDiscountType } from '../../types/coupon';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // React 19 পিওর রেন্ডার স্টেট (Purity Compliance)
  const [currentTime] = useState<number>(() => Date.now());

  // নতুন কুপন ফরম স্টেট
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [minOrderAmount, setMinOrderAmount] = useState<string>('500');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('100');
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ১. ফায়ারস্টোর থেকে কুপন ফেচ করা (React 19 সেফ)
  const fetchCouponsList = async () => {
    try {
      setLoading(true);
      const data = await getCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        fetchCouponsList();
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // কুপন কোড ক্লিপবোর্ডে কপি করা
  const handleCopyCode = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    toast.success(`Copied "${couponCode}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // কুপন স্ট্যাটাস টগল (Active / Inactive)
  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCouponStatus(coupon.id, newStatus);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, status: newStatus } : c))
      );
      toast.success(`Coupon status updated to ${newStatus}`);
    } catch (error) {
      console.error('Toggle status error:', error);
      toast.error('Failed to update status');
    }
  };

  // কুপন ডিলিট হ্যান্ডলার
  const handleDelete = async (couponId: string, couponCode: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${couponCode}"?`)) return;

    try {
      await deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      toast.success(`Coupon "${couponCode}" deleted successfully`);
    } catch (error) {
      console.error('Delete coupon error:', error);
      toast.error('Failed to delete coupon');
    }
  };

  // নতুন কুপন সাবমিট
  const handleCreateCoupon = async (e: FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      setIsSubmitting(true);
      const params: CreateCouponParams = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discountType,
        discountValue: Number(discountValue) || 0,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        expiryDate,
      };

      const newCoupon = await createCoupon(params);
      setCoupons((prev) => [newCoupon, ...prev]);
      toast.success(`Coupon "${newCoupon.code}" created successfully!`);

      // ফরম রিসেট ও মোডাল ক্লোজ
      setCode('');
      setDescription('');
      setIsModalOpen(false);
    } catch (error: unknown) {
      console.error('Create coupon error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to create coupon';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // তারিখ ফরম্যাট হেল্পার
  const formatDate = (dateVal: unknown): string => {
    if (!dateVal) return 'No Expiry';
    try {
      return new Date(dateVal as string | number | Date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Valid Date';
    }
  };

  // কুপন এক্সপায়ারি চেক (React 19 Pure Implementation)
  const isExpired = (expiryVal: unknown): boolean => {
    if (!expiryVal) return false;
    try {
      return new Date(expiryVal as string | number | Date).getTime() < currentTime;
    } catch {
      return false;
    }
  };

  const activeCount = coupons.filter((c) => c.status === 'active' && !isExpired(c.expiryDate)).length;
  const totalUses = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Promo Coupons & Vouchers | ISAR Admin</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-navy">Promo Coupons & Vouchers</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-black">
              {coupons.length} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Create discount codes, set campaign limits, and boost marketplace sales</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCouponsList}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Active Promo Campaigns</span>
            <span className="text-2xl sm:text-3xl font-black text-navy">{activeCount}</span>
            <span className="text-[11px] text-brand-green font-bold flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" /> Live on Checkout
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Total Discount Redemptions</span>
            <span className="text-2xl sm:text-3xl font-black text-navy">{totalUses}</span>
            <span className="text-[11px] text-primary font-bold block mt-1">
              Used by Customers
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-modern border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 block mb-1">Campaign Strategy</span>
            <span className="text-base sm:text-lg font-black text-navy">% & ৳ Flat Offers</span>
            <span className="text-[11px] text-brand-gold font-bold block mt-1">
              Instant Cart Calculations
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold shrink-0">
            <Percent className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Coupons List Section */}
      <div className="bg-white rounded-3xl shadow-modern border border-gray-100 p-6 space-y-6">
        <h2 className="text-lg font-black text-navy">All Promotional Coupons</h2>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading coupon records...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
              <Ticket className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-navy">No Coupons Created Yet</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Create your first promotional discount voucher to attract more customer orders.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:bg-primary-dark transition-all"
            >
              + Create First Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-black text-[10px]">
                  <th className="pb-3 px-3">Coupon Code</th>
                  <th className="pb-3 px-3">Discount Value</th>
                  <th className="pb-3 px-3">Min Spend</th>
                  <th className="pb-3 px-3">Usage</th>
                  <th className="pb-3 px-3">Expiry Date</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expiryDate);
                  const isCopied = copiedCode === coupon.code;

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/80 transition-colors">
                      
                      {/* Code Badge */}
                      <td className="py-4 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-black text-xs border border-primary/20 tracking-wider">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="p-1 text-gray-400 hover:text-navy rounded transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {coupon.description && (
                          <span className="text-[10px] text-gray-400 block mt-1 line-clamp-1">{coupon.description}</span>
                        )}
                      </td>

                      {/* Discount Details */}
                      <td className="py-4 px-3 font-extrabold text-navy text-xs sm:text-sm">
                        {coupon.discountType === 'percentage' ? (
                          <span className="text-primary font-black">{coupon.discountValue}% OFF</span>
                        ) : (
                          <span className="text-brand-green font-black">৳{coupon.discountValue} Flat OFF</span>
                        )}
                        {coupon.maxDiscountAmount && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            Max: ৳{coupon.maxDiscountAmount}
                          </span>
                        )}
                      </td>

                      {/* Min Spend */}
                      <td className="py-4 px-3 font-bold text-gray-700">
                        ৳{coupon.minOrderAmount?.toLocaleString() || 0}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-3">
                        <span className="font-bold text-navy">{coupon.usedCount || 0}</span>
                        <span className="text-gray-400"> / {coupon.usageLimit ? coupon.usageLimit : '∞'}</span>
                      </td>

                      {/* Expiry */}
                      <td className="py-4 px-3 font-medium text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(coupon.expiryDate)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        {expired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-100 text-gray-500">
                            Expired
                          </span>
                        ) : coupon.status === 'active' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-green/10 text-brand-green border border-brand-green/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-600 border border-red-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(coupon)}
                            disabled={expired}
                            className="p-1.5 text-gray-500 hover:text-primary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={coupon.status === 'active' ? 'Deactivate coupon' : 'Activate coupon'}
                          >
                            {coupon.status === 'active' ? (
                              <ToggleRight className="w-6 h-6 text-brand-green" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-gray-400" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDelete(coupon.id, coupon.code)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete coupon"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-black text-navy flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Create Promo Coupon
              </h3>
              <p className="text-xs text-gray-500">Configure new discount campaign for ISAR Marketplace</p>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              
              {/* Code */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EID2026 or ISAR50"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary uppercase"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Eid special 10% discount on all products"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Discount Type Radio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Discount Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'border-primary bg-primary/10 text-primary shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      discountType === 'fixed'
                        ? 'border-brand-green bg-brand-green/10 text-brand-green shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Fixed Amount (৳)
                  </button>
                </div>
              </div>

              {/* Value & Min Spend */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy block">
                    {discountType === 'percentage' ? 'Discount (%) *' : 'Discount Amount (৳) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy block">Min Order Spend (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Max Discount Cap (for percentage) & Usage Limit */}
              <div className="grid grid-cols-2 gap-3">
                {discountType === 'percentage' ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy block">Max Discount Cap (৳)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                    />
                  </div>
                ) : null}

                <div className={`space-y-1 ${discountType !== 'percentage' ? 'col-span-2' : ''}`}>
                  <label className="text-xs font-bold text-navy block">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy block">Campaign Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-navy bg-gray-50 focus:bg-white focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating Coupon...
                  </>
                ) : (
                  'Create Promo Coupon'
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}