import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Heart, 
  ShoppingBag, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Star 
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';
import type { Product } from '../../types/product';

export default function Wishlist() {
  const { items, removeFromWishlist, clearWishlist } = useWishlistStore();
  const addItemToCart = useCartStore((state) => state.addItem);

  const handleAddToCart = (product: Product) => {
    addItemToCart(product, 1);
    toast.success(`Added ${product.name} to Cart!`);
  };

  const handleRemove = (productId: string, productName: string) => {
    removeFromWishlist(productId);
    toast.success(`Removed ${productName} from Wishlist`);
  };

  if (items.length === 0) {
    return (
      <div className="bg-secondary min-h-[75vh] flex flex-col items-center justify-center p-4">
        <Helmet>
          <title>My Wishlist | ISAR Marketplace</title>
        </Helmet>

        <div className="bg-white rounded-2xl shadow-modern p-8 md:p-12 text-center max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
            <Heart className="w-10 h-10 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Your Wishlist is Empty</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Save items you love here to easily purchase them later or track price drops.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl text-sm transition-all shadow-md w-full"
          >
            Explore Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-secondary min-h-screen py-8 md:py-12">
      <Helmet>
        <title>{`My Wishlist (${items.length}) | ISAR Marketplace`}</title>
        <meta name="description" content="Your saved favorite products on ISAR Bangladesh." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link to="/products" className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-navy">My Wishlist</h1>
                <p className="text-xs text-gray-500 mt-0.5">{items.length} saved product(s) in your list</p>
              </div>
            </div>
          </div>

          <button
            onClick={clearWishlist}
            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Items
          </button>
        </div>

        {/* Wishlist Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((product) => (
            <div 
              key={product.id}
              className="bg-white rounded-2xl overflow-hidden shadow-modern hover:shadow-modern-lg transition-all group border border-gray-100 flex flex-col h-full"
            >
              {/* Image Box */}
              <div className="relative aspect-square overflow-hidden bg-gray-50">
                <button
                  onClick={() => handleRemove(product.id, product.name)}
                  className="absolute top-3 right-3 z-10 p-2 bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 rounded-full shadow-md transition-colors"
                  title="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <img 
                  src={product.images[0] || 'https://via.placeholder.com/400'} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Info Box */}
              <div className="p-4 flex flex-col flex-grow">
                {product.rating ? (
                  <div className="flex items-center gap-1 mb-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs font-bold text-navy">{product.rating}</span>
                    <span className="text-[10px] text-gray-400">({product.reviewCount || 0})</span>
                  </div>
                ) : null}

                <Link 
                  to={`/products/${product.id}`} 
                  className="hover:text-primary transition-colors line-clamp-2 text-xs md:text-sm font-semibold text-navy mb-2 flex-grow"
                >
                  {product.name}
                </Link>

                <div className="pt-3 border-t border-gray-100 space-y-3 mt-auto">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base md:text-lg font-extrabold text-primary">
                      ৳{product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">
                        ৳{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <button 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingBag className="w-4 h-4" /> Add to Cart
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}