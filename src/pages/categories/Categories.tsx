import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, 
  Search, 
  Loader2, 
  LayoutGrid, 
  FolderTree 
} from 'lucide-react';
import { getCategories } from '../../services/productService';
import { getCategoryIconConfig } from '../../utils/categoryIcons';
import type { Category } from '../../types/product';

// প্রাথমিক ডিফল্ট ক্যাটাগরি তালিকা
const INITIAL_CATEGORIES: Category[] = [
  { id: 'smartphones', name: 'Smartphones & Mobile', slug: 'smartphones', status: 'active', order: 1 },
  { id: 'laptops', name: 'Laptops & Computers', slug: 'laptops', status: 'active', order: 2 },
  { id: 'watches', name: 'Smart Watches & Bands', slug: 'watches', status: 'active', order: 3 },
  { id: 'audio', name: 'Headphones & Audio', slug: 'audio', status: 'active', order: 4 },
  { id: 'cameras', name: 'Cameras & Photography', slug: 'cameras', status: 'active', order: 5 },
  { id: 'fashion', name: 'Men & Women Fashion', slug: 'fashion', status: 'active', order: 6 },
];

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        if (isMounted) {
          const activeCustom = data.filter(c => c.status === 'active');
          // ডিফল্ট ক্যাটাগরি এবং আপনার তৈরি করা কাস্টম ক্যাটাগরি (যেমন: Bag) একসাথে মার্জ করা
          const merged = [
            ...INITIAL_CATEGORIES.filter(ic => !activeCustom.some(ac => ac.slug === ic.slug)),
            ...activeCustom
          ].sort((a, b) => (a.order || 0) - (b.order || 0));

          setCategories(merged);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
        if (isMounted) {
          setCategories(INITIAL_CATEGORIES);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchCategories();
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>All Categories | ISAR Marketplace</title>
        <meta name="description" content="Browse all product categories at ISAR Bangladesh." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-navy">All Categories</h1>
              <p className="text-xs text-gray-500 mt-0.5">Explore our wide range of product collections</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-xs text-navy focus:outline-none focus:border-primary transition-colors shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading categories...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-modern border border-gray-100">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Categories Found</h3>
            <p className="text-xs text-gray-500">Try searching with a different keyword.</p>
          </div>
        ) : (
          /* Responsive Grid - Full Category Names with Auto-Icon Engine */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredCategories.map((cat) => {
              // নাম অনুযায়ী স্বয়ংক্রিয়ভাবে মানানসই আইকন ও কালার নির্ধারণ
              const { icon: Icon, color } = getCategoryIconConfig(cat.name || cat.slug);
              
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.id}`}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-modern hover:shadow-modern-lg transition-all flex flex-col items-center justify-between text-center group min-h-44 sm:min-h-48"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  
                  {/* পুরো নাম কোনো প্রকার ডট ডট ছাড়া স্পষ্টভাবে দেখাবে */}
                  <span className="font-bold text-navy text-xs sm:text-sm text-center leading-snug wrap-break-word line-clamp-2 px-1 mb-2">
                    {cat.name}
                  </span>

                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1 mt-auto">
                    Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}