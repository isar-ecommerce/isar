import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  FolderTree, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Search, 
  X 
} from 'lucide-react';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import type { Category } from '../../types/product';

// প্রাথমিক ৬টি ডিফল্ট ক্যাটাগরি
const INITIAL_CATEGORIES: Category[] = [
  { id: 'smartphones', name: 'Smartphones & Mobile', slug: 'smartphones', status: 'active', order: 1 },
  { id: 'laptops', name: 'Laptops & Computers', slug: 'laptops', status: 'active', order: 2 },
  { id: 'watches', name: 'Smart Watches & Bands', slug: 'watches', status: 'active', order: 3 },
  { id: 'audio', name: 'Headphones & Audio', slug: 'audio', status: 'active', order: 4 },
  { id: 'cameras', name: 'Cameras & Photography', slug: 'cameras', status: 'active', order: 5 },
  { id: 'fashion', name: 'Men & Women Fashion', slug: 'fashion', status: 'active', order: 6 },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // মডাল স্টেট
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [orderNum, setOrderNum] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ক্যাটাগরি লোড করা ও ইন-মেমোরি স্মার্ট মার্জ
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'categories'));
      const firestoreList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];

      // ডিফল্ট ক্যাটাগরি এবং আপনার তৈরি করা কাস্টম ক্যাটাগরি (যেমন: Bag) একসাথে মার্জ করা
      const merged = [
        ...INITIAL_CATEGORIES.filter(ic => !firestoreList.some(fc => fc.slug === ic.slug)),
        ...firestoreList
      ].sort((a, b) => (a.order || 0) - (b.order || 0));

      setCategories(merged);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories(INITIAL_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchCategories();
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setStatus('active');
    setOrderNum(categories.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setStatus(cat.status);
    setOrderNum(cat.order || 1);
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val.toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-');
      setSlug(generatedSlug);
    }
  };

  // ক্যাটাগরি তৈরি বা আপডেট
  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const categoryData = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
        status: status,
        order: Number(orderNum) || (categories.length + 1),
      };

      if (editingCategory && !editingCategory.id.startsWith('smartphones') && !editingCategory.id.startsWith('laptops') && !editingCategory.id.startsWith('watches') && !editingCategory.id.startsWith('audio') && !editingCategory.id.startsWith('cameras') && !editingCategory.id.startsWith('fashion')) {
        // ফায়ারস্টোরে আপডেট
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...categoryData } : c));
        toast.success('Category updated successfully!');
      } else {
        // ফায়ারস্টোরে নতুন তৈরি
        const docRef = await addDoc(collection(db, 'categories'), categoryData);
        setCategories(prev => [...prev.filter(c => c.slug !== categoryData.slug), { id: docRef.id, ...categoryData }].sort((a, b) => (a.order || 0) - (b.order || 0)));
        toast.success('New category created successfully!');
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ক্যাটাগরি ডিলিট
  const handleDeleteCategory = async (id: string, catName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${catName}" category?`)) return;

    try {
      setDeletingId(id);
      // ফায়ারস্টোর আইডি হলে ফায়ারস্টোর থেকে মুছবে
      if (!INITIAL_CATEGORIES.some(ic => ic.id === id)) {
        await deleteDoc(doc(db, 'categories', id));
      }
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error("Error deleting category:", error);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Manage Categories | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Category Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Create and manage product categories for your store
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchCategories(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name or slug..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl shadow-modern border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading store categories...</span>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 px-4">
            <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Categories Found</h3>
            <p className="text-xs text-gray-500 mb-6">Create a new category to organize your products.</p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Slug (URL)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-400 w-16">#{cat.order || 1}</td>
                    <td className="py-3 px-4 font-bold text-navy text-xs md:text-sm">{cat.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{cat.slug}</td>
                    <td className="py-3 px-4">
                      {cat.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-green/10 text-brand-green">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          disabled={deletingId === cat.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Category"
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-navy">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-navy">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Smart Watches"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Slug (URL)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="smart-watches"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={orderNum}
                    onChange={(e) => setOrderNum(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-navy font-bold text-xs rounded-xl hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}