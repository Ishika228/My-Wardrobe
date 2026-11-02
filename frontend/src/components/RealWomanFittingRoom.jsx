import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Shirt,
  Scissors,
  Layers,
  Footprints,
  ShoppingBag,
  Check,
  RotateCcw,
  Plus,
  Compass,
  Eye,
  Heart,
  Tag,
  Database,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Flame,
  Award,
  Scan
} from 'lucide-react';

/**
 * Photorealistic Real Woman Model Try-On Studio
 * Displays the real fashion model with interactive garment styling,
 * real-time sync with 3D VR Penthouse Boutique, and direct integration with MongoDB.
 */
export default function RealWomanFittingRoom({
  isOpen,
  onClose,
  currentOutfit,
  onTryOn,
  onResetOutfit,
  onOpenWardrobeManager,
  onAddToCart,
  onToggleWishlist,
  mongoItems = [],
  onSwitchToVR,
  isTryOnEffect,
  onOpenPersonalizedModal
}) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');
  const [activePose, setActivePose] = useState('front'); // 'front' | 'closeup' | 'side'

  // Filter MongoDB clothes
  const filteredMongoItems = useMemo(() => {
    if (!mongoItems || mongoItems.length === 0) return [];
    if (activeCategoryFilter === 'all') return mongoItems;
    return mongoItems.filter((item) => {
      const cat = (item.category || '').toLowerCase();
      if (activeCategoryFilter === 'tops') return ['top', 'tops', 'shirt', 't-shirt', 'blouse'].includes(cat);
      if (activeCategoryFilter === 'bottoms') return ['bottom', 'bottoms', 'trouser', 'trousers', 'jeans', 'skirt', 'pants'].includes(cat);
      if (activeCategoryFilter === 'dresses') return ['dress', 'dresses'].includes(cat);
      if (activeCategoryFilter === 'ethnic') return ['indian_ethnic', 'saree', 'anarkali', 'kurti', 'lehenga'].includes(cat);
      if (activeCategoryFilter === 'outerwear') return ['outerwear', 'jacket', 'coat', 'blazer'].includes(cat);
      if (activeCategoryFilter === 'shoes') return ['shoe', 'shoes', 'sneakers', 'boots', 'heels', 'jutti'].includes(cat);
      return true;
    });
  }, [mongoItems, activeCategoryFilter]);

  if (!isOpen) return null;

  // Active outfit pieces array
  const activePieces = [
    { type: 'Top', item: currentOutfit.top, icon: Shirt },
    { type: 'Bottom', item: currentOutfit.bottom, icon: Scissors },
    { type: 'Dress', item: currentOutfit.dress, icon: Sparkles },
    { type: 'Outerwear', item: currentOutfit.outerwear, icon: Layers },
    { type: 'Shoes', item: currentOutfit.shoes, icon: Footprints },
    { type: 'Accessory', item: currentOutfit.accessory, icon: ShoppingBag },
  ].filter((p) => Boolean(p.item));

  return (
    <div className="real-fitting-overlay" onClick={onClose}>
      <div className="real-fitting-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Bar */}
        <div className="real-fitting-header">
          <div className="flex items-center gap-3">
            <div className="model-avatar-ring">
              <span className="live-pulse" />
              <img
                src="/fashion_lady.png"
                alt="Real Fashion Model"
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Elena • Real Model Fitting Studio
                </h2>
                <span className="badge-luxury">
                  <Award size={12} className="text-amber-300" />
                  Photorealistic Try-On
                </span>
                <span className="badge-mongo">
                  <Database size={11} className="text-emerald-300" />
                  MongoDB Live
                </span>
              </div>
              <p className="text-xs text-white/60">
                Synchronized in real-time with your 3D VR Boutique Penthouse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenPersonalizedModal?.();
              }}
              className="btn-pill-vr"
              title="Personalize 3D Model with Your Own Photo (MediaPipe AI)"
              style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(124,58,237,0.25))', border: '1px solid rgba(236,72,153,0.4)' }}
            >
              <Scan size={14} className="text-pink-400" />
              <span>Personalize Avatar with Photo</span>
            </button>
            <button
              onClick={onSwitchToVR}
              className="btn-pill-vr"
              title="Switch to 3D VR Boutique View"
            >
              <Compass size={14} className="text-purple-400" />
              <span>Enter 3D VR Boutique</span>
            </button>
            <button
              onClick={onClose}
              className="close-x-btn"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Studio Content Grid */}
        <div className="real-fitting-body">

          {/* LEFT: REAL MODEL VIEWER */}
          <div className="model-stage-card">
            
            {/* View Mode Controls */}
            <div className="stage-toolbar">
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                <span className="text-[11px] font-medium text-white/70 mr-1">Pose:</span>
                {['front', 'closeup', 'side'].map((pose) => (
                  <button
                    key={pose}
                    onClick={() => setActivePose(pose)}
                    className={`pose-btn ${activePose === pose ? 'active' : ''}`}
                  >
                    {pose === 'front' ? 'Full Runway' : pose === 'closeup' ? 'Fabric Zoom' : 'Studio Profile'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onResetOutfit}
                  className="stage-action-btn"
                  title="Reset to default outfit"
                >
                  <RotateCcw size={13} />
                  <span>Reset Look</span>
                </button>
              </div>
            </div>

            {/* Model Visual Showcase */}
            <div className={`model-photo-viewport ${activePose}`}>
              {/* Real Model Image */}
              <img
                src="/fashion_lady.png"
                alt="Real Fashion Woman Model Trying on Clothes"
                className="real-lady-img"
              />

              {/* Try-On Glowing Aura effect */}
              {isTryOnEffect && (
                <div className="tryon-model-sparkle">
                  <div className="sparkle-ring ring-1" />
                  <div className="sparkle-ring ring-2" />
                  <div className="sparkle-label">
                    <Sparkles size={14} className="text-amber-300" />
                    <span>Styling on Model &amp; 3D VR Avatar…</span>
                  </div>
                </div>
              )}

              {/* Live Overlay Garment Tag Badges */}
              <div className="garment-floating-tags">
                {currentOutfit.dress ? (
                  <div className="garment-tag-pill top">
                    <span className="dot" style={{ backgroundColor: currentOutfit.dress.primaryColor || '#ec4899' }} />
                    <span className="font-semibold">{currentOutfit.dress.name}</span>
                    <span className="price">${currentOutfit.dress.price || 140}</span>
                  </div>
                ) : (
                  <>
                    {currentOutfit.top && (
                      <div className="garment-tag-pill top">
                        <span className="dot" style={{ backgroundColor: currentOutfit.top.primaryColor || '#ffffff' }} />
                        <span className="font-semibold">{currentOutfit.top.name}</span>
                        <span className="price">${currentOutfit.top.price || 89}</span>
                      </div>
                    )}
                    {currentOutfit.bottom && (
                      <div className="garment-tag-pill bottom">
                        <span className="dot" style={{ backgroundColor: currentOutfit.bottom.primaryColor || '#3b82f6' }} />
                        <span className="font-semibold">{currentOutfit.bottom.name}</span>
                        <span className="price">${currentOutfit.bottom.price || 120}</span>
                      </div>
                    )}
                  </>
                )}

                {currentOutfit.outerwear && (
                  <div className="garment-tag-pill outerwear">
                    <span className="dot" style={{ backgroundColor: currentOutfit.outerwear.primaryColor || '#d97706' }} />
                    <span className="font-semibold">{currentOutfit.outerwear.name}</span>
                    <span className="price">${currentOutfit.outerwear.price || 240}</span>
                  </div>
                )}

                {currentOutfit.shoes && (
                  <div className="garment-tag-pill shoes">
                    <span className="dot" style={{ backgroundColor: currentOutfit.shoes.primaryColor || '#ffffff' }} />
                    <span className="font-semibold">{currentOutfit.shoes.name}</span>
                    <span className="price">${currentOutfit.shoes.price || 160}</span>
                  </div>
                )}
              </div>

              {/* Bottom Model Info Banner */}
              <div className="model-stage-footer">
                <div className="flex items-center justify-between text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span className="font-medium">Active Ensemble: {activePieces.length} Pieces</span>
                  </div>
                  <span className="text-white/60">Ready to inspect in 3D Mirror</span>
                </div>
              </div>
            </div>

            {/* Current Outfit Layer Breakdown Bar */}
            <div className="active-layers-row">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Currently Wearing:
              </span>
              <div className="flex flex-wrap gap-2">
                {activePieces.map(({ type, item, icon: Icon }) => (
                  <div key={type} className="active-layer-chip">
                    <Icon size={12} className="text-purple-300" />
                    <span className="text-white font-medium text-xs">{type}: {item.name}</span>
                    <span
                      className="swatch"
                      style={{ backgroundColor: item.primaryColor || '#ffffff' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: CHOOSE EXISTING CLOTH FROM MONGODB + BOUTIQUE */}
          <div className="wardrobe-picker-column">
            
            {/* Header + Add Button */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database size={15} className="text-emerald-400" />
                  <span>Choose Existing Cloth from MongoDB</span>
                </h3>
                <p className="text-xs text-white/60">
                  Select any piece to instantly try on the Real Woman &amp; in 3D VR
                </p>
              </div>

              <button
                onClick={onOpenWardrobeManager}
                className="btn-add-mongo"
                title="Store a new cloth into MongoDB Atlas"
              >
                <Plus size={14} />
                <span>Add to MongoDB</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'tops', label: 'Tops' },
                { id: 'bottoms', label: 'Bottoms' },
                { id: 'dresses', label: 'Dresses' },
                { id: 'outerwear', label: 'Coats' },
                { id: 'shoes', label: 'Shoes' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveCategoryFilter(id)}
                  className={`category-filter-chip ${activeCategoryFilter === id ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Garment Grid */}
            <div className="mongo-garments-scroll">
              {filteredMongoItems.length === 0 ? (
                <div className="empty-wardrobe-notice">
                  <Database size={32} className="text-white/30 mb-2" />
                  <p className="text-sm font-semibold text-white">No clothes found in this category</p>
                  <p className="text-xs text-white/50 mb-3">Add items to MongoDB to see them here</p>
                  <button
                    onClick={onOpenWardrobeManager}
                    className="btn-add-mongo text-xs"
                  >
                    <Plus size={13} />
                    <span>Upload New Cloth</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredMongoItems.map((item) => {
                    const isWearing =
                      currentOutfit.top?.id === item.id ||
                      currentOutfit.bottom?.id === item.id ||
                      currentOutfit.dress?.id === item.id ||
                      currentOutfit.outerwear?.id === item.id ||
                      currentOutfit.shoes?.id === item.id ||
                      currentOutfit.accessory?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`picker-card ${isWearing ? 'wearing' : ''}`}
                        onClick={() => onTryOn(item)}
                      >
                        <div className="picker-card-img-wrap">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="picker-card-img" />
                          ) : (
                            <div className="picker-card-placeholder" style={{ backgroundColor: item.primaryColor || '#333' }}>
                              <Shirt size={28} className="text-white/80" />
                            </div>
                          )}

                          {isWearing && (
                            <div className="wearing-indicator">
                              <Check size={12} strokeWidth={3} />
                              <span>Wearing</span>
                            </div>
                          )}

                          {item.isMongo && (
                            <span className="mongo-stored-pill" title="Stored in MongoDB database">
                              <Database size={9} />
                              <span>MongoDB</span>
                            </span>
                          )}
                        </div>

                        <div className="picker-card-info">
                          <h4 className="picker-card-name" title={item.name}>
                            {item.name}
                          </h4>
                          <div className="flex items-center justify-between mt-1 text-xs text-white/60">
                            <span className="capitalize">{item.category}</span>
                            <span className="text-emerald-400 font-semibold">${item.price || 95}</span>
                          </div>

                          {item.material && (
                            <p className="text-[10px] text-white/40 truncate mt-0.5">
                              {item.material}
                            </p>
                          )}

                          <div className="picker-card-actions mt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTryOn(item);
                              }}
                              className={`try-on-btn-sm ${isWearing ? 'wearing' : ''}`}
                            >
                              <Sparkles size={11} />
                              <span>{isWearing ? 'Currently Styled' : 'Try On Real Lady'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="picker-footer-actions">
              <button
                onClick={() => {
                  activePieces.forEach(({ item }) => onAddToCart?.(item));
                }}
                className="btn-full-bag"
              >
                <ShoppingBag size={14} />
                <span>Add Full Outfit to Bag</span>
              </button>

              <button
                onClick={onSwitchToVR}
                className="btn-switch-vr-secondary"
              >
                <Eye size={14} />
                <span>View in 3D VR Mirror</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

