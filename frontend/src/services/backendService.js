/**
 * backendService.js
 * Frontend Integration Service for Member 2's Express + MongoDB Backend.
 *
 * Connects the 3D Virtual Room and UI to:
 *   http://localhost:5000 (Express REST API with JWT Auth)
 *
 * Endpoints used:
 *   POST /api/auth/login          → Login, receive JWT token
 *   POST /api/auth/register       → Register new user
 *   GET  /api/clothes             → Fetch user wardrobe (requires token)
 *   POST /api/clothes             → Add clothing item to wardrobe
 *   POST /api/clothes/:id/image   → Upload image for a clothing item
 *   POST /api/clothes/:id/analyze → Trigger AI analysis on stored item
 *   GET  /api/health              → Backend health check
 */

const BACKEND_URL = 'http://localhost:5000';

// ─── Storage keys ──────────────────────────────────────────────────────────────
const TOKEN_KEY  = 'wardrobewise_token';
const USER_KEY   = 'wardrobewise_user';

// ─── Token helpers ─────────────────────────────────────────────────────────────
export function saveAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

// ─── Backend health check ──────────────────────────────────────────────────────
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(2500)
    });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
/**
 * Login with email + password. Returns { token, user } on success.
 * Saves token + user to localStorage automatically.
 */
export async function loginUser(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  const token = data.data?.token || data.token;
  const user  = data.data?.user  || data.user;
  if (!res.ok || !token) {
    throw new Error(data.message || 'Login failed. Check your email and password.');
  }
  saveAuthToken(token);
  if (user) saveUser(user);
  return { token, user };
}

/**
 * Register a new user account.
 */
export async function registerUser(name, email, password) {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();
  const token = data.data?.token || data.token;
  const user  = data.data?.user  || data.user;
  if (!res.ok || !token) {
    throw new Error(data.message || 'Registration failed. Please try again.');
  }
  saveAuthToken(token);
  if (user) saveUser(user);
  return { token, user };
}

/**
 * Logout: clears stored credentials.
 */
export function logoutUser() {
  clearAuthToken();
}

// ─── Category mapping: backend → frontend ─────────────────────────────────────
export function mapBackendCategory(backendCat) {
  const map = {
    'Shirt':       'tops',
    'T-Shirt':     'tops',
    'Jeans':       'trousers',
    'Trousers':    'trousers',
    'Jacket':      'outerwear',
    'Coat':        'outerwear',
    'Dress':       'dresses',
    'Skirt':       'trousers',
    'Shoes':       'shoes',
    'Sneakers':    'shoes',
    'Heels':       'shoes',
    'Boots':       'shoes',
    'Accessories': 'accessories',
    'Bag':         'accessories',
    'Jewelry':     'accessories',
    'Other':       'tops'
  };
  return map[backendCat] || 'tops';
}

/**
 * Maps a backend clothing item (MongoDB) to the frontend product schema.
 */
function backendItemToProduct(item) {
  const category = mapBackendCategory(item.category);
  const color    = item.color || '#9e7bb5';

  const garmentTypeMap = {
    tops:        'top',
    dresses:     'dress',
    outerwear:   'outerwear',
    trousers:    'bottom',
    shoes:       'shoes',
    accessories: 'accessory'
  };

  return {
    id:            `backend_${item._id}`,
    backendId:     item._id,
    name:          item.name || 'My Clothing',
    category,
    price:         item.price || 100,
    discountPrice: null,
    rating:        4.5,
    reviewsCount:  0,
    description:   item.description || 'Your wardrobe item.',
    details:       ['Personal Wardrobe Item', 'Virtual Try-On Ready'],
    sizes:         item.size ? [item.size] : ['S', 'M', 'L'],
    colors:        [{ name: 'Custom', hex: color }],
    primaryColor:  color,
    brand:         item.brand || 'My Wardrobe',
    inStock:       true,
    stockCount:    1,
    featured:      false,
    tags:          item.tags || [],
    garmentType:   garmentTypeMap[category] || 'top',
    silhouette:    'custom',
    position3D:    [0, 2.0, -1.8],
    complementaryIds: [],
    image:         item.imageUrl
      ? (item.imageUrl.startsWith('http')
          ? item.imageUrl
          : `${BACKEND_URL}${item.imageUrl}`)
      : null
  };
}

// ─── Wardrobe CRUD ─────────────────────────────────────────────────────────────
/**
 * Fetch all clothing items from the user's wardrobe.
 * Returns an array of frontend-schema product objects.
 */
export async function getWardrobe(token) {
  if (!token) return [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/clothes?limit=50`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.data || data.clothingItems || [];
    return items.map(backendItemToProduct);
  } catch (err) {
    console.warn('[backendService] getWardrobe failed:', err.message);
    return [];
  }
}

/**
 * Add a new clothing item to the backend wardrobe.
 * Returns the created item's ID and the mapped frontend product.
 */
export async function addClothingItem(token, { name, category, color, brand, description, size, tags }) {
  if (!token) throw new Error('Not logged in');

  // Map frontend category to backend category
  const backendCatMap = {
    tops:        'Shirt',
    dresses:     'Dress',
    outerwear:   'Jacket',
    trousers:    'Jeans',
    shoes:       'Shoes',
    accessories: 'Accessories'
  };

  const res = await fetch(`${BACKEND_URL}/api/clothes`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      name:        name || 'Uploaded Garment',
      category:    backendCatMap[category] || 'Other',
      color:       color || '#9e7bb5',
      brand:       brand || 'My Closet',
      description: description || 'Uploaded from WardrobeWise virtual room.',
      size:        size || 'M',
      tags:        tags || [],
      price:       110
    })
  });
  const data = await res.json();
  if (!res.ok || !data.data) {
    throw new Error(data.message || 'Failed to save clothing to wardrobe');
  }
  const item = data.data.clothingItem || data.data;
  return backendItemToProduct(item);
}

/**
 * Upload an image file for a clothing item.
 * Returns the updated product object with the backend imageUrl set.
 */
export async function uploadClothingImage(token, clothingId, file) {
  if (!token || !clothingId) return null;
  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${BACKEND_URL}/api/clothes/${clothingId}/image`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body:    formData
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.data?.clothingItem || data.data;
    return item ? backendItemToProduct(item) : null;
  } catch (err) {
    console.warn('[backendService] uploadClothingImage failed:', err.message);
    return null;
  }
}

/**
 * Trigger AI analysis on a stored clothing item.
 */
export async function analyzeStoredItem(token, clothingId) {
  if (!token || !clothingId) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/clothes/${clothingId}/analyze`, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Delete a clothing item from the backend wardrobe.
 */
export async function deleteClothingItem(token, clothingId) {
  if (!token || !clothingId) return false;
  try {
    const res = await fetch(`${BACKEND_URL}/api/clothes/${clothingId}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

