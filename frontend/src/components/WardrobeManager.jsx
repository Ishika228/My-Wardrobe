import React, { useState, useRef, useCallback } from 'react';
import {
  X, Plus, Upload, Camera, Trash2, Heart, Edit3, Search,
  Sparkles, Loader, CheckCircle, AlertCircle, Image as ImageIcon,
  Shirt, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  addClothingItem,
  uploadClothingImage,
  deleteClothingItem,
  toggleFavorite,
  analyzeClothingItem,
  getClothingItems,
} from '../services/api.js';

export default function WardrobeManager({ isOpen, onClose, onItemAdded, onTryOn }) {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [wearingId, setWearingId] = useState(null);
  const fileInputRef = useRef();

  // Add form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Shirt',
    subCategory: '',
    primaryColor: '#6366f1',
    brand: '',
    notes: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Load items from MongoDB (both for authenticated and demo/guest users)
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClothingItems({ limit: 50 });
      if (result.success) {
        setItems(result.data?.clothingItems || result.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve clothes from MongoDB');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  if (!isOpen) return null;

  // Handle image selection (JPG, JPEG, PNG, WEBP)
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Convert MongoDB item to Try-On product format
  const formatItemForTryOn = (item) => {
    const rawCat = (item.category || '').toLowerCase();
    let category = 'tops';
    if (['shirt', 't-shirt', 'blouse', 'top', 'sweater', 'hoodie', 'kurti'].includes(rawCat)) {
      category = 'tops';
    } else if (['trousers', 'jeans', 'bottom', 'bottoms', 'pants', 'salwar', 'churidar'].includes(rawCat)) {
      category = 'trousers';
    } else if (['dress', 'dresses', 'gown', 'saree', 'sari', 'anarkali', 'lehenga', 'suit', 'ethnic'].includes(rawCat)) {
      category = 'dresses';
    } else if (['jacket', 'coat', 'blazer', 'outerwear', 'dupatta', 'shawl'].includes(rawCat)) {
      category = 'outerwear';
    } else if (['skirt', 'skirts'].includes(rawCat)) {
      category = 'skirts';
    } else if (['shoes', 'sneakers', 'boots', 'heels', 'jutti', 'juttis'].includes(rawCat)) {
      category = 'shoes';
    } else if (['accessories', 'bag', 'jewelry', 'other'].includes(rawCat)) {
      category = 'accessories';
    }

    let colorHex = '#ffffff';
    if (item.color) {
      if (typeof item.color === 'object') {
        colorHex = item.color.primary || '#ffffff';
      } else if (typeof item.color === 'string') {
        colorHex = item.color.startsWith('#') ? item.color : '#a855f7';
      }
    }

    let image = item.imageUrl || null;
    if (image && image.startsWith('/uploads')) {
      image = 'http://localhost:5000' + image;
    }

    return {
      id: item._id || String(Date.now()),
      name: item.name,
      category,
      price: item.price || 120,
      rating: 4.9,
      primaryColor: colorHex,
      brand: item.brand || 'Digital Wardrobe',
      material: item.material || 'Silk & Cotton Blend',
      silhouette: rawCat,
      image,
      isMongo: true,
      inStock: true
    };
  };

  const handleWearItem = (item) => {
    setWearingId(item._id);
    const tryOnPayload = formatItemForTryOn(item);
    if (onTryOn) {
      onTryOn(tryOnPayload);
    }
    setTimeout(() => setWearingId(null), 1500);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter a clothing item name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDuplicateWarning(null);

    try {
      // 1. Create the clothing item (preventing duplicates on backend)
      const result = await addClothingItem({
        name: formData.name.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        color: formData.primaryColor,
        brand: formData.brand,
        material: 'Premium Fabric',
      });

      if (result.success && (result.data?.clothingItem || result.data)) {
        let savedItem = result.data.clothingItem || result.data;

        // Duplicate notice
        if (result.isDuplicate) {
          setDuplicateWarning(`"${savedItem.name}" already exists in wardrobe! Updated try-on.`);
          setTimeout(() => setDuplicateWarning(null), 4000);
        } else {
          setSuccess(`"${formData.name}" added to wardrobe!`);
          setTimeout(() => setSuccess(null), 3000);
        }

        // 2. Upload image if selected
        if (imageFile && savedItem._id) {
          try {
            const uploadRes = await uploadClothingImage(savedItem._id, imageFile);
            if (uploadRes.success && uploadRes.data?.clothingItem) {
              savedItem = uploadRes.data.clothingItem;
            }
          } catch (imgErr) {
            console.warn('Image upload error:', imgErr.message);
          }
        }

        // 3. Immediately trigger Virtual Try-On onto the 3D Avatar!
        const tryOnPayload = formatItemForTryOn(savedItem);
        if (imagePreview) {
          tryOnPayload.image = imagePreview; // Use live dataURL immediately
        }
        if (onTryOn) {
          onTryOn(tryOnPayload);
        }

        // Reset form
        setFormData({
          name: '',
          category: 'Shirt',
          subCategory: '',
          primaryColor: '#6366f1',
          brand: '',
          notes: ''
        });
        setImageFile(null);
        setImagePreview(null);
        setShowAddForm(false);

        // Reload MongoDB items
        await loadItems();
        onItemAdded?.();
      }
    } catch (err) {
      setError(err.message || 'Failed to save clothing item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClothingItem(id);
      setItems(prev => prev.filter(i => i._id !== id));
      setSuccess('Item removed from wardrobe');
      setTimeout(() => setSuccess(null), 2000);
      onItemAdded?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleFav = async (id) => {
    try {
      await toggleFavorite(id);
      setItems(prev => prev.map(i => i._id === id ? { ...i, isFavorite: !i.isFavorite } : i));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzing(id);
    try {
      const result = await analyzeClothingItem(id);
      if (result.success) {
        setSuccess('AI Vision analysis complete!');
        setTimeout(() => setSuccess(null), 2500);
        await loadItems();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const categories = [
    'Shirt',
    'T-Shirt',
    'Jeans',
    'Trousers',
    'Jacket',
    'Dress',
    'Skirt',
    'Saree',
    'Kurti',
    'Anarkali',
    'Lehenga',
    'Suit',
    'Ethnic',
    'Shoes',
    'Accessories',
    'Other'
  ];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="cart-drawer-panel wardrobe-manager-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-row">
            <Shirt size={20} style={{ color: '#a78bfa' }} />
            <h2 className="drawer-title">Digital Wardrobe (MongoDB)</h2>
            <span className="drawer-count-badge">{items.length}</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {/* Guest / Demo Notice */}
          {!isAuthenticated && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Sparkles size={16} style={{ color: '#c084fc', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '11px', color: '#e9d5ff', lineHeight: 1.4 }}>
                Browsing MongoDB Wardrobe Catalog. You can try any item in 3D VR or upload new clothes instantly.
              </p>
            </div>
          )}

          {/* Status Messages */}
          {success && (
            <div style={{
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <CheckCircle size={14} style={{ color: '#34d399' }} />
              <span style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600 }}>{success}</span>
            </div>
          )}

          {duplicateWarning && (
            <div style={{
              background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={14} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '12px', color: '#fde68a', fontWeight: 600 }}>{duplicateWarning}</span>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={14} style={{ color: '#f87171' }} />
              <span style={{ fontSize: '12px', color: '#fca5a5' }}>{error}</span>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* Toggle Add Form Button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '14px',
              background: showAddForm ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: showAddForm ? 'none' : '0 4px 18px rgba(124,58,237,0.35)',
            }}
          >
            {showAddForm ? <><X size={15} /> Cancel Upload</> : <><Plus size={15} /> Upload & Add New Clothing</>}
          </button>

          {/* Add / Upload Clothing Form */}
          {showAddForm && (
            <form onSubmit={handleAddItem} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '14px', padding: '16px', marginBottom: '16px',
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                  Clothing Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Royal Indigo Banarasi Saree, Zara Linen Shirt"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(0,0,0,0.35)',
                    color: 'white', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(139,92,246,0.3)', background: '#130d24',
                      color: 'white', fontSize: '12px', outline: 'none'
                    }}
                  >
                    {categories.map(c => <option key={c} value={c} style={{ background: '#1a1025' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                    Garment Color
                  </label>
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(p => ({ ...p, primaryColor: e.target.value }))}
                    style={{
                      width: '100%', height: '38px', borderRadius: '8px',
                      border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(0,0,0,0.3)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                  Brand / Designer (optional)
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(p => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. Sabyasachi, Zara, H&M"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(0,0,0,0.35)',
                    color: 'white', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              {/* Photo Upload with Live Preview */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                  Garment Photo (JPG, PNG, WEBP)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: imagePreview ? '2px solid rgba(139,92,246,0.6)' : '2px dashed rgba(139,92,246,0.35)',
                    borderRadius: '10px', padding: imagePreview ? '6px' : '18px', textAlign: 'center',
                    cursor: 'pointer', background: 'rgba(139,92,246,0.06)', overflow: 'hidden',
                  }}
                >
                  {imagePreview ? (
                    <div>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#c084fc' }}>Click to change photo</p>
                    </div>
                  ) : (
                    <>
                      <Camera size={26} style={{ color: '#a78bfa', marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#d1d5db', fontWeight: 500 }}>
                        Click to upload cloth photo
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#9ca3af' }}>
                        Supports JPG, PNG, WEBP
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  background: loading ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg,#7c3aed,#0891b2)',
                  border: 'none', color: 'white', fontWeight: 700, fontSize: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.3)'
                }}
              >
                {loading ? (
                  <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving to MongoDB...</>
                ) : (
                  <><Plus size={15} /> Save & Try On Avatar</>
                )}
              </button>
            </form>
          )}

          {/* MongoDB Clothing Items List */}
          {loading && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader size={26} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '13px', color: '#c4b5fd', marginTop: '10px' }}>Loading MongoDB Wardrobe...</p>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <Shirt size={44} style={{ color: '#6b4d8f', marginBottom: '10px' }} />
              <p style={{ fontSize: '14px', color: '#e2d9f3', fontWeight: 600 }}>Your wardrobe is ready</p>
              <p style={{ fontSize: '12px', color: '#a78bfa' }}>Upload your first clothing item above!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Stored Garments ({items.length})
                </span>
                <button
                  onClick={loadItems}
                  title="Refresh items from MongoDB"
                  style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {items.map((item) => {
                const isBeingWorn = wearingId === item._id;
                let displayImg = item.imageUrl;
                if (displayImg && displayImg.startsWith('/uploads')) {
                  displayImg = 'http://localhost:5000' + displayImg;
                }

                return (
                  <div
                    key={item._id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
                      border: isBeingWorn ? '1px solid #a855f7' : '1px solid rgba(139,92,246,0.15)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: 52, height: 52, borderRadius: '10px', flexShrink: 0,
                      background: displayImg ? `url(${displayImg}) center/cover` : `linear-gradient(135deg, ${item.color?.primary || item.color || '#7c3aed'}, #4c1d95)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      {!displayImg && <Shirt size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />}
                    </div>

                    {/* Garment Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        margin: 0, fontSize: '13px', fontWeight: 600, color: '#f3e8ff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {item.name}
                      </h4>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '3px', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                          background: 'rgba(139,92,246,0.2)', color: '#d8b4fe', fontWeight: 600
                        }}>
                          {item.category}
                        </span>
                        {item.brand && (
                          <span style={{ fontSize: '10px', color: '#a78bfa' }}>
                            {item.brand}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Direct Try-On & Tools */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      {/* Try On Button */}
                      <button
                        onClick={() => handleWearItem(item)}
                        title="Wear on 3D Avatar"
                        style={{
                          padding: '6px 10px', borderRadius: '8px',
                          background: isBeingWorn ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#7c3aed,#ec4899)',
                          border: 'none', color: 'white', fontSize: '11px', fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {isBeingWorn ? (
                          <><CheckCircle size={12} /> Worn</>
                        ) : (
                          <><Sparkles size={12} /> Wear</>
                        )}
                      </button>

                      {/* AI Analyze Button */}
                      {item.imageUrl && (
                        <button
                          onClick={() => handleAnalyze(item._id)}
                          disabled={analyzing === item._id}
                          title="Run AI Vision Analysis"
                          style={{
                            padding: '6px', borderRadius: '8px',
                            background: 'rgba(139,92,246,0.15)', border: 'none',
                            color: '#c084fc', cursor: analyzing === item._id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {analyzing === item._id ? (
                            <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Sparkles size={13} />
                          )}
                        </button>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={() => handleToggleFav(item._id)}
                        title="Toggle Favorite"
                        style={{
                          padding: '6px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)', border: 'none',
                          color: item.isFavorite ? '#f472b6' : '#9ca3af', cursor: 'pointer'
                        }}
                      >
                        <Heart size={13} fill={item.isFavorite ? '#f472b6' : 'none'} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(item._id)}
                        title="Delete from MongoDB"
                        style={{
                          padding: '6px', borderRadius: '8px',
                          background: 'rgba(239,68,68,0.1)', border: 'none',
                          color: '#f87171', cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
