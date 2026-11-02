import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => {
    const p = item.discountPrice || item.price || 0;
    return acc + p * (item.quantity || 1);
  }, 0);

  const freeShippingThreshold = 250;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingAmount = isFreeShipping || subtotal === 0 ? 0 : 15;
  const total = subtotal + shippingAmount;

  const handleCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderComplete(true);
      onClearCart();
    }, 1200);
  };

  const handleDismissOrder = () => {
    setOrderComplete(false);
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <ShoppingBag size={20} className="text-purple-400" />
            <h2 className="drawer-title">Shopping Bag</h2>
            <span className="drawer-count-badge">
              {cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
            </span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close cart">
            <X size={18} />
          </button>
        </div>

        {orderComplete ? (
          // Order Placed Confirmation View
          <div className="order-complete-view">
            <div className="order-success-icon-wrap">
              <CheckCircle2 size={56} className="text-emerald-400" />
            </div>
            <h3 className="order-success-title">Thank You For Your Order!</h3>
            <p className="order-success-desc">
              Your virtual luxury pieces have been reserved. Confirmation email and tracking details have been sent to your account.
            </p>
            <div className="order-code-badge">
              Order #WW-{Math.floor(100000 + Math.random() * 900000)}
            </div>
            <button className="drawer-action-btn mt-6" onClick={handleDismissOrder}>
              Continue Exploring Showroom
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          // Empty State
          <div className="drawer-empty-view">
            <div className="empty-icon-wrap">
              <ShoppingBag size={48} className="text-purple-300 opacity-60" />
            </div>
            <h3 className="empty-title">Your shopping bag is empty</h3>
            <p className="empty-desc">
              Explore the 3D boutique, click floating garments, or select pieces from the wardrobe to add them here.
            </p>
            <button className="empty-cta-btn" onClick={onClose}>
              Explore Boutique Collection
            </button>
          </div>
        ) : (
          <>
            {/* Free Shipping Progress Indicator */}
            <div className="shipping-banner">
              <div className="shipping-text">
                {isFreeShipping ? (
                  <span className="font-semibold text-emerald-400">🎉 You have unlocked Free Express Shipping!</span>
                ) : (
                  <span>Add <strong className="text-purple-300">${freeShippingThreshold - subtotal}</strong> more for Free Worldwide Shipping</span>
                )}
              </div>
              <div className="shipping-bar-track">
                <div
                  className="shipping-bar-fill"
                  style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                />
              </div>
            </div>

            {/* Item List */}
            <div className="drawer-items-list">
              {cartItems.map((item, idx) => {
                const itemPrice = item.discountPrice || item.price;
                return (
                  <div key={`${item.id}-${idx}`} className="cart-item-card">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cart-item-thumb"
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <h4 className="cart-item-name">{item.name}</h4>
                        <button
                          className="cart-delete-btn"
                          onClick={() => onRemoveItem(item.id)}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="cart-item-meta">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        {item.selectedColor && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                              style={{ backgroundColor: item.selectedColor.hex }}
                            />
                            {item.selectedColor.name}
                          </span>
                        )}
                      </div>

                      <div className="cart-item-bottom">
                        <span className="cart-item-price">${itemPrice}</span>
                        <div className="qty-stepper">
                          <button
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                            className="qty-step-btn"
                          >
                            -
                          </button>
                          <span className="qty-number">{item.quantity || 1}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                            className="qty-step-btn"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary & Checkout */}
            <div className="drawer-footer">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shippingAmount === 0 ? 'FREE' : `$${shippingAmount}`}</span>
              </div>
              <div className="summary-row total-row">
                <span>Total</span>
                <span>${total}</span>
              </div>

              <button
                className="drawer-action-btn"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              <div className="security-tag">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>256-Bit Encrypted Secure Checkout</span>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

