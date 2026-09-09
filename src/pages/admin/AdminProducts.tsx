import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  Bell,
  PhoneCall,
  X,
  Clock
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';
import type { Product } from '../../types/product';

interface RestockRequestItem {
  id: string;
  productId: string;
  productName: string;
  customerPhone: string;
  status: string;
  createdAt?: unknown;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // রিস্টক মোডাল স্টেট
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);

  const getTimestampMs = (val: unknown): number => {
    if (!val) return 0;
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return new Date(val).getTime();
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return ((val as { toDate: () => Date }).toDate()).getTime();
    }
    return 0;
  };

  // ফায়ারস্টোর থেকে সব প্রোডাক্ট ও রিস্টক রিকোয়েস্ট লোড করা
  const fetchProductsAndRestocks = useCallback(async () => {
    try {
      setLoading(true);
      
      const [productsSnap, restockSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'restock_requests')).catch(() => ({ docs: [] }))
      ]);

      const list = productsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];

      const restockList = restockSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RestockRequestItem[];

      setProducts(list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)));
      setRestockRequests(restockList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) {
        fetchProductsAndRestocks();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fetchProductsAndRestocks]);

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

  const handleDeleteRestockRequest = async (requestId: string) => {
    try {
      setDeletingRequestId(requestId);
      await deleteDoc(doc(db, 'restock_requests', requestId));
      setRestockRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Restock notification removed');
    } catch (err) {
      console.error('Delete restock error:', err);
      toast.error('Failed to remove notification');
    } finally {
      setDeletingRequestId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getRestockCountForProduct = (productId: string) => {
    return restockRequests.filter(r => r.productId === productId).length;
  };

  const activeModalRequests = selectedProductForRestock 
    ? restockRequests.filter(r => r.productId === selectedProductForRestock.id)
    : [];

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
            onClick={() => { setLoading(true); fetchProductsAndRestocks(); }}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          <Link
            to="/admin/products/add"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex flex-wrap items-center justify-between gap-4">
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
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark transition-colors inline-flex items-center gap-2 cursor-pointer"
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
                  <th className="py-3 px-4">Stock & Waitlist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const restockCount = getRestockCountForProduct(product.id);

                  return (
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
                              to={`/products/${product.slug || product.id}`}
                              target="_blank"
                              className="font-bold text-navy hover:text-primary transition-colors line-clamp-1 text-xs"
                            >
                              {product.name}
                            </Link>
                            <span className="text-[10px] text-gray-400 block capitalize">
                              Cat: {(product as { categoryName?: string }).categoryName || product.categoryId || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-semibold text-gray-600 font-mono">
                        {product.sku || 'N/A'}
                      </td>

                      {/* Price in BDT */}
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-navy font-mono block">
                          {product.price.toLocaleString()} BDT
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[10px] text-gray-400 line-through font-mono">
                            {product.originalPrice.toLocaleString()} BDT
                          </span>
                        )}
                      </td>

                      {/* Stock & Restock Alert Badge (#8) */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
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

                          {/* কাস্টমার ওয়েটিং লিস্ট ব্যাজ */}
                          {restockCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedProductForRestock(product)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] hover:bg-amber-200 transition-colors cursor-pointer shadow-2xs"
                              title="View waiting customers"
                            >
                              <Bell className="w-3 h-3" /> {restockCount} Waiting
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(product)}
                          className="focus:outline-none cursor-pointer"
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
                            className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            disabled={deletingId === product.id}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Notification Waitlist Modal (#8) */}
      {selectedProductForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-gray-100 relative max-h-[85vh] overflow-y-auto space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-navy font-black text-sm">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Restock Waitlist Customers</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductForRestock(null)}
                className="p-1 text-gray-400 hover:text-navy rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="font-extrabold text-xs text-navy truncate">{selectedProductForRestock.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Call customers directly when you restock this product:</p>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              {activeModalRequests.map((req) => (
                <div key={req.id} className="p-3 flex items-center justify-between text-xs bg-gray-50/50 hover:bg-gray-50">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-navy block">{req.customerPhone}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Waiting for stock
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${req.customerPhone}`}
                      className="px-2.5 py-1 bg-brand-green hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors"
                      title="Call Customer"
                    >
                      <PhoneCall className="w-3 h-3" /> Call
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteRestockRequest(req.id)}
                      disabled={deletingRequestId === req.id}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                      title="Remove from list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setSelectedProductForRestock(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-navy font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}