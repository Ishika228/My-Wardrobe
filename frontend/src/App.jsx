import React, { useRef, useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Home,
  Shirt,
  Sparkles,
  Clock,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronLeft,
  RotateCcw,
  Sun,
  GraduationCap,
  Wine,
  Briefcase,
  Heart,
  Grid,
  Check,
  Compass,
  ShoppingBag,
  Eye,
  SlidersHorizontal,
  Layers,
  Scissors,
  Sparkle,
  Footprints,
  Maximize2,
  Tv,
  Upload,
  Camera,
  LogIn,
  LogOut,
  User,
  X
} from 'lucide-react';
import VRScene from './components/VRScene.jsx';
import ProductDetailsModal from './components/ProductDetailsModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import WishlistDrawer from './components/WishlistDrawer.jsx';
import StylistRecommendations from './components/StylistRecommendations.jsx';
import { PRODUCTS, CATEGORIES, getRecommendations } from './data/products.js';
import { analyzeClothingImage } from './services/aiService.js';
import {
  getAuthToken,
  getSavedUser,
  loginUser,
  logoutUser,
  getWardrobe,
  addClothingItem,
  uploadClothingImage
} from './services/backendService.js';

// Loading fallback for 3D canvas
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-text">Loading Virtual Boutique…</p>
    </div>
  );
}

export default function App() {
  const controlsRef = useRef();

  // --- Avatar Position, Heading & Walking State ---
  const [avatarPosition, setAvatarPosition] = useState([0, 0, 0]);
  const [avatarRotation, setAvatarRotation] = useState([0, 0, 0]);
  const [isWalking, setIsWalking] = useState(false);

  // --- Virtual Try-On Wardrobe Outfit State ---
  const [currentOutfit, setCurrentOutfit] = useState({
    top: PRODUCTS.find((p) => p.id === 'top-1'),
    bottom: PRODUCTS.find((p) => p.id === 'trouser-1'),
    dress: null,
    outerwear: null,
    shoes: PRODUCTS.find((p) => p.id === 'shoe-1'),
    accessory: PRODUCTS.find((p) => p.id === 'acc-1')
  });

  const [isTryOnEffect, setIsTryOnEffect] = useState(false);

  // --- Camera & View State ---
  const [cameraMode, setCameraMode] = useState('follow');
  const [autoRotate, setAutoRotate] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const [isVRActive, setIsVRActive] = useState(false);

  // --- Catalog, Filtering & Modals ---
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeOccasion, setActiveOccasion] = useState('Casual');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // --- Cart & Wishlist State ---
  const [cartItems, setCartItems] = useState([
    {
      ...PRODUCTS[0],
      selectedSize: 'S',
      selectedColor: PRODUCTS[0].colors[0],
      quantity: 1
    }
  ]);
  const [wishlistItems, setWishlistItems] = useState([PRODUCTS[3], PRODUCTS[10]]);

  // --- Drawers Open/Close ---
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isStylistOpen, setIsStylistOpen] = useState(false);

  // --- Mobile Touch D-Pad State ---
  const [dpadInput, setDpadInput] = useState({ x: 0, y: 0 });
  const dpadTimerRef = useRef(null);

  // --- Upload Cloth Feature ---
  const [uploadedClothes, setUploadedClothes] = useState([]);
  const [isUploadingCloth, setIsUploadingCloth] = useState(false);
  const fileInputRef = useRef(null);

  // --- Backend Auth & Wardrobe State ---
  const [authToken, setAuthToken]         = useState(() => getAuthToken());
  const [currentUser, setCurrentUser]     = useState(() => getSavedUser());
  const [backendWardrobe, setBackendWardrobe] = useState([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]       = useState('');
  const [isLoggingIn, setIsLoggingIn]     = useState(false);

  // Fetch backend wardrobe whenever token changes
  useEffect(() => {
    if (!authToken) { setBackendWardrobe([]); return; }
    setIsLoadingWardrobe(true);
    getWardrobe(authToken)
      .then((items) => setBackendWardrobe(items))
      .catch(() => setBackendWardrobe([]))
      .finally(() => setIsLoadingWardrobe(false));
  }, [authToken]);

  // Login handler
  const handleLogin = useCallback(async (e) => {
    e?.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const data = await loginUser(loginEmail, loginPassword);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginEmail, loginPassword]);

  // Logout handler
  const handleLogout = useCallback(() => {
    logoutUser();
    setAuthToken(null);
    setCurrentUser(null);
    setBackendWardrobe([]);
  }, []);

  // --- Handlers: Virtual Try-On ---
  const handleTryOn = (product) => {
    setIsTryOnEffect(true);
    setTimeout(() => setIsTryOnEffect(false), 2000);

    setCurrentOutfit((prev) => {
      const next = { ...prev };
      const cat = product.category.toLowerCase();

      if (cat === 'dresses') {
        next.dress = product;
        next.top = null;
        next.bottom = null;
      } else if (cat === 'tops') {
        next.top = product;
        next.dress = null;
        if (!next.bottom) {
          next.bottom = PRODUCTS.find((p) => p.category === 'trousers');
        }
      } else if (cat === 'trousers' || cat === 'skirts') {
        next.bottom = product;
        next.dress = null;
        if (!next.top) {
          next.top = PRODUCTS.find((p) => p.category === 'tops');
        }
      } else if (cat === 'outerwear') {
        next.outerwear = prev.outerwear?.id === product.id ? null : product;
      } else if (cat === 'shoes') {
        next.shoes = product;
      } else if (cat === 'accessories') {
        next.accessory = prev.accessory?.id === product.id ? null : product;
      }

      return next;
    });
  };

  const handleTryFullOutfit = (items) => {
    setIsTryOnEffect(true);
    setTimeout(() => setIsTryOnEffect(false), 2200);

    setCurrentOutfit((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const cat = item.category.toLowerCase();
        if (cat === 'dresses') {
          next.dress = item;
          next.top = null;
          next.bottom = null;
        } else if (cat === 'tops') {
          next.top = item;
          next.dress = null;
        } else if (cat === 'trousers' || cat === 'skirts') {
          next.bottom = item;
          next.dress = null;
        } else if (cat === 'outerwear') {
          next.outerwear = item;
        } else if (cat === 'shoes') {
          next.shoes = item;
        } else if (cat === 'accessories') {
          next.accessory = item;
        }
      });
      return next;
    });
  };

  const handleResetOutfit = () => {
    setIsTryOnEffect(true);
    setTimeout(() => setIsTryOnEffect(false), 1500);
    setCurrentOutfit({
      top: PRODUCTS.find((p) => p.id === 'top-1'),
      bottom: PRODUCTS.find((p) => p.id === 'trouser-1'),
      dress: null,
      outerwear: null,
      shoes: PRODUCTS.find((p) => p.id === 'shoe-1'),
      accessory: PRODUCTS.find((p) => p.id === 'acc-1')
    });
  };

  const handleGoToMirror = () => {
    setAvatarPosition([-2.5, 0, 0.4]);
    setAvatarRotation([0, -Math.PI * 0.65, 0]);
    setCameraMode('mirror');
    if (controlsRef.current) {
      controlsRef.current.object.position.set(-1.0, 2.1, 2.2);
      controlsRef.current.target.set(-2.5, 1.8, 0.4);
    }
  };

  // --- Handlers: Shopping Bag ---
  const handleAddToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.id === product.id &&
          i.selectedSize === product.selectedSize &&
          i.selectedColor?.name === product.selectedColor?.name
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: (i.quantity || 1) + (product.quantity || 1) } : i
        );
      }
      return [...prev, { ...product, quantity: product.quantity || 1 }];
    });
  };

  const handleUpdateQuantity = (id, newQty) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // --- Handlers: Wishlist ---
  const handleToggleWishlist = (product) => {
    setWishlistItems((prev) => {
      const exists = prev.some((i) => i.id === product.id);
      if (exists) {
        return prev.filter((i) => i.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const handleRemoveFromWishlist = (id) => {
    setWishlistItems((prev) => prev.filter((i) => i.id !== id));
  };

  // --- Handlers: Camera Controls ---
  const toggleAutoRotate = () => setAutoRotate((prev) => !prev);

  const toggleCameraMode = () => {
    setCameraMode((prev) => (prev === 'follow' ? 'free' : 'follow'));
  };

  const toggleZoom = () => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (isZoomedIn) {
      ctrl.object.position.set(0, 1.9, 3.4);
      ctrl.target.set(avatarPosition[0], 1.75, avatarPosition[2]);
      setIsZoomedIn(false);
    } else {
      ctrl.object.position.set(avatarPosition[0], 2.2, avatarPosition[2] + 1.7);
      ctrl.target.set(avatarPosition[0], 2.2, avatarPosition[2]);
      setIsZoomedIn(true);
    }
  };

  const handleToggleWebXR = () => {
    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          navigator.xr.requestSession('immersive-vr').catch(() => {});
        } else {
          toggleFullscreen();
        }
      });
    } else {
      toggleFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsVRActive(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsVRActive(false);
    }
  };

  // --- Mobile D-Pad Touch Controller ---
  const handleDpadPress = (dx, dy) => {
    setDpadInput({ x: dx, y: dy });
    if (dpadTimerRef.current) clearInterval(dpadTimerRef.current);
    dpadTimerRef.current = setInterval(() => {
      setDpadInput({ x: dx, y: dy });
    }, 50);
  };

  const handleDpadRelease = () => {
    if (dpadTimerRef.current) {
      clearInterval(dpadTimerRef.current);
      dpadTimerRef.current = null;
    }
    setDpadInput({ x: 0, y: 0 });
  };

  // --- Upload Cloth Image Handler ---
  const handleClothUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCloth(true);
    const localImageUrl = URL.createObjectURL(file);

    let detectedCategory = activeCategory !== 'all' ? activeCategory : 'tops';
    let detectedName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    detectedName = detectedName.replace(/\b\w/g, (c) => c.toUpperCase());
    let detectedColor = '#d946ef';
    let detectedTags = ['custom', 'uploaded', 'trending', 'casual'];

    try {
      const aiResult = await analyzeClothingImage(file);
      if (aiResult) {
        const catGroup = (aiResult.category_group || '').toLowerCase();
        const catName = (aiResult.category || aiResult.classification || '').toLowerCase();

        if (catGroup === 'top' || catName.includes('shirt') || catName.includes('top') || catName.includes('sweater')) {
          detectedCategory = 'tops';
        } else if (catGroup === 'bottom' || catName.includes('jean') || catName.includes('pant') || catName.includes('trouser') || catName.includes('skirt')) {
          detectedCategory = 'trousers';
        } else if (catGroup === 'dress' || catName.includes('dress')) {
          detectedCategory = 'dresses';
        } else if (catGroup === 'outerwear' || catName.includes('jacket') || catName.includes('coat') || catName.includes('blazer')) {
          detectedCategory = 'outerwear';
        } else if (catGroup === 'footwear' || catName.includes('shoe') || catName.includes('sneaker') || catName.includes('heel') || catName.includes('boot')) {
          detectedCategory = 'shoes';
        } else if (catGroup === 'accessory' || catName.includes('bag') || catName.includes('belt') || catName.includes('accessory')) {
          detectedCategory = 'accessories';
        }

        if (aiResult.colour?.dominant_hex) {
          detectedColor = aiResult.colour.dominant_hex;
        } else if (aiResult.color_dominant?.hex) {
          detectedColor = aiResult.color_dominant.hex;
        }

        if (aiResult.category) {
          detectedName = `${aiResult.colour?.dominant || ''} ${aiResult.category}`.trim();
        }
      }
    } catch (err) {
      console.info('Client fallback for cloth upload:', err.message);
    }

    const newClothItem = {
      id: `custom-${Date.now()}`,
      name: detectedName || 'Custom Uploaded Piece',
      category: detectedCategory,
      price: 110,
      discountPrice: null,
      rating: 5.0,
      reviewsCount: 1,
      description: 'Your custom clothing item uploaded into your WardrobeWise closet. Ready for 3D try-on and smart styling recommendations.',
      details: ['Custom Wardrobe Upload', 'Personal Virtual Try-On Asset', 'High-Res Preview'],
      sizes: ['XS', 'S', 'M', 'L'],
      colors: [{ name: 'Custom Hue', hex: detectedColor }],
      primaryColor: detectedColor,
      brand: 'My Closet',
      inStock: true,
      stockCount: 1,
      featured: true,
      tags: detectedTags,
      garmentType: detectedCategory === 'dresses' ? 'dress' : detectedCategory === 'trousers' ? 'bottom' : detectedCategory === 'shoes' ? 'shoes' : 'top',
      silhouette: detectedCategory === 'dresses' ? 'slip-dress' : 'custom',
      position3D: [0, 2.0, -1.8],
      complementaryIds: [],
      image: localImageUrl
    };

    setUploadedClothes((prev) => [newClothItem, ...prev]);
    setActiveCategory(detectedCategory);
    setSelectedProduct(newClothItem);
    handleTryOn(newClothItem);
    setIsUploadingCloth(false);

    // Also save to backend if logged in (fire-and-forget, non-blocking)
    if (authToken) {
      addClothingItem(authToken, {
        name:        newClothItem.name,
        category:    detectedCategory,
        color:       detectedColor,
        brand:       'My Closet',
        description: newClothItem.description,
        size:        'M',
        tags:        detectedTags
      }).then((savedItem) => {
        if (savedItem?.backendId) {
          // Upload the actual image file to backend
          uploadClothingImage(authToken, savedItem.backendId, file)
            .then((updatedItem) => {
              if (updatedItem) {
                setBackendWardrobe((prev) => [updatedItem, ...prev.filter(i => i.backendId !== updatedItem.backendId)]);
              }
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }

    if (e.target) e.target.value = '';
  };

  // Filtered Products for Right Wardrobe Sidebar
  const displayedCatalog = useMemo(() => {
    // Merge: uploaded first, then backend wardrobe, then static products
    let items = [...uploadedClothes, ...backendWardrobe, ...PRODUCTS];
    if (activeCategory !== 'all') {
      const cat = activeCategory.toLowerCase();
      items = items.filter((p) => {
        const itemCat = (p.category || '').toLowerCase();
        if (cat === 'tops') return itemCat === 'tops' || itemCat === 'top' || itemCat === 'shirt' || itemCat === 't-shirt';
        if (cat === 'trousers') return itemCat === 'trousers' || itemCat === 'skirts' || itemCat === 'skirt' || itemCat === 'bottom' || itemCat === 'bottoms' || itemCat === 'jeans';
        if (cat === 'dresses') return itemCat === 'dresses' || itemCat === 'dress';
        if (cat === 'outerwear') return itemCat === 'outerwear' || itemCat === 'jacket' || itemCat === 'coat' || itemCat === 'coats';
        if (cat === 'shoes') return itemCat === 'shoes' || itemCat === 'footwear';
        if (cat === 'accessories') return itemCat === 'accessories' || itemCat === 'accessory' || itemCat === 'bags' || itemCat === 'bag';
        return itemCat === cat;
      });
    }
    if (activeOccasion && activeOccasion !== 'All') {
      const occLower = activeOccasion.toLowerCase();
      const matched = items.filter((p) => p.tags?.some((t) => t.toLowerCase().includes(occLower)));
      if (matched.length > 0) items = matched;
    }
    return items;
  }, [activeCategory, activeOccasion, uploadedClothes, backendWardrobe]);

  return (
    <div className="app-root">

      {/* =========================================================
          3D WEBGL VIRTUAL BOUTIQUE CANVAS — Full Viewport Layer
          ========================================================= */}
      <div className="canvas-layer">
        <Canvas
          shadows
          camera={{ position: [0, 1.9, 3.4], fov: 44 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#14101f', 1);
          }}
        >
          <Suspense fallback={null}>
            <VRScene
              controlsRef={controlsRef}
              autoRotate={autoRotate}
              avatarPosition={avatarPosition}
              setAvatarPosition={setAvatarPosition}
              avatarRotation={avatarRotation}
              setAvatarRotation={setAvatarRotation}
              isWalking={isWalking}
              setIsWalking={setIsWalking}
              currentOutfit={currentOutfit}
              isTryOnEffect={isTryOnEffect}
              selectedProduct={selectedProduct}
              onSelectProduct={(p) => setSelectedProduct(p)}
              activeCategory={activeCategory}
              cameraMode={cameraMode}
              dpadInput={dpadInput}
              onResetDpad={() => setDpadInput({ x: 0, y: 0 })}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Try-On Flash Toast */}
      {isTryOnEffect && (
        <div className="tryon-toast">
          <Sparkles size={15} className="text-pink-300" />
          <span>Trying on outfit…</span>
        </div>
      )}

      {/* Movement Hint Pill */}
      <div className="hint-pill">
        <Compass size={13} />
        <span>Walk: <strong>WASD / Arrow Keys</strong> or D-Pad &nbsp;·&nbsp; Click clothes to inspect &amp; try on</span>
      </div>

      {/* =========================================================
          TOP NAVIGATION BAR
          ========================================================= */}
      <header className="topbar">
        {/* Brand */}
        <div className="topbar-brand">
          <div className="brand-icon-wrap">
            <Shirt size={18} />
          </div>
          <div>
            <h1 className="brand-name">WardrobeWise</h1>
            <p className="brand-tagline">Your Style. Your Space. In VR.</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="topbar-actions">
          <button
            onClick={handleGoToMirror}
            className={`topbar-pill-btn${cameraMode === 'mirror' ? ' active' : ''}`}
            title="Mirror outfit check"
          >
            <Sparkles size={13} />
            <span>Mirror Check</span>
          </button>

          <button
            onClick={toggleCameraMode}
            className={`topbar-pill-btn${cameraMode === 'follow' ? ' active' : ''}`}
            title="Toggle camera mode"
          >
            <Eye size={14} />
            <span>{cameraMode === 'follow' ? 'Following' : 'Free Cam'}</span>
          </button>

          <button
            onClick={handleResetOutfit}
            className="topbar-pill-btn"
            title="Reset outfit"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          <button
            onClick={() => setIsWishlistOpen(true)}
            className="topbar-icon-btn"
            title="Wishlist"
          >
            <Heart size={17} />
            {wishlistItems.length > 0 && (
              <span className="topbar-badge">{wishlistItems.length}</span>
            )}
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="topbar-icon-btn"
            title="Shopping bag"
          >
            <ShoppingBag size={17} />
            {cartItems.length > 0 && (
              <span className="topbar-badge">
                {cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0)}
              </span>
            )}
          </button>

          {currentUser ? (
            <div className="profile-pill" style={{ cursor: 'pointer' }} onClick={handleLogout} title="Click to sign out">
              <div className="profile-avatar" style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg,#9e7bb5,#e879a0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {(currentUser.name || currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <span className="profile-name">Hi, {(currentUser.name || currentUser.email || '').split(' ')[0]}</span>
              <LogOut size={13} style={{ opacity: 0.7 }} />
            </div>
          ) : (
            <button
              className="topbar-pill-btn"
              onClick={() => setShowLoginModal(true)}
              title="Sign in to sync your wardrobe"
              style={{ background: 'rgba(158,123,181,0.25)', borderColor: 'rgba(158,123,181,0.5)' }}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================
          LEFT NAVIGATION DOCK
          ========================================================= */}
      <nav className="left-dock">
        <button className="dock-btn active" title="Home">
          <Home size={18} />
          <span>Home</span>
        </button>
        <button
          className="dock-btn"
          title="Wardrobe"
          onClick={() => setActiveCategory('all')}
        >
          <Shirt size={18} />
          <span>Wardrobe</span>
        </button>
        <button
          className="dock-btn"
          title="Mirror"
          onClick={handleGoToMirror}
        >
          <Sparkles size={18} />
          <span>Mirror</span>
        </button>
        <button
          className="dock-btn"
          title="AI Stylist"
          onClick={() => setIsStylistOpen(true)}
        >
          <Sparkle size={18} />
          <span>Stylist AI</span>
        </button>
        <button
          className="dock-btn"
          title="My Bag"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingBag size={18} />
          <span>My Bag</span>
        </button>
        <button
          className="dock-btn"
          title="Auto-Rotate"
          onClick={toggleAutoRotate}
        >
          <Settings size={18} />
          <span>Rotate</span>
        </button>
      </nav>

      {/* =========================================================
          BOTTOM-LEFT D-PAD CONTROLLER
          ========================================================= */}
      <div className="dpad-wrap">
        <div className="dpad-disc">
          <div className="dpad-dot" />
          <button
            onPointerDown={() => handleDpadPress(0, 1)}
            onPointerUp={handleDpadRelease}
            onPointerLeave={handleDpadRelease}
            className="dpad-btn dpad-up"
            aria-label="Forward"
          >
            <ChevronUp size={15} />
          </button>
          <button
            onPointerDown={() => handleDpadPress(0, -1)}
            onPointerUp={handleDpadRelease}
            onPointerLeave={handleDpadRelease}
            className="dpad-btn dpad-down"
            aria-label="Backward"
          >
            <ChevronDown size={15} />
          </button>
          <button
            onPointerDown={() => handleDpadPress(-1, 0)}
            onPointerUp={handleDpadRelease}
            onPointerLeave={handleDpadRelease}
            className="dpad-btn dpad-left"
            aria-label="Left"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onPointerDown={() => handleDpadPress(1, 0)}
            onPointerUp={handleDpadRelease}
            onPointerLeave={handleDpadRelease}
            className="dpad-btn dpad-right"
            aria-label="Right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* =========================================================
          BOTTOM CENTER CONTROLS BAR
          ========================================================= */}
      <div className="bottom-bar">
        <button
          onClick={handleGoToMirror}
          className={`bar-btn${cameraMode === 'mirror' ? ' active' : ''}`}
        >
          <Sparkles size={14} />
          <span>Mirror</span>
        </button>
        <button
          onClick={toggleAutoRotate}
          className={`bar-btn${autoRotate ? ' active' : ''}`}
        >
          <RotateCcw size={14} />
          <span>{autoRotate ? 'Rotating' : 'Rotate 360°'}</span>
        </button>
        <button
          onClick={toggleZoom}
          className={`bar-btn${isZoomedIn ? ' active' : ''}`}
        >
          <Maximize2 size={14} />
          <span>{isZoomedIn ? 'Zoom Out' : 'Zoom In'}</span>
        </button>
        <button
          onClick={toggleCameraMode}
          className={`bar-btn${cameraMode === 'follow' ? ' active' : ''}`}
        >
          <Eye size={14} />
          <span>{cameraMode === 'follow' ? 'Follow' : 'Free Cam'}</span>
        </button>
        <button
          onClick={handleToggleWebXR}
          className={`bar-btn${isVRActive ? ' active' : ''}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <circle cx="8" cy="12" r="2.5" />
            <circle cx="16" cy="12" r="2.5" />
          </svg>
          <span>VR Mode</span>
        </button>
      </div>

      {/* =========================================================
          RIGHT FLOATING WARDROBE PANEL
          ========================================================= */}
      <aside className="wardrobe-panel">

        {/* Auth Status Banner */}
        {!currentUser ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10, marginBottom: 14,
              background: 'rgba(158,123,181,0.12)', border: '1px solid rgba(158,123,181,0.25)',
              cursor: 'pointer'
            }}
            onClick={() => setShowLoginModal(true)}
          >
            <LogIn size={13} style={{ color: '#9e7bb5', flexShrink: 0 }} />
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
              <strong style={{ color: '#c4a8e0' }}>Sign in</strong> to sync your wardrobe &amp; save outfits
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', borderRadius: 10, marginBottom: 14,
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)'
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#34d399', flexShrink: 0
            }} />
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)' }}>
              Wardrobe synced · <strong style={{ color: '#86efac' }}>{backendWardrobe.length} saved {backendWardrobe.length === 1 ? 'item' : 'items'}</strong>
              {isLoadingWardrobe && ' (loading…)'}
            </span>
          </div>
        )}

        {/* Clothing Categories */}
        <div>
          <h2 className="panel-heading">Clothing Categories</h2>
          <div className="cat-grid">
            {[
              { key: 'all',         label: 'All',      Icon: Grid },
              { key: 'tops',        label: 'Tops',     Icon: Shirt },
              { key: 'trousers',    label: 'Bottoms',  Icon: Scissors },
              { key: 'dresses',     label: 'Dresses',  Icon: Sparkles },
              { key: 'outerwear',   label: 'Coats',    Icon: Layers },
              { key: 'shoes',       label: 'Shoes',    Icon: Footprints },
              { key: 'accessories', label: 'Bags',     Icon: ShoppingBag },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`cat-tile${activeCategory === key ? ' active' : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Cloth Feature */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleClothUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div className="catalog-header">
            <h3 className="catalog-title">Upload Cloth</h3>
            {uploadedClothes.length > 0 && (
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                {uploadedClothes.length} {uploadedClothes.length === 1 ? 'piece' : 'pieces'}
              </span>
            )}
          </div>

          {/* Dedicated Upload Button / Dropzone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="upload-dropzone"
            disabled={isUploadingCloth}
            title="Upload cloth image from your computer to try on 3D avatar"
          >
            <div className="upload-dropzone-inner">
              <div className="upload-icon-circle">
                <Upload size={20} />
              </div>
              <div>
                <p className="upload-primary-text">
                  {isUploadingCloth ? 'Analyzing Garment…' : 'Upload Cloth Image'}
                </p>
                <p className="upload-sub-text">
                  Click to select photo · Auto 3D Try-On
                </p>
              </div>
            </div>
          </button>

          {/* Active Category Garments List (Directly reflects selected Clothing Category) */}
          <div style={{ marginTop: '14px' }}>
            <div className="catalog-header">
              <h3 className="catalog-title">
                {activeCategory === 'all'
                  ? 'All Pieces'
                  : activeCategory === 'tops'
                  ? 'Tops & Shirts'
                  : activeCategory === 'trousers'
                  ? 'Bottoms & Trousers'
                  : activeCategory === 'dresses'
                  ? 'Dresses'
                  : activeCategory === 'outerwear'
                  ? 'Coats & Jackets'
                  : activeCategory === 'shoes'
                  ? 'Shoes'
                  : 'Bags & Accessories'}
              </h3>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.55)' }}>
                {displayedCatalog.length} {displayedCatalog.length === 1 ? 'piece' : 'pieces'}
              </span>
            </div>

            <div className="garment-grid">
              {displayedCatalog.map((item) => {
                const isSelected = selectedProduct?.id === item.id;
                const isWearing =
                  currentOutfit.top?.id === item.id ||
                  currentOutfit.bottom?.id === item.id ||
                  currentOutfit.dress?.id === item.id ||
                  currentOutfit.outerwear?.id === item.id ||
                  currentOutfit.shoes?.id === item.id ||
                  currentOutfit.accessory?.id === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedProduct(item);
                      handleTryOn(item);
                    }}
                    className={`garment-card${isSelected ? ' selected' : ''}`}
                    title={`${item.name} — Click to wear on 3D avatar`}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="garment-img" />
                    ) : (
                      <Shirt size={22} style={{ color: item.primaryColor }} />
                    )}
                    {isWearing && (
                      <span className="wearing-dot" title="Currently wearing on avatar">
                        <Check size={9} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Occasion Filter */}
        <div>
          <h2 className="panel-heading">Occasion</h2>
          <div className="occasion-grid">
            {[
              { key: 'Casual',  label: 'Casual',   Icon: Sun },
              { key: 'College', label: 'College',  Icon: GraduationCap },
              { key: 'Party',   label: 'Party',    Icon: Wine },
              { key: 'Office',  label: 'Office',   Icon: Briefcase },
              { key: 'Date',    label: 'Date',     Icon: Heart },
              { key: 'All',     label: 'All',      Icon: Sparkle }
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveOccasion(key)}
                className={`occasion-pill${activeOccasion === key ? ' active' : ''}`}
              >
                <Icon size={11} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Stylist CTA */}
        <div
          className="ai-cta-card"
          onClick={() => setIsStylistOpen(true)}
          role="button"
          tabIndex={0}
          title="AI Outfit Suggestions"
        >
          <div className="ai-cta-header">
            <Sparkles size={15} className="ai-cta-icon" />
            <h4 className="ai-cta-title">AI Outfit Suggestions</h4>
            <ChevronRight size={13} className="ai-cta-arrow" />
          </div>
          <p className="ai-cta-desc">
            Get personalized outfit ideas based on your style, occasion, and current look.
          </p>
        </div>
      </aside>

      {/* =========================================================
          PRODUCT DETAILS MODAL
          ========================================================= */}
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onTryOn={handleTryOn}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlistItems.some((i) => i.id === selectedProduct.id)}
          isCurrentlyTriedOn={
            currentOutfit.top?.id === selectedProduct.id ||
            currentOutfit.bottom?.id === selectedProduct.id ||
            currentOutfit.dress?.id === selectedProduct.id ||
            currentOutfit.outerwear?.id === selectedProduct.id ||
            currentOutfit.shoes?.id === selectedProduct.id ||
            currentOutfit.accessory?.id === selectedProduct.id
          }
        />
      )}

      {/* =========================================================
          SHOPPING BAG DRAWER
          ========================================================= */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* =========================================================
          WISHLIST DRAWER
          ========================================================= */}
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlistItems={wishlistItems}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onAddToCart={handleAddToCart}
        onTryOn={handleTryOn}
      />

      {/* =========================================================
          AI PERSONAL STYLIST DRAWER
          ========================================================= */}
      <StylistRecommendations
        isOpen={isStylistOpen}
        onClose={() => setIsStylistOpen(false)}
        currentOutfit={currentOutfit}
        selectedProduct={selectedProduct}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onTryOn={handleTryOn}
        onTryFullOutfit={handleTryFullOutfit}
        onAddToCart={handleAddToCart}
      />

      {/* =========================================================
          LOGIN MODAL
          ========================================================= */}
      {showLoginModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(10,8,18,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
        >
          <div style={{
            background: 'linear-gradient(135deg,rgba(30,20,50,0.98),rgba(20,16,38,0.98))',
            border: '1px solid rgba(158,123,181,0.35)',
            borderRadius: 20, padding: '36px 32px', width: 340,
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Sign In</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>Sync your wardrobe across sessions</p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="user@wardrobewise.com"
                  required
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {loginError && (
                <p style={{
                  color: '#f87171', fontSize: 12, marginBottom: 14,
                  padding: '8px 12px', background: 'rgba(248,113,113,0.1)',
                  borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)'
                }}>
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  background: 'linear-gradient(135deg,#9e7bb5,#e879a0)',
                  border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                  opacity: isLoggingIn ? 0.7 : 1, fontFamily: 'inherit',
                  letterSpacing: '0.3px'
                }}
              >
                {isLoggingIn ? 'Signing in…' : 'Sign In'}
              </button>

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 16 }}>
                Demo: user@wardrobewise.com · Password123!
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
