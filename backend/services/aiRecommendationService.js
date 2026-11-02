import { aiConfig } from '../config/aiConfig.js';
import { groqRecommendOutfits } from './groqService.js';

/**
 * Formats user's raw database ClothingItem documents into a clean schema for the AI service.
 *
 * @param {Array<object>} clothingItems - Array of Mongoose documents or plain objects
 * @returns {Array<object>} Formatted wardrobe items array
 */
export const formatWardrobeForAI = (clothingItems = []) => {
  return clothingItems.map((item) => ({
    id:             item._id ? item._id.toString() : String(item.id),
    name:           item.name,
    category:       item.category,
    subCategory:    item.subCategory    || null,
    color:          item.color          || null,
    secondaryColors: Array.isArray(item.secondaryColors) ? item.secondaryColors : [],
    pattern:        item.pattern        || null,
    material:       item.material       || null,
    season:         Array.isArray(item.season)   ? item.season   : [],
    occasion:       Array.isArray(item.occasion) ? item.occasion : [],
    style:          Array.isArray(item.style)    ? item.style    : [],
    imageUrl:       item.imageUrl       || null,
    isFavorite:     Boolean(item.isFavorite),
    timesWorn:      typeof item.timesWorn === 'number' ? item.timesWorn : null,
    lastWorn:       item.lastWorn       || null,
  }));
};

/**
 * Isolated mock recommendation provider for offline testing.
 * Clearly flagged with isMock: true so mock output is never mistaken for real AI inferences.
 *
 * @param {object} params
 * @param {Array<object>} params.wardrobeItems - Formatted wardrobe items
 * @param {object} params.preferences - User preferences
 * @returns {object} Mock recommendation response
 */
export const getMockOutfitRecommendation = ({ wardrobeItems = [], preferences = {} }) => {
  if (!Array.isArray(wardrobeItems) || wardrobeItems.length === 0) {
    return {
      success: true,
      isMock: true,
      data: { recommendations: [], message: 'No wardrobe items provided to build recommendations.' },
    };
  }

  const tops     = wardrobeItems.filter((i) => ['Shirt', 'T-Shirt', 'Jacket'].includes(i.category));
  const bottoms  = wardrobeItems.filter((i) => ['Jeans', 'Trousers', 'Skirt'].includes(i.category));
  const shoes    = wardrobeItems.filter((i) => ['Shoes', 'Sneakers', 'Boots'].includes(i.category));
  const dresses  = wardrobeItems.filter((i) => i.category === 'Dress');

  const selectedIds = [];
  if (dresses.length > 0 && Math.random() > 0.5) {
    selectedIds.push(dresses[0].id);
    if (shoes.length > 0) selectedIds.push(shoes[0].id);
  } else {
    if (tops.length   > 0) selectedIds.push(tops[0].id);
    if (bottoms.length > 0) selectedIds.push(bottoms[0].id);
    if (shoes.length  > 0) selectedIds.push(shoes[0].id);
  }
  if (selectedIds.length === 0) {
    wardrobeItems.slice(0, 3).forEach((item) => selectedIds.push(item.id));
  }

  const occasion = preferences.occasion || 'Everyday';
  const style    = preferences.style    || 'Casual';
  const weather  = preferences.weather  || 'Moderate';

  return {
    success: true,
    isMock: true,
    data: {
      recommendations: [{
        outfitName:      `${occasion} ${style} Ensemble`,
        clothingItemIds: selectedIds,
        confidence:      0.72,
        explanation:     `A curated combination matching your ${style.toLowerCase()} style preference for ${occasion.toLowerCase()} in ${weather.toLowerCase()} conditions.`,
        occasion,
        style,
        season:          weather,
        colorHarmony:    'Balanced neutral tones for everyday wear.',
        sustainabilityNote: null,
      }],
    },
  };
};

/**
 * Validates and normalizes raw recommendation response from any AI source or mock.
 *
 * @param {Array|object} rawData - Raw recommendations array or object
 * @returns {Array<object>} Normalized recommendations array
 */
export const normalizeRecommendationResponse = (rawData = {}) => {
  const rawRecommendations = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData.recommendations)
      ? rawData.recommendations
      : [];

  return rawRecommendations.map((rec, index) => {
    const rawIds = Array.isArray(rec.clothingItemIds)
      ? rec.clothingItemIds.map(String)
      : Array.isArray(rec.itemIds)
        ? rec.itemIds.map(String)
        : [];

    let confidence = 0.85;
    if (typeof rec.confidence === 'number' && !isNaN(rec.confidence)) {
      confidence = Math.min(1, Math.max(0, rec.confidence));
    }

    return {
      outfitName:        rec.outfitName        ? String(rec.outfitName).trim()        : `Recommended Outfit ${index + 1}`,
      clothingItemIds:   [...new Set(rawIds)],
      confidence,
      explanation:       rec.explanation       ? String(rec.explanation).trim()       : 'Smart combination recommended based on your preferences.',
      occasion:          rec.occasion          ? String(rec.occasion).trim()          : null,
      style:             rec.style             ? String(rec.style).trim()             : null,
      season:            rec.season            ? String(rec.season).trim()            : null,
      colorHarmony:      rec.colorHarmony      ? String(rec.colorHarmony).trim()      : null,
      sustainabilityNote: rec.sustainabilityNote ? String(rec.sustainabilityNote).trim() : null,
    };
  });
};

/**
 * Main entry point: Generates outfit recommendations.
 *
 * Priority order:
 *   1. Groq LLaMA 3.3 70B  — highest intelligence, styling explanations
 *   2. OpenCV JS rule-based service — fallback
 *   3. Mock adapter               — offline fallback
 *
 * @param {object} params
 * @param {Array<object>} params.wardrobeItems - User's clothing items from MongoDB
 * @param {object} params.preferences - User preferences
 * @returns {Promise<{success, isMock, isGroq, recommendations}>}
 */
export const requestOutfitRecommendations = async ({ wardrobeItems = [], preferences = {} }) => {
  const formattedWardrobe = formatWardrobeForAI(wardrobeItems);

  // ── 1. Try Groq AI ──────────────────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      console.log(`[AI Recommendation] Using Groq LLaMA for ${formattedWardrobe.length} wardrobe items`);
      const groqResult = await groqRecommendOutfits({
        wardrobeItems: formattedWardrobe,
        preferences,
      });

      const normalized = normalizeRecommendationResponse(groqResult.recommendations);
      return {
        success:   true,
        isMock:    false,
        isGroq:    true,
        recommendations: normalized,
        modelUsed: groqResult.modelUsed || 'llama-3.3-70b-versatile',
      };
    } catch (groqErr) {
      console.warn(`[AI Recommendation] Groq failed (${groqErr.message}). Falling back to rule-based service.`);
    }
  } else {
    console.warn('[AI Recommendation] GROQ_API_KEY not set. Trying rule-based service.');
  }

  // ── 2. Try OpenCV / rule-based JS recommendation service ───────────────────
  const payload   = { wardrobe: formattedWardrobe, preferences };
  const targetUrl = `${aiConfig.recommendationServiceUrl}${aiConfig.recommendationEndpoint}`;

  try {
    const response = await fetch(targetUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(aiConfig.recommendationTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Rule-based service returned HTTP ${response.status}`);
    }

    const json = await response.json();
    if (!json || json.success !== true || !json.data) {
      throw new Error('Rule-based service returned invalid data.');
    }

    const normalized = normalizeRecommendationResponse(json.data);
    console.log('[AI Recommendation] Rule-based service succeeded.');
    return { success: true, isMock: false, isGroq: false, recommendations: normalized };

  } catch (serviceErr) {
    const isNetworkError =
      serviceErr.code === 'ECONNREFUSED' ||
      serviceErr.code === 'ENOTFOUND'    ||
      serviceErr.name === 'TimeoutError' ||
      serviceErr.name === 'AbortError'   ||
      serviceErr.message?.includes('fetch failed') ||
      serviceErr.message?.includes('ECONNREFUSED');

    if (isNetworkError || serviceErr.message?.includes('HTTP')) {
      console.warn(`[AI Recommendation] Rule-based service unreachable (${serviceErr.message}).`);
    }
  }

  // ── 3. Mock fallback ───────────────────────────────────────────────────────
  if (aiConfig.recommendationMockFallback) {
    console.warn('[AI Recommendation] All services unavailable. Using mock adapter.');
    const mockResult = getMockOutfitRecommendation({ wardrobeItems: formattedWardrobe, preferences });
    const normalized = normalizeRecommendationResponse(mockResult.data);
    return { success: true, isMock: true, isGroq: false, recommendations: normalized };
  }

  const serviceError = new Error('All recommendation services are unavailable and mock fallback is disabled.');
  serviceError.statusCode = 503;
  throw serviceError;
};

export default {
  formatWardrobeForAI,
  getMockOutfitRecommendation,
  normalizeRecommendationResponse,
  requestOutfitRecommendations,
};
