import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  Clock, 
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// ডিফল্ট বাংলাদেশ-বান্ধব লিগ্যাল পলিসি কন্টেন্ট (যদি ফায়ারস্টোরে কাস্টম টেক্সট না থাকে)
const DEFAULT_POLICIES: Record<string, { title: string; content: string }> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `
      <h3>1. Information We Collect</h3>
      <p>At ISAR Marketplace, we collect personal information such as your name, mobile number, delivery address, and email when you place an order or create an account.</p>
      
      <h3>2. How We Use Your Information</h3>
      <p>We use your information solely to process your orders, deliver products via our delivery partners across Bangladesh, and improve customer service.</p>
      
      <h3>3. Data Protection & Security</h3>
      <p>Your personal data is encrypted and handled with strict confidentiality. We do not sell or share your phone number or address with unauthorized third parties.</p>
    `
  },
  'terms': {
    title: 'Terms & Conditions',
    content: `
      <h3>1. Agreement to Terms</h3>
      <p>By using ISAR Marketplace, you agree to comply with our purchasing guidelines, delivery terms, and customer conduct policies.</p>
      
      <h3>2. Product Pricing & Availability</h3>
      <p>All prices are listed in Bangladeshi Taka (BDT). Prices and stock availability are subject to change without prior notice.</p>
      
      <h3>3. Cash on Delivery (COD) Rules</h3>
      <p>Customers opting for Cash on Delivery must inspect the product parcel upon arrival and pay the designated rider before opening sealed packages unless specified otherwise.</p>
    `
  },
  'refund-policy': {
    title: 'Refund Policy',
    content: `
      <h3>1. Refund Eligibility</h3>
      <p>If you receive a defective, damaged, or incorrect item, you are eligible for a full refund or product replacement.</p>
      
      <h3>2. Processing Time</h3>
      <p>Approved refunds for online payments or mobile banking (bKash/Nagad) will be processed within 5 to 7 working days.</p>
      
      <h3>3. Shipping Fee Refunds</h3>
      <p>Delivery charges are non-refundable unless the error was made on our part during shipping.</p>
    `
  },
  'return-policy': {
    title: 'Return Policy',
    content: `
      <h3>1. Return Window</h3>
      <p>You can request a product return within 7 days of receiving your order.</p>
      
      <h3>2. Condition for Return</h3>
      <p>The product must be unused, unwashed, with all original tags, accessories, and packaging intact.</p>
      
      <h3>3. How to Initiate a Return</h3>
      <p>Contact our customer support at support@isar.com.bd or call our helpline with your Order ID.</p>
    `
  },
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    content: `
      <h3>1. Delivery Coverage</h3>
      <p>ISAR delivers products to all 64 districts across Bangladesh.</p>
      
      <h3>2. Delivery Timeline</h3>
      <p>Inside Dhaka: 24 to 48 Hours.<br/>Outside Dhaka: 2 to 4 Working Days.</p>
      
      <h3>3. Delivery Charges</h3>
      <p>Inside Dhaka City: ৳60<br/>Outside Dhaka City: ৳120</p>
    `
  },
  'about-us': {
    title: 'About ISAR',
    content: `
      <h3>Welcome to ISAR Marketplace</h3>
      <p>ISAR is Bangladesh's trustworthy, clean, and corporate e-commerce marketplace dedicated to providing authentic quality products with fast delivery.</p>
      <p>Our mission is to build a modern, customer-first platform where buyers, vendors, and partners thrive together with transparency and trust.</p>
    `
  },
  'faq': {
    title: 'Frequently Asked Questions',
    content: `
      <h3>Q: How do I place an order?</h3>
      <p>A: Select your product, click 'Add to Cart', proceed to Checkout, fill in your delivery address in Bangladesh, and confirm via Cash on Delivery.</p>
      
      <h3>Q: What are the payment methods?</h3>
      <p>A: We accept Cash on Delivery (COD), bKash, Nagad, and digital payment cards.</p>
    `
  }
};

export default function LegalPage() {
  const location = useLocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [pageData, setPageData] = useState<{ title: string; content: string }>({ title: 'Policy', content: '' });

  // URL পাথ থেকে স্লাগ বের করা (যেমন: /privacy-policy -> privacy-policy)
  const slug = location.pathname.replace('/', '') || 'privacy-policy';

  useEffect(() => {
    const fetchLegalPage = async () => {
      try {
        setLoading(true);
        // ফায়ারস্টোর থেকে ডায়নামিক কনটেন্ট রিড করা
        const docRef = doc(db, 'legalPages', slug);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          setPageData({
            title: snapshot.data().title || DEFAULT_POLICIES[slug]?.title || 'Policy',
            content: snapshot.data().content || DEFAULT_POLICIES[slug]?.content || '',
          });
        } else if (DEFAULT_POLICIES[slug]) {
          // ফায়ারস্টোরে না থাকলে প্রফেশনাল ডিফল্ট কন্টেন্ট দেখাবে
          setPageData(DEFAULT_POLICIES[slug]);
        } else {
          setPageData({
            title: 'Customer Policy',
            content: '<p>Content for this page is being updated by admin.</p>',
          });
        }
      } catch (error) {
        console.error('Error fetching legal page:', error);
        if (DEFAULT_POLICIES[slug]) {
          setPageData(DEFAULT_POLICIES[slug]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLegalPage();
  }, [slug]);

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>{`${pageData.title} | ISAR Marketplace`}</title>
        <meta name="description" content={`Official ${pageData.title} of ISAR Marketplace Bangladesh.`} />
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
        </div>

        {/* Policy Content Card */}
        <div className="bg-white rounded-2xl shadow-modern border border-gray-100 p-6 md:p-10 space-y-6">
          
          <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-navy">{pageData.title}</h1>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Official ISAR Customer Guidelines
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <span className="text-xs text-gray-500 font-medium">Loading policy details...</span>
            </div>
          ) : (
            <div 
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: pageData.content }}
            />
          )}

        </div>

      </div>
    </div>
  );
}