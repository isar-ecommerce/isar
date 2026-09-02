import { Routes, Route } from 'react-router-dom';

// লেআউট এবং সিকিউরিটি গার্ডস
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../layouts/AdminLayout';

// পাবলিক ও কাস্টমার পেজসমূহ
import Home from '../pages/home/Home';
import Products from '../pages/products/Products';
import ProductDetail from '../pages/products/ProductDetail';
import Categories from '../pages/categories/Categories';
import Wishlist from '../pages/wishlist/Wishlist';
import Cart from '../pages/cart/Cart';
import Checkout from '../pages/checkout/Checkout';
import Orders from '../pages/orders/Orders';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Profile from '../pages/profile/Profile';
import LegalPage from '../pages/legal/LegalPage';

// অর্ডার কনফার্মেশন ও ইনভয়েস পেজ
import OrderSuccess from '../components/checkout/OrderSuccess';

// সেলার মার্কেটপ্লেস পেজ
import SellerDashboard from '../pages/seller/SellerDashboard';

// অ্যাডমিন পেজসমূহ
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminAddProduct from '../pages/admin/AdminAddProduct';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminCoupons from '../pages/admin/AdminCoupons';
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
      {/* Main Layout এর আন্ডারে থাকা পাবলিক ও কাস্টমার রাউটস */}
      <Route element={<MainLayout />}>
        
        {/* পাবলিক রাউটস */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* লিগ্যাল ও পলিসি রাউটস (ডায়নামিক) */}
        <Route path="/privacy-policy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        <Route path="/refund-policy" element={<LegalPage />} />
        <Route path="/return-policy" element={<LegalPage />} />
        <Route path="/shipping-policy" element={<LegalPage />} />
        <Route path="/about-us" element={<LegalPage />} />
        <Route path="/faq" element={<LegalPage />} />
        
        {/* প্রটেক্টেড কাস্টমার ও সেলার রাউটস */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/seller" element={<SellerDashboard />} />
        </Route>

        {/* 404 রাউট */}
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* প্রটেক্টেড অ্যাডমিন রাউটস (শুধুমাত্র admin ও super_admin এর জন্য) */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/add" element={<AdminAddProduct />} />
          <Route path="products/edit/:id" element={<AdminAddProduct />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="sellers" element={<AdminSellers />} />
          <Route path="legal" element={<AdminLegalCMS />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}