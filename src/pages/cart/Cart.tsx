import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore';

export default function Cart() {
  const navigate = useNavigate();

  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
  } = useCartStore();

  const subtotal = getSubtotal();

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="bg-secondary min-h-[75vh] flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>Shopping Cart | ISAR Marketplace</title>
        </Helmet>

        <div className="bg-white rounded-3xl shadow-modern p-8 md:p-12 text-center max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-navy mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 text-xs sm:text-sm mb-8 leading-relaxed">
            Looks like you have not added anything to your cart yet. Explore our bags and smart accessories collection!
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-3.5 px-8 rounded-2xl text-xs sm:text-sm transition-all shadow-md w-full cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>{`Shopping Cart (${items.length}) | ISAR Marketplace`}</title>
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-navy">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Items
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Side: Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            
            {items.map((item, index) => (
              <div 
                key={`${item.product.id}-${item.selectedVariantId || index}`}
                className="bg-white rounded-3xl p-4 md:p-6 shadow-modern border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-modern-lg"
              >
                {/* Product Thumbnail */}
                <Link to={`/products/${item.product.id}`} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 p-1 flex items-center justify-center">
                  <img
                    src={item.product.images[0] || 'https://via.placeholder.com/150'}
                    alt={item.product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </Link>

                {/* Product Information */}
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/products/${item.product.id}`}
                    className="text-sm md:text-base font-black text-navy hover:text-primary transition-colors line-clamp-1 mb-1"
                  >
                    {item.product.name}
                  </Link>

                  <p className="text-xs text-gray-500 mb-2">
                    Unit Price: <span className="font-bold text-navy font-mono">{item.product.price.toLocaleString()} BDT</span>
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariantId)}
                        className="p-1.5 text-navy hover:text-primary transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-navy font-mono">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariantId)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1.5 text-navy hover:text-primary disabled:opacity-40 transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id, item.selectedVariantId)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      aria-label="Remove item"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Total Price */}
                <div className="text-right sm:self-center ml-auto">
                  <span className="text-base md:text-lg font-black text-primary font-mono">
                    {(item.product.price * item.quantity).toLocaleString()} BDT
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Continue Shopping
              </Link>
            </div>

          </div>

          {/* Right Side: Order Summary */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-3xl p-6 shadow-modern border border-gray-100 space-y-5 sticky top-24">
              <h2 className="text-lg font-black text-navy pb-3 border-b border-gray-100">Order Summary</h2>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Selected Items ({items.length}):</span>
                  <span className="font-bold text-navy font-mono">{items.reduce((s, i) => s + i.quantity, 0)} Pcs</span>
                </div>

                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-navy font-mono">{subtotal.toLocaleString()} BDT</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl text-[11px] text-gray-500 border border-gray-100 leading-relaxed">
                  Shipping fee will be calculated at checkout based on your delivery district and weight.
                </div>

                <div className="flex justify-between text-base font-black text-navy pt-3 border-t border-gray-100">
                  <span>Total Payable:</span>
                  <span className="text-primary font-mono text-lg font-black">{subtotal.toLocaleString()} BDT</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-black py-4 px-6 rounded-2xl text-sm transition-all shadow-md cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}