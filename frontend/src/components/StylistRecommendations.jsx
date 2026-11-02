import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ShoppingBag,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  getAIOutfitSuggestions,
  getAIRefreshRevival,
  checkAIServiceHealth
} from '../services/aiService.js';

const OCCASIONS = [
  'Casual outing',
  'Office',
  'Party',
  'College',
  'Travel',
  'Formal event',
  'Wedding'
];

const SEASONS = ['Summer', 'Spring', 'Winter', 'Monsoon'];

export default function StylistRecommendations({
  isOpen,
  onClose,
  currentOutfit,
  selectedProduct,
  onSelectProduct,
  onTryOn,
  onTryFullOutfit,
  onAddToCart
}) {
  const [activeTab, setActiveTab] = useState('smart'); // 'smart' | 'revival'
  const [selectedOccasion, setSelectedOccasion] = useState('Casual outing');
  const [selectedSeason, setSelectedSeason] = useState('Summer');
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ online: false, engine: 'checking' });
  const [appliedOutfitId, setAppliedOutfitId] = useState(null);
  const [addedOutfitId, setAddedOutfitId] = useState(null);

  // Check backend health on drawer open
  useEffect(() => {
    if (!isOpen) return;
    checkAIServiceHealth().then((res) => {
      setAiStatus({
        online: res.online,
        engine: res.online ? 'FastAPI Microservice (Port 8000)' : 'Client AI Recommender'
      });
    });
  }, [isOpen]);

  // Query AI Service whenever filters or tab changes
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    if (activeTab === 'smart') {
      getAIOutfitSuggestions({
        occasion: selectedOccasion,
        season: selectedSeason,
        limit: 4,
        focalProduct: selectedProduct
      })
        .then((res) => {
          setOutfits(res.recommended_outfits || []);
        })
        .catch((err) => {
          console.error('Error fetching AI recommendations:', err);
        })
        .finally(() => setLoading(false));
    } else {
      getAIRefreshRevival({ limit: 4 })
        .then((res) => {
          setOutfits(res.revival_outfits || []);
        })
        .catch((err) => {
          console.error('Error fetching revival recommendations:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, activeTab, selectedOccasion, selectedSeason, selectedProduct]);

  if (!isOpen) return null;

  const handleApplyOutfit = (outfit) => {
    setAppliedOutfitId(outfit.outfit_id);
    const originalItems = outfit.items.map((i) => i.originalProduct || i);

    if (onTryFullOutfit) {
      onTryFullOutfit(originalItems);
    } else if (onTryOn) {
      originalItems.forEach((it) => onTryOn(it));
    }

    setTimeout(() => {
      setAppliedOutfitId(null);
    }, 2000);
  };

  const handleAddOutfitToBag = (outfit) => {
    setAddedOutfitId(outfit.outfit_id);
    const originalItems = outfit.items.map((i) => i.originalProduct || i);

    if (onAddToCart) {
      originalItems.forEach((it) => onAddToCart(it));
    }

    setTimeout(() => {
      setAddedOutfitId(null);
    }, 2200);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <Sparkles size={20} className="text-purple-400" />
            <h2 className="drawer-title">AI Outfit Suggestions</h2>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close suggestions">
            <X size={18} />
          </button>
        </div>

        {/* AI Service Live Status Bar */}
        <div className="ai-status-banner">
          <div className="ai-status-indicator">
            <span className={`ai-status-dot ${aiStatus.online ? 'online' : 'offline'}`} />
            <span>AI Service: {aiStatus.engine}</span>
          </div>
          <span className="ai-status-badge">
            {aiStatus.online ? 'Microservice Active' : 'Offline Safe Mode'}
          </span>
        </div>

        {/* Mode Tabs: Smart Recommendations vs Sustainable Revival */}
        <div className="ai-tabs-container">
          <button
            onClick={() => setActiveTab('smart')}
            className={`ai-tab-button ${activeTab === 'smart' ? 'active' : ''}`}
          >
            <Sparkles size={14} />
            <span>Smart Outfits</span>
          </button>

          <button
            onClick={() => setActiveTab('revival')}
            className={`ai-tab-button ${activeTab === 'revival' ? 'active revival' : ''}`}
          >
            <RotateCcw size={14} />
            <span>Revive Forgotten Clothes</span>
          </button>
        </div>

        {/* Filter Controls (Occasion & Season) */}
        {activeTab === 'smart' && (
          <div className="ai-filter-box">
            {/* Occasions */}
            <div style={{ marginBottom: '10px' }}>
              <span className="ai-filter-label">Occasion Context</span>
              <div className="ai-pill-row">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setSelectedOccasion(occ)}
                    className={`ai-context-pill ${selectedOccasion === occ ? 'active' : ''}`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>

            {/* Seasons */}
            <div>
              <span className="ai-filter-label">Season</span>
              <div className="ai-seasons-grid">
                {SEASONS.map((sea) => (
                  <button
                    key={sea}
                    onClick={() => setSelectedSeason(sea)}
                    className={`ai-season-btn ${selectedSeason === sea ? 'active' : ''}`}
                  >
                    {sea}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations List */}
        <div className="ai-outfits-scroll">
          {loading ? (
            <div className="ai-loading-container">
              <div className="ai-loading-spinner" />
              <p className="ai-loading-text">
                AI Recommender evaluating color harmony & occasion rules…
              </p>
            </div>
          ) : outfits.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
              <p>No outfits matched your exact filter combination.</p>
              <button
                onClick={() => {
                  setSelectedOccasion('Casual outing');
                  setSelectedSeason('Summer');
                }}
                className="ai-try-all-btn"
                style={{ maxWidth: '200px', margin: '14px auto 0' }}
              >
                Reset to Default Casual
              </button>
            </div>
          ) : (
            outfits.map((outfit, index) => {
              const isApplied = appliedOutfitId === outfit.outfit_id;
              const isAdded = addedOutfitId === outfit.outfit_id;
              const totalPrice = outfit.items.reduce((sum, item) => sum + (item.price || 95), 0);

              return (
                <div key={outfit.outfit_id || index} className="ai-outfit-card">
                  {/* Top Bar: Outfit Title & Score */}
                  <div className="ai-outfit-header">
                    <div className="ai-outfit-title-group">
                      <span className="ai-outfit-title">Curated Look #{index + 1}</span>
                      <span className="ai-type-pill">
                        {outfit.type?.replace(/_/g, ' ') || 'Complete Outfit'}
                      </span>
                    </div>

                    <div className="ai-match-pill">
                      <Sparkles size={11} />
                      <span>{outfit.recommendation_score || 98}% Match</span>
                    </div>
                  </div>

                  {/* Horizontal Item Thumbnails Row (Fixed 3-col grid with 120px height) */}
                  <div className="ai-thumbnails-grid">
                    {outfit.items.map((item, itemIdx) => (
                      <div key={item.item_id || itemIdx} className="ai-thumb-box">
                        <img
                          src={item.image || item.image_reference}
                          alt={item.name}
                          className="ai-thumb-img"
                        />
                        <div className="ai-thumb-overlay">
                          <p className="ai-thumb-title">{item.name}</p>
                          <span className="ai-thumb-price">${item.price || 95}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* AI Explanation / Fashion Rationale from Recommender Engine */}
                  {outfit.explanation && (
                    <div className="ai-explanation-box">
                      <span className="ai-explanation-tag">✦ AI Stylist:</span>
                      <span>{outfit.explanation}</span>
                    </div>
                  )}

                  {/* Action Buttons: Try On (3D) + Add Look to Bag */}
                  <div className="ai-action-row">
                    <button
                      onClick={() => handleApplyOutfit(outfit)}
                      className={`ai-try-all-btn ${isApplied ? 'applied' : ''}`}
                    >
                      {isApplied ? <Check size={14} /> : <Sparkles size={14} />}
                      <span>{isApplied ? 'Wearing on Avatar ✓' : 'Try On Full Look (3D)'}</span>
                    </button>

                    <button
                      onClick={() => handleAddOutfitToBag(outfit)}
                      className={`ai-add-bag-btn ${isAdded ? 'added' : ''}`}
                      title="Add entire outfit to shopping bag"
                    >
                      <ShoppingBag size={14} />
                      <span>{isAdded ? 'Added ✓' : `$${totalPrice}`}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
