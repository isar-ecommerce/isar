import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import type { Product } from '../../types/product';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ফায়ারস্টোর থেকে সব প্রোডাক্ট লোড করার ফাংশন
  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      setProducts(list);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    
    Promise.resolve().then(() => {
      fetchProducts();
    });
  }, []);

  // প্রোডাক্ট ডিলিট হ্যান্ডলার
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteDoc(doc(db, 'products', id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  // স্ট্যাটাস টগল হ্যান্ডলার (Active <-> Draft)
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'draft' : 'active';
    try {
      await updateDoc(doc(db, 'products', product.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
      toast.success(`Product status changed to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // ফিল্টার করা প্রোডাক্ট তালিকা
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <Helmet>
        <title>All Products | ISAR Admin</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Product Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Total {products.length} product(s) in your store inventory
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchProducts(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          <Link
            to="/admin/products/add"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        
        {/* Search Input */}
       <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="statusFilter" className="text-xs font-bold text-gray-500">Status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-navy text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>

      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-modern border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading inventory products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Products Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
              There are no products matching your search criteria. Try clearing search filters or add a new product.
            </p>
            <Link
              to="/admin/products/add"
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Product Info</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                    
                    {/* Product Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images[0] || 'https://via.placeholder.com/80'}
                          alt={product.name}
                         className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/products/${product.id}`}
                            target="_blank"
                            className="font-bold text-navy hover:text-primary transition-colors line-clamp-1 text-xs"
                          >
                            {product.name}
                          </Link>
                          <span className="text-[10px] text-gray-400 block capitalize">
                            Cat: {product.categoryId || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-3 px-4 font-semibold text-gray-600">
                      {product.sku || 'N/A'}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-navy block">
                        ৳{product.price.toLocaleString()}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ৳{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4">
                      {product.stock <= 0 ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Out of stock
                        </span>
                      ) : product.stock <= (product.lowStockAlert || 5) ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Low ({product.stock})
                        </span>
                      ) : (
                        <span className="font-bold text-brand-green">
                          {product.stock} pcs
                        </span>
                      )}
                    </td>

                    {/* Status Toggle Badge */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        className="focus:outline-none"
                        title="Click to toggle status"
                      >
                        {product.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-green/10 text-brand-green hover:bg-brand-green/20 transition-colors">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                            <XCircle className="w-3 h-3" /> Draft
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/products/edit/${product.id}`}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          disabled={deletingId === product.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete Product"
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
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

    </div>
  );
}