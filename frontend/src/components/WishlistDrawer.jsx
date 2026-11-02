import React from 'react';
import { X, Heart, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlistItems = [],
  onRemoveFromWishlist,
  onAddToCart,
  onTryOn
}) {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-row">
            <Heart size={20} className="fill-pink-500 text-pink-500" />
            <h2 className="drawer-title">Saved Wishlist</h2>
            <span className="drawer-count-badge">{wishlistItems.length}</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close wishlist">
            <X size={18} />
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="drawer-empty-view">
            <div className="empty-icon-wrap">
              <Heart size={48} className="text-pink-400 opacity-60" />
            </div>
            <h3 className="empty-title">Your wishlist is empty</h3>
            <p className="empty-desc">
              Tap the heart icon on any garment in the 3D boutique to save your favorite luxury styles for later.
            </p>
            <button className="empty-cta-btn" onClick={onClose}>
              Browse Fashion Items
            </button>
          </div>
        ) : (
          <div className="drawer-items-list">
            {wishlistItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <img src={item.image} alt={item.name} className="cart-item-thumb" />
                <div className="cart-item-info">
                  <div className="cart-item-top">
                    <h4 className="cart-item-name">{item.name}</h4>
                    <button
                      className="cart-delete-btn"
                      onClick={() => onRemoveFromWishlist(item.id)}
                      title="Remove from wishlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="cart-item-meta">
                    <span className="text-purple-300 font-medium">${item.price}</span>
                    <span>• {item.brand || 'Maison Luxe'}</span>
                  </div>

                  <div className="wishlist-action-btns">
                    <button
                      onClick={() => {
                        onTryOn(item);
                        onClose();
                      }}
                      className="wishlist-try-btn"
                    >
                      <Sparkles size={13} />
                      <span>Try On</span>
                    </button>

                    <button
                      onClick={() => {
                        onAddToCart(item);
                        onRemoveFromWishlist(item.id);
                      }}
                      className="wishlist-add-btn"
                    >
                      <ShoppingBag size={13} />
                      <span>Move to Bag</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

