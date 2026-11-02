import fs from 'fs';
import path from 'path';
import { aiConfig } from '../config/aiConfig.js';
import { CLOTHING_CATEGORIES } from '../models/ClothingItem.js';

/**
 * Isolated mock prediction provider for offline local testing
 * Clearly flagged so mock data is never mistaken for real AI model inferences.
 * 
 * @param {string} filename - Filename of the clothing image
 * @returns {object} Standardized mock AI analysis response
 */
export const getMockAiPrediction = (filename = '') => {
  const ext = path.extname(filename).toLowerCase();
  const lowerName = filename.toLowerCase();

  // Return realistic mock prediction based on filename hints or default to Jacket
  let category = 'Jacket';
  let subCategory = 'Denim Jacket';
  let color = 'Blue';
  let material = 'Denim';
  let pattern = 'Solid';

  if (lowerName.includes('shirt')) {
    category = 'Shirt';
    subCategory = 'Oxford Shirt';
    color = 'White';
    material = 'Cotton';
    pattern = 'Striped';
  } else if (lowerName.includes('jean') || lowerName.includes('trouser')) {
    category = 'Jeans';
    subCategory = 'Slim Fit Denim';
    color = 'Black';
    material = 'Denim';
    pattern = 'Solid';
  }

  return {
    success: true,
    isMock: true,
    data: {
      category,
      subCategory,
      color,
      secondaryColors: [],
      pattern,
      material,
      season: ['Autumn', 'Winter'],
      occasion: ['Casual', 'College'],
      style: ['Casual', 'Streetwear'],
      confidence: 0.94,
    },
  };
};

/**
 * Validates and normalizes raw predictions returned by the AI recognition service
 * 
 * @param {object} rawData - Raw prediction data from AI service or mock
 * @returns {object} Normalized prediction object
 */
export const normalizeAiPrediction = (rawData = {}) => {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Malformed AI recognition payload received.');
  }

  // 1. Validate category against supported CLOTHING_CATEGORIES enum
  let normalizedCategory = null;
  if (rawData.category && typeof rawData.category === 'string') {
    const matched = CLOTHING_CATEGORIES.find(
      (c) => c.toLowerCase() === rawData.category.trim().toLowerCase()
    );
    normalizedCategory = matched || 'Other';
  }

  // 2. Validate confidence (clamped between 0 and 1)
  let confidence = null;
  if (typeof rawData.confidence === 'number' && !isNaN(rawData.confidence)) {
    confidence = Math.min(1, Math.max(0, rawData.confidence));
  }

  return {
    category: normalizedCategory,
    subCategory: rawData.subCategory ? String(rawData.subCategory).trim() : null,
    color: rawData.color ? String(rawData.color).trim() : null,
    secondaryColors: Array.isArray(rawData.secondaryColors)
      ? rawData.secondaryColors.map((c) => String(c).trim()).filter(Boolean)
      : [],
    pattern: rawData.pattern ? String(rawData.pattern).trim() : null,
    material: rawData.material ? String(rawData.material).trim() : null,
    season: Array.isArray(rawData.season)
      ? rawData.season.map((s) => String(s).trim()).filter(Boolean)
      : [],
    occasion: Array.isArray(rawData.occasion)
      ? rawData.occasion.map((o) => String(o).trim()).filter(Boolean)
      : [],
    style: Array.isArray(rawData.style)
      ? rawData.style.map((st) => String(st).trim()).filter(Boolean)
      : [],
    confidence,
  };
};

/**
 * Sends a clothing image to the external Python AI service via HTTP multipart/form-data.
 * Automatically falls back to the isolated mock adapter if configured and service is unreachable.
 * 
 * @param {string} relativeImagePath - Relative image path stored in MongoDB (e.g. /uploads/clothing/abc.jpg)
 * @returns {Promise<{success: boolean, data: object, isMock: boolean}>}
 */
export const recognizeClothingImage = async (relativeImagePath) => {
  if (!relativeImagePath || typeof relativeImagePath !== 'string') {
    const error = new Error('No image path provided for AI analysis.');
    error.statusCode = 400;
    throw error;
  }

  // Sanitize path and verify physical file existence on local storage
  const cleanRelative = relativeImagePath.replace(/^\/?uploads\/clothing\//, '');
  const absolutePath = path.resolve('uploads', 'clothing', path.basename(cleanRelative));

  if (!fs.existsSync(absolutePath)) {
    const error = new Error('Associated clothing image file was not found on local storage.');
    error.statusCode = 404;
    throw error;
  }

  const targetUrl = `${aiConfig.serviceUrl}${aiConfig.recognitionEndpoint}`;
  const filename = path.basename(absolutePath);

  try {
    const fileBuffer = fs.readFileSync(absolutePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', new Blob([fileBuffer], { type: mimeType }), filename);

    // Send HTTP POST to Python AI service with configurable timeout
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(aiConfig.timeoutMs),
    });

    if (!response.ok) {
      if ((response.status === 404 || response.status === 502 || response.status === 503) && aiConfig.mockFallback) {
        console.warn(`[AI Service Notice] AI service at ${targetUrl} returned HTTP ${response.status}. Falling back to isolated mock adapter for local testing.`);
        const mockResult = getMockAiPrediction(filename);
        const normalizedData = normalizeAiPrediction(mockResult.data);
        return {
          success: true,
          isMock: true,
          data: normalizedData,
        };
      }

      const errorText = await response.text().catch(() => '');
      const error = new Error(`AI service returned HTTP ${response.status}: ${errorText || response.statusText}`);
      error.statusCode = 502;
      throw error;
    }

    const json = await response.json();

    if (!json || json.success !== true || !json.data) {
      const error = new Error('AI recognition service returned invalid or missing prediction data.');
      error.statusCode = 502;
      throw error;
    }

    const normalizedData = normalizeAiPrediction(json.data);

    return {
      success: true,
      isMock: false,
      data: normalizedData,
    };
  } catch (err) {
    // Check if network error or service unreachable
    const isNetworkError =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.name === 'TimeoutError' ||
      err.name === 'AbortError' ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNREFUSED');

    // If mock fallback is enabled and service is offline, use documented mock adapter
    if (isNetworkError && aiConfig.mockFallback) {
      console.warn(`[AI Service Notice] AI service at ${targetUrl} is unreachable (${err.message}). Using isolated mock adapter for testing.`);
      const mockResult = getMockAiPrediction(filename);
      const normalizedData = normalizeAiPrediction(mockResult.data);
      return {
        success: true,
        isMock: true,
        data: normalizedData,
      };
    }

    // Map network errors to proper HTTP gateway status codes
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      const timeoutError = new Error(`AI recognition request timed out after ${aiConfig.timeoutMs}ms.`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    if (isNetworkError) {
      const serviceError = new Error(`AI recognition service is unavailable at ${aiConfig.serviceUrl}. Please ensure the Python service is running.`);
      serviceError.statusCode = 503;
      throw serviceError;
    }

    throw err;
  }
};

export default {
  recognizeClothingImage,
  normalizeAiPrediction,
  getMockAiPrediction,
};
