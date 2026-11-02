import React, { useMemo } from 'react';
import { Sparkles, ArrowRight, X, Heart, Plus, Check } from 'lucide-react';
import { PRODUCTS, getRecommendations } from '../data/products.js';

export default function StylistRecommendations({
  isOpen,
  onClose,
  currentOutfit,
  selectedProduct,
  onSelectProduct,
  onTryOn,
  onTryFullOutfit
}) {
  if (!isOpen) return null;

  // Determine complementary recommendations based on active outfit or selected product
  const focalItem = selectedProduct || currentOutfit?.dress || currentOutfit?.top || PRODUCTS[0];

  // Retrieve intelligent recommendations using the repository function
  const recommendations = useMemo(() => {
    return getRecommendations(focalItem.id, 5);
  }, [focalItem]);

  // Compute a complete look
  const completeLook = useMemo(() => {
    const lookItems = [];
    if (focalItem.category === 'dresses') {
      lookItems.push(focalItem);
      const heels = PRODUCTS.find((p) => p.category === 'shoes' && p.silhouette === 'stilettos') || PRODUCTS[7];
      const bag = PRODUCTS.find((p) => p.category === 'accessories') || PRODUCTS[9];
      const coat = PRODUCTS.find((p) => p.category === 'outerwear') || PRODUCTS[4];
      lookItems.push(coat, heels, bag);
    } else {
      const top = focalItem.category === 'tops' ? focalItem : PRODUCTS[0];
      const bottom = focalItem.category === 'trousers' || focalItem.category === 'skirts' ? focalItem : PRODUCTS[5];
      const shoes = PRODUCTS.find((p) => p.category === 'shoes') || PRODUCTS[7];
      const bag = PRODUCTS.find((p) => p.category === 'accessories') || PRODUCTS[9];
      lookItems.push(top, bottom, shoes, bag);
    }
    return lookItems;
  }, [focalItem]);

  const handleApplyFullLook = () => {
    if (onTryFullOutfit) {
      onTryFullOutfit(completeLook);
    } else {
      completeLook.forEach((item) => onTryOn(item));
    }
    onClose();
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <Sparkles size={20} className="text-purple-400 animate-spin-slow" />
            <h2 className="drawer-title">AI Personal Stylist</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close recommendations">
            <X size={18} />
          </button>
        </div>

        {/* Stylist Introduction Banner */}
        <div className="stylist-intro-card">
          <div className="stylist-avatar-mini">✨</div>
          <div className="stylist-intro-text">
            <span className="stylist-badge">Style Analysis for "{focalItem.name}"</span>
            <p className="stylist-quote">
              "We've analyzed your avatar's silhouette and coordinated high-texture tonal pieces for an effortless, modern luxury aesthetic."
            </p>
          </div>
        </div>

        {/* 1-Click Complete Look Showcase */}
        <div className="complete-look-banner">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Curated Complete Ensemble
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">99% Match Score</span>
          </div>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {completeLook.map((item) => (
              <img
                key={item.id}
                src={item.image}
                alt={item.name}
                title={`${item.name} ($${item.price})`}
                className="w-14 h-16 rounded-lg object-cover border border-white/10 shrink-0"
              />
            ))}
          </div>

          <button
            onClick={handleApplyFullLook}
            className="w-full h-9 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all"
          >
            <Sparkles size={14} />
            <span>Try On Full Curated Look (3D)</span>
          </button>
        </div>

        {/* Individual Item Recommendations List */}
        <div className="recommendations-list">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200/80 mb-1 px-1">
            Complementary Wardrobe Pieces
          </h4>

          {recommendations.map((item) => (
            <div key={item.id} className="recommendation-card">
              <img src={item.image} alt={item.name} className="rec-image" />
              <div className="rec-details">
                <span className="rec-category">{item.category.toUpperCase()}</span>
                <h4 className="rec-title">{item.name}</h4>
                <div className="rec-price-row">
                  <span className="rec-price">${item.price}</span>
                  <span className="rec-match-score">98% Match</span>
                </div>

                <div className="rec-actions">
                  <button
                    onClick={() => {
                      onTryOn(item);
                      onClose();
                    }}
                    className="rec-try-btn"
                  >
                    <Sparkles size={13} />
                    <span>Try On (3D)</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProduct(item);
                      onClose();
                    }}
                    className="rec-view-btn"
                  >
                    <span>Inspect</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
