import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Store, 
  Percent, 
  Eye 
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { db } from '../../firebase/config';

export interface SellerItem {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  commissionRate: number;
  status: 'approved' | 'pending' | 'suspended';
  totalProducts?: number;
  totalSales?: number;
}

const MOCK_SELLERS: SellerItem[] = [
  {
    id: 'seller-1',
    storeName: 'ISAR Official Flagship Store',
    ownerName: 'Jahid Khan',
    email: 'admin@isar.com.bd',
    phone: '+880 1712345678',
    commissionRate: 0,
    status: 'approved',
    totalProducts: 12,
    totalSales: 45000,
  },
  {
    id: 'seller-2',
    storeName: 'Dhaka Gadget Hub',
    ownerName: 'Tanvir Ahmed',
    email: 'tanvir.gadgets@gmail.com',
    phone: '+880 1812345678',
    commissionRate: 5,
    status: 'approved',
    totalProducts: 8,
    totalSales: 18500,
  },
  {
    id: 'seller-3',
    storeName: 'Chittagong Fashion House',
    ownerName: 'Nusrat Jahan',
    email: 'nusrat.fashion@gmail.com',
    phone: '+880 1912345678',
    commissionRate: 7,
    status: 'pending',
    totalProducts: 0,
    totalSales: 0,
  },
];

export default function AdminSellers() {
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'), where('role', 'in', ['seller', 'admin', 'super_admin']));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          storeName: data.storeName || `${data.displayName || 'Vendor'}'s Store`,
          ownerName: data.displayName || 'Vendor Partner',
          email: data.email || 'N/A',
          phone: data.phoneNumber || 'N/A',
          commissionRate: data.commissionRate || 5,
          status: (data.sellerStatus as 'approved' | 'pending' | 'suspended') || 'approved',
          totalProducts: 0,
          totalSales: 0,
        } as SellerItem;
      });

      if (list.length === 0) {
        setSellers(MOCK_SELLERS);
      } else {
        setSellers(list);
      }
    } catch (error) {
      console.error('Error loading sellers:', error);
      setSellers(MOCK_SELLERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchSellers();
    });
  }, []);

  const handleStatusChange = async (sellerId: string, newStatus: 'approved' | 'pending' | 'suspended') => {
    try {
      setUpdatingId(sellerId);
      if (!sellerId.startsWith('seller-')) {
        await updateDoc(doc(db, 'users', sellerId), {
          sellerStatus: newStatus,
        });
      }

      setSellers(prev =>
        prev.map(s => (s.id === sellerId ? { ...s, status: newStatus } : s))
      );
      toast.success(`Seller status updated to ${newStatus.toUpperCase()}`);
    } catch (error) {
      console.error('Error updating seller status:', error);
      toast.error('Failed to update seller status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSellers = sellers.filter(s => {
    const matchesSearch =
      s.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: 'approved' | 'pending' | 'suspended') => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-green/10 text-brand-green">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
            <XCircle className="w-3 h-3" /> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Manage Sellers | ISAR Admin</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Seller & Vendor Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage marketplace vendors, commission rates and seller approval
            </p>
          </div>
        </div>

        <button
          onClick={() => { setLoading(true); fetchSellers(); }}
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-navy hover:text-primary transition-colors text-xs font-bold shadow-sm flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Sellers
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-modern border border-gray-100 flex flex-wrap items-center justify-between gap-4">
       <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sellers by store name, owner or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-navy focus:bg-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sellerStatusFilter" className="text-xs font-bold text-gray-500">Status:</label>
          <select
            id="sellerStatusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-navy text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">All Vendors</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-2xl shadow-modern border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-medium">Loading marketplace sellers...</span>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-navy mb-1">No Sellers Found</h3>
            <p className="text-xs text-gray-500">No marketplace vendors match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-4">Store & Owner</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Commission</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-navy text-xs md:text-sm block">{seller.storeName}</span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-brand-green" /> {seller.ownerName}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-gray-600">
                      <span className="block">{seller.email}</span>
                      <span className="text-[10px] text-gray-400">{seller.phone}</span>
                    </td>

                    <td className="py-3 px-4 font-bold text-navy">
                      <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary px-2 py-0.5 rounded text-[11px]">
                        <Percent className="w-3 h-3" /> {seller.commissionRate}%
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(seller.status)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={seller.status}
                          onChange={(e) => handleStatusChange(seller.id, e.target.value as 'approved' | 'pending' | 'suspended')}
                          disabled={updatingId === seller.id}
                          className="bg-gray-50 border border-gray-200 text-[11px] font-semibold text-navy rounded-lg px-2 py-1 focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                        >
                          <option value="approved">Approve</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspend</option>
                        </select>

                        <button
                          onClick={() => toast.success(`Viewing ${seller.storeName}`)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Store"
                        >
                          <Eye className="w-4 h-4" />
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