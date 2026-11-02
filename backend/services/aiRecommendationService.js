import { aiConfig } from '../config/aiConfig.js';

/**
 * Formats user's raw database ClothingItem documents into a clean schema for the AI service.
 *
 * @param {Array<object>} clothingItems - Array of Mongoose documents or plain objects
 * @returns {Array<object>} Formatted wardrobe items array
 */
export const formatWardrobeForAI = (clothingItems = []) => {
  return clothingItems.map((item) => ({
    id: item._id ? item._id.toString() : String(item.id),
    name: item.name,
    category: item.category,
    subCategory: item.subCategory || null,
    color: item.color || null,
    secondaryColors: Array.isArray(item.secondaryColors) ? item.secondaryColors : [],
    pattern: item.pattern || null,
    material: item.material || null,
    season: Array.isArray(item.season) ? item.season : [],
    occasion: Array.isArray(item.occasion) ? item.occasion : [],
    style: Array.isArray(item.style) ? item.style : [],
    imageUrl: item.imageUrl || null,
    isFavorite: Boolean(item.isFavorite),
  }));
};

/**
 * Isolated mock recommendation provider for offline testing when external AI service is unavailable.
 * Clearly flagged with isMock: true so mock output is never mistaken for real AI model inferences.
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
      data: {
        recommendations: [],
        message: 'No wardrobe items provided to build recommendations.',
      },
    };
  }

  // Pick suitable items from user's actual wardrobe
  // Group by broad category to compose an outfit
  const tops = wardrobeItems.filter((i) =>
    ['Shirt', 'T-Shirt', 'Jacket'].includes(i.category)
  );
  const bottoms = wardrobeItems.filter((i) =>
    ['Jeans', 'Trousers', 'Skirt'].includes(i.category)
  );
  const shoes = wardrobeItems.filter((i) => i.category === 'Shoes');
  const dresses = wardrobeItems.filter((i) => i.category === 'Dress');

  const selectedIds = [];

  if (dresses.length > 0 && Math.random() > 0.5) {
    selectedIds.push(dresses[0].id);
    if (shoes.length > 0) selectedIds.push(shoes[0].id);
  } else {
    // Pick 1 top
    if (tops.length > 0) selectedIds.push(tops[0].id);
    // Pick 1 bottom
    if (bottoms.length > 0) selectedIds.push(bottoms[0].id);
    // Pick shoes if available
    if (shoes.length > 0) selectedIds.push(shoes[0].id);
  }

  // Fallback: If category matching didn't yield at least 1 item, take up to first 3 items
  if (selectedIds.length === 0) {
    wardrobeItems.slice(0, 3).forEach((item) => selectedIds.push(item.id));
  }

  const occasion = preferences.occasion || 'Everyday';
  const style = preferences.style || 'Casual';
  const weather = preferences.weather || 'Moderate';

  return {
    success: true,
    isMock: true,
    data: {
      recommendations: [
        {
          outfitName: `${occasion} ${style} Ensemble`,
          clothingItemIds: selectedIds,
          confidence: 0.91,
          explanation: `A curated combination matching your ${style.toLowerCase()} style preference for ${occasion.toLowerCase()} in ${weather.toLowerCase()} conditions.`,
          occasion,
          style,
          season: weather,
        },
      ],
    },
  };
};

/**
 * Validates and normalizes raw recommendation response from AI service or mock adapter.
 *
 * @param {object} rawData - Raw data from AI service
 * @returns {Array<object>} Normalized recommendations array
 */
export const normalizeRecommendationResponse = (rawData = {}) => {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Malformed AI recommendation payload received.');
  }

  const rawRecommendations = Array.isArray(rawData.recommendations)
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
      outfitName: rec.outfitName ? String(rec.outfitName).trim() : `Recommended Outfit ${index + 1}`,
      clothingItemIds: [...new Set(rawIds)],
      confidence,
      explanation: rec.explanation
        ? String(rec.explanation).trim()
        : 'Smart combination recommended based on your preferences.',
      occasion: rec.occasion ? String(rec.occasion).trim() : null,
      style: rec.style ? String(rec.style).trim() : null,
      season: rec.season ? String(rec.season).trim() : null,
    };
  });
};

/**
 * Sends user wardrobe items and style preferences to external Python AI recommendation service.
 * Handles timeouts, network failures, schema validation, and configurable mock fallback.
 *
 * @param {object} params
 * @param {Array<object>} params.wardrobeItems - User's wardrobe items
 * @param {object} params.preferences - User preferences (occasion, style, weather, colors, etc.)
 * @returns {Promise<{success: boolean, isMock: boolean, recommendations: Array<object>}>}
 */
export const requestOutfitRecommendations = async ({ wardrobeItems = [], preferences = {} }) => {
  const formattedWardrobe = formatWardrobeForAI(wardrobeItems);

  const payload = {
    wardrobe: formattedWardrobe,
    preferences: {
      occasion: preferences.occasion ? String(preferences.occasion).trim() : null,
      style: preferences.style ? String(preferences.style).trim() : null,
      weather: preferences.weather ? String(preferences.weather).trim() : null,
      preferredColors: Array.isArray(preferences.preferredColors)
        ? preferences.preferredColors.map((c) => String(c).trim()).filter(Boolean)
        : typeof preferences.preferredColors === 'string' && preferences.preferredColors.trim()
        ? preferences.preferredColors.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      otherPreferences: preferences.otherPreferences
        ? String(preferences.otherPreferences).trim()
        : null,
    },
  };

  const targetUrl = `${aiConfig.recommendationServiceUrl}${aiConfig.recommendationEndpoint}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(aiConfig.recommendationTimeoutMs),
    });

    if (!response.ok) {
      if (
        (response.status === 404 || response.status === 502 || response.status === 503) &&
        aiConfig.recommendationMockFallback
      ) {
        console.warn(
          `[AI Recommendation Notice] AI recommendation service at ${targetUrl} returned HTTP ${response.status}. Falling back to isolated mock adapter.`
        );
        const mockResult = getMockOutfitRecommendation({
          wardrobeItems: formattedWardrobe,
          preferences,
        });
        const normalized = normalizeRecommendationResponse(mockResult.data);
        return {
          success: true,
          isMock: true,
          recommendations: normalized,
        };
      }

      const errorText = await response.text().catch(() => '');
      const error = new Error(
        `AI recommendation service returned HTTP ${response.status}: ${errorText || response.statusText}`
      );
      error.statusCode = 502;
      throw error;
    }

    const json = await response.json();

    if (!json || json.success !== true || !json.data) {
      const error = new Error('AI recommendation service returned invalid or missing recommendation data.');
      error.statusCode = 502;
      throw error;
    }

    const normalized = normalizeRecommendationResponse(json.data);

    return {
      success: true,
      isMock: false,
      recommendations: normalized,
    };
  } catch (err) {
    const isNetworkError =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.name === 'TimeoutError' ||
      err.name === 'AbortError' ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNREFUSED');

    // If mock fallback enabled and service is offline, return mock recommendation
    if (isNetworkError && aiConfig.recommendationMockFallback) {
      console.warn(
        `[AI Recommendation Notice] AI recommendation service at ${targetUrl} is unreachable (${err.message}). Using isolated mock adapter for testing.`
      );
      const mockResult = getMockOutfitRecommendation({
        wardrobeItems: formattedWardrobe,
        preferences,
      });
      const normalized = normalizeRecommendationResponse(mockResult.data);
      return {
        success: true,
        isMock: true,
        recommendations: normalized,
      };
    }

    // Map network errors to proper HTTP gateway status codes
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const timeoutError = new Error(
        `AI recommendation request timed out after ${aiConfig.recommendationTimeoutMs}ms.`
      );
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (isNetworkError) {
      const serviceError = new Error(
        `AI recommendation service is unavailable at ${aiConfig.recommendationServiceUrl}. Please ensure the Python recommendation service is running.`
      );
      serviceError.statusCode = 503;
      throw serviceError;
    }

    throw err;
  }
};

export default {
  formatWardrobeForAI,
  getMockOutfitRecommendation,
  normalizeRecommendationResponse,
  requestOutfitRecommendations,
};
