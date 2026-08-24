import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  FileText, 
  Save, 
  Loader2, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';

// লিগ্যাল পেজসমূহের তালিকা
const LEGAL_PAGES = [
  { slug: 'privacy-policy', name: 'Privacy Policy' },
  { slug: 'terms', name: 'Terms & Conditions' },
  { slug: 'refund-policy', name: 'Refund Policy' },
  { slug: 'return-policy', name: 'Return Policy' },
  { slug: 'shipping-policy', name: 'Shipping Policy' },
  { slug: 'about-us', name: 'About Us' },
  { slug: 'faq', name: 'Frequently Asked Questions (FAQ)' },
];

export default function AdminLegalCMS() {
  const [activeSlug, setActiveSlug] = useState<string>('privacy-policy');
  const [title, setTitle] = useState<string>('Privacy Policy');
  const [content, setContent] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ফায়ারস্টোর থেকে সিলেক্ট করা লিগ্যাল পেজের ডেটা লোড করার ফাংশন
  const fetchPageContent = async (slug: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'legalPages', slug);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        setTitle(data.title || LEGAL_PAGES.find(p => p.slug === slug)?.name || '');
        setContent(data.content || '');
      } else {
        // ফায়ারস্টোরে না থাকলে ডিফল্ট টাইটেল দেবে
        setTitle(LEGAL_PAGES.find(p => p.slug === slug)?.name || '');
        setContent('');
      }
    } catch (error) {
      console.error('Error fetching legal content:', error);
      toast.error('Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPageContent(activeSlug);
    });
  }, [activeSlug]);

  // লিগ্যাল পেজ কন্টেন্ট ফায়ারস্টোরে সেভ করার হ্যান্ডলার
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Page title is required');
      return;
    }

    try {
      setIsSaving(true);
      const docRef = doc(db, 'legalPages', activeSlug);

      await setDoc(docRef, {
        slug: activeSlug,
        title: title.trim(),
        content: content.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success(`${title} saved successfully to Firestore!`);
    } catch (error) {
      console.error('Error saving legal content:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Helmet>
        <title>Legal Pages CMS | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Legal Pages CMS</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage and publish customer policies dynamically to Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Live Dynamic CMS
          </span>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {LEGAL_PAGES.map((page) => (
          <button
            key={page.slug}
            onClick={() => setActiveSlug(page.slug)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSlug === page.slug
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-navy hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* Editor Card */}
      <div className="bg-white rounded-2xl shadow-modern border border-gray-100 p-6 md:p-8">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading policy content...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Page Display Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Privacy Policy"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Content Textarea (HTML Supported) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy">
                  Policy Content (Supports HTML tags like &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;) *
                </label>
                <span className="text-[10px] text-gray-400">HTML Format</span>
              </div>
              <textarea
                rows={14}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write or paste your policy HTML content here..."
                className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 text-xs font-mono text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors leading-relaxed"
              />
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => fetchPageContent(activeSlug)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Form
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving to Firestore...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save & Publish Policy
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>

    </div>
  );
}