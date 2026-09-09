import { Routes, Route } from 'react-router-dom';

// লেআউট এবং সিকিউরিটি গার্ডস
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';

// পাবলিক ও কাস্টমার পেজসমূহ
import Home from '../pages/home/Home';
import Products from '../pages/products/Products';
import ProductDetail from '../pages/products/ProductDetail';
import Categories from '../pages/categories/Categories';
import Cart from '../pages/cart/Cart';
import Checkout from '../pages/checkout/Checkout';
import OrderSuccess from '../components/checkout/OrderSuccess';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Profile from '../pages/profile/Profile';
import Orders from '../pages/orders/Orders';
import LegalPage from '../pages/legal/LegalPage';

// সেলার মার্কেটপ্লেস পেজ
import SellerDashboard from '../pages/seller/SellerDashboard';

// অ্যাডমিন পেজসমূহ
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminAbandonedCarts from '../pages/admin/AdminAbandonedCarts';
import AdminCoupons from '../pages/admin/AdminCoupons';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminAddProduct from '../pages/admin/AdminAddProduct';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminSellers from '../pages/admin/AdminSellers';
import AdminLegalCMS from '../pages/admin/AdminLegalCMS';
import AdminSettings from '../pages/admin/AdminSettings';

// 404 পেজ
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <h2 className="text-4xl font-bold text-slate-900 mb-2">404</h2>
    <p className="text-slate-500">Page Not Found</p>
  </div>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Main Layout এর আন্ডারে থাকা পাবলিক পেজসমূহ */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* লিগ্যাল ও পলিসি রাউটস */}
        <Route path="/privacy-policy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />
        <Route path="/return-policy" element={<LegalPage />} />
        <Route path="/shipping-policy" element={<LegalPage />} />
        <Route path="/about-us" element={<LegalPage />} />
        <Route path="/faq" element={<LegalPage />} />
        
        {/* 🔒 ১০০% প্রটেক্টেড ইউজার রাউটস (লগইন ছাড়া ঢোকা সম্পূর্ণ বন্ধ) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/seller" element={<SellerDashboard />} />
        </Route>

        {/* 404 পেজ */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* অ্যাডমিন রাউটস */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/add" element={<AdminAddProduct />} />
        <Route path="products/edit/:id" element={<AdminAddProduct />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="sellers" element={<AdminSellers />} />
        <Route path="legal" element={<AdminLegalCMS />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}