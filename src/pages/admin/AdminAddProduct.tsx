import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Loader2, 
  Check, 
  DollarSign, 
  Layers, 
  Tag, 
  ImageIcon,
  Edit
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import { uploadImageToCloudinary } from '../../cloudinary/upload';
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

export default function AdminAddProduct() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ক্যাটাগরি তালিকা স্টেট
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [isFetchingProduct, setIsFetchingProduct] = useState<boolean>(false);
  
  // প্রোডাক্ট ফর্ম স্টেট
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [shortDescription, setShortDescription] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const [price, setPrice] = useState<number | ''>('');
  const [originalPrice, setOriginalPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>(10);
  const [lowStockAlert, setLowStockAlert] = useState<number | ''>(2);
  const [sku, setSku] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('smartphones');

  // ইমেজেস স্টেট (Cloudinary URLs)
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // স্ট্যাটাস ও ফ্ল্যাগস
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isTrending, setIsTrending] = useState<boolean>(false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ১. ফায়ারস্টোর থেকে কাস্টম ক্যাটাগরি লোড করা
  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const firestoreList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];
        const activeCustom = firestoreList.filter(c => c.status === 'active');

        const mergedCategories = [
          ...INITIAL_CATEGORIES.filter(ic => !activeCustom.some(ac => ac.slug === ic.slug)),
          ...activeCustom
        ].sort((a, b) => (a.order || 0) - (b.order || 0));

        if (isMounted) {
          setCategories(mergedCategories);
          if (mergedCategories.length > 0 && !isEditMode) {
            setCategoryId(mergedCategories[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        if (isMounted) {
          setCategories(INITIAL_CATEGORIES);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchCategories();
    });

    return () => {
      isMounted = false;
    };
  }, [isEditMode]);

  // ২. Edit Mode হলে ফায়ারস্টোর থেকে প্রোডাক্টের আগের ডেটা লোড করা
  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const fetchProductDetails = async () => {
      try {
        setIsFetchingProduct(true);
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          setName(data.name || '');
          setSlug(data.slug || '');
          setShortDescription(data.shortDescription || '');
          setDescription(data.description || '');
          setPrice(data.price ?? '');
          setOriginalPrice(data.originalPrice ?? '');
          setStock(data.stock ?? 10);
          setLowStockAlert(data.lowStockAlert ?? 2);
          setSku(data.sku || '');
          setCategoryId(data.categoryId || 'smartphones');
          setImages(data.images || []);
          setStatus(data.status || 'active');
          setIsFeatured(data.isFeatured || false);
          setIsTrending(data.isTrending || false);
          setIsNewArrival(data.isNewArrival || false);
        } else if (isMounted) {
          toast.error('Product not found for editing');
          navigate('/admin/products');
        }
      } catch (err) {
        console.error('Error fetching product for edit:', err);
        toast.error('Failed to load product details');
      } finally {
        if (isMounted) {
          setIsFetchingProduct(false);
        }
      }
    };

    Promise.resolve().then(() => {
      fetchProductDetails();
    });

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // প্রোডাক্টের নাম লিখলে অটোমেটিক স্লাগ ও SKU জেনারেট করা (শুধুমাত্র Add Mode এ)
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isEditMode) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setSlug(generatedSlug);
      if (!sku) {
        setSku(`ISAR-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  // অপটিমাইজড ছবি আপলোড হ্যান্ডলার (Cloudinary)
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      const file = files[0];

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      const uploadedUrl = await uploadImageToCloudinary(file);
      setImages((prev) => [...prev, uploadedUrl]);
      toast.success('Image ready & attached!');
    } catch (error: unknown) {
      console.error('Image upload failed:', error);
      const err = error as Error;
      toast.error(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ছবি তালিকা থেকে রিমুভ করা
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // প্রোডাক্ট সেভ বা আপডেট করার হ্যান্ডলার
  const handleSubmitProduct = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (price === '' || Number(price) <= 0) {
      toast.error('Please enter a valid selling price');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one product image');
      return;
    }

    try {
      setIsSubmitting(true);

      const productPayload = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
        shortDescription: shortDescription.trim() || '',
        description: description.trim() || `<p>${name.trim()}</p>`,
        price: Number(price),
        originalPrice: originalPrice !== '' ? Number(originalPrice) : null,
        stock: Number(stock) || 0,
        lowStockAlert: Number(lowStockAlert) || 2,
        sku: sku.trim() || `ISAR-${Date.now().toString().slice(-6)}`,
        categoryId: categoryId || 'smartphones',
        images: images,
        status: status,
        isFeatured: isFeatured,
        isTrending: isTrending,
        isNewArrival: isNewArrival,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode && id) {
        // Edit Mode: Update existing Firestore document
        const productRef = doc(db, 'products', id);
        await updateDoc(productRef, productPayload);
        toast.success('Product updated successfully!');
      } else {
        // Add Mode: Create new document
        const newProduct = {
          ...productPayload,
          rating: 5.0,
          reviewCount: 0,
          sellerId: user?.uid || 'admin',
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'products'), newProduct);
        toast.success('Product published successfully!');
      }

      navigate('/admin/products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingProduct) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs text-gray-500 font-bold">Loading product details for editing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <Helmet>
        <title>{isEditMode ? 'Edit Product' : 'Add New Product'} | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline mb-1 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
          </Link>
          <h1 className="text-2xl font-black text-navy flex items-center gap-2">
            {isEditMode ? (
              <>
                <Edit className="w-6 h-6 text-primary" /> Edit Product
              </>
            ) : (
              'Add New Product'
            )}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEditMode ? `Editing SKU: ${sku || id}` : 'Create a new item in your inventory catalog'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitProduct} className="space-y-6">
        
        {/* Basic Info Card */}
        <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
          <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Name */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-navy">Product Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Wireless Noise Cancelling Headphones"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Product Slug (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="wireless-headphones"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Short Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-navy">Short Summary</label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief 1-line description of the product"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Full Description */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-navy">Full Description (HTML or Plain Text)</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed specifications, features and usage instructions..."
                className="w-full p-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

          </div>
        </div>

        {/* Pricing & Inventory Card */}
        <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
          <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-brand-green" /> Pricing & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            
            {/* Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Selling Price (৳) *</label>
              <input
                type="number"
                required
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="4500"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-primary focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            {/* Original Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Original Price (৳)</label>
              <input
                type="number"
                min="1"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="6000"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            {/* Stock Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Stock Quantity *</label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="10"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            {/* Low Stock Alert */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Low Stock Alert</label>
              <input
                type="number"
                min="1"
                value={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors font-mono"
              />
            </div>

            {/* SKU */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy">Product SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="ISAR-HEAD-01"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors uppercase font-mono"
              />
            </div>

          </div>
        </div>

        {/* Product Images Card */}
        <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-base font-black text-navy flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600" /> Product Images
            </h2>
            <span className="text-xs text-gray-500 font-bold">{images.length} Image(s) attached</span>
          </div>

          <div className="space-y-4">
            
            {/* Uploaded Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {images.map((imgUrl, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-200 group">
                    <img src={imgUrl} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full py-8 border-2 border-dashed border-gray-200 hover:border-primary rounded-3xl bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-xs font-bold text-navy">Processing & Attaching Image...</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-navy">Click to upload product image</span>
                  <span className="text-[11px] text-gray-400">PNG, JPG or WEBP up to 5MB (Auto-compressed to HD)</span>
                </>
              )}
            </button>

          </div>
        </div>

        {/* Status & Visibility */}
        <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-4">
          <h2 className="text-base font-black text-navy pb-3 border-b border-gray-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-gold" /> Visibility & Badges
          </h2>

          <div className="flex flex-wrap items-center justify-between gap-6">
            
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-navy">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'draft')}
                className="px-3.5 py-1.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold text-navy focus:outline-none cursor-pointer"
              >
                <option value="active">Active (Published)</option>
                <option value="draft">Draft (Hidden)</option>
              </select>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                />
                Show in Featured
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                />
                Show in Trending
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer"
                />
                New Arrival Tag
              </label>
            </div>

          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-4 pt-4">
          <Link
            to="/admin/products"
            className="px-6 py-3 border border-gray-300 text-navy font-black text-xs rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-102"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {isEditMode ? 'Updating Product...' : 'Publishing Product...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> {isEditMode ? 'Update Product' : 'Save & Publish Product'}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}