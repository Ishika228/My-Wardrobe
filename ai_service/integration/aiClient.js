/**
 * aiClient.js
 * Integration Client for Member 2 (Node.js & Express Backend).
 * Provides two execution modes:
 * 1. Hybrid Mode (Recommended): Runs recommendations directly in Node.js (instant, zero overhead),
 *    and sends image files to the local AI vision service for recognition.
 * 2. Full HTTP Mode: Dispatches all requests over HTTP to the AI microservice.
 */

const fs = require('fs');
const path = require('path');
const { recommendOutfits, recommendUnusedItemOutfits } = require('../recommender/recommender');

class AIClient {
  /**
   * @param {Object} config - Configuration options
   * @param {string} config.aiServiceUrl - Base URL of the AI Microservice (default: http://127.0.0.1:8000)
   */
  constructor(config = {}) {
    this.baseUrl = config.aiServiceUrl || process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Sends a clothing image to the AI vision module for recognition.
   * Identifies category, dominant & secondary color, and pattern.
   * 
   * @param {string} imagePath - Absolute or relative path to the image file
   * @param {string} [itemId] - Optional ID to assign to the item
   * @returns {Promise<Object>} Structured recognition result
   */
  async analyzeClothingImage(imagePath, itemId = null) {
    if (!fs.existsSync(imagePath)) {
      return {
        item_id: itemId || 'item_unknown',
        processing_status: 'error',
        error_message: `File not found on server: ${imagePath}`,
        category: null,
        colour: null,
        pattern: null
      };
    }

    try {
      // Use native Node.js fetch (Node 18+) with FormData
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(imagePath);
      const fileName = path.basename(imagePath);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, fileName);

      if (itemId) {
        formData.append('item_id', itemId);
      }

      const response = await fetch(`${this.baseUrl}/api/ai/analyze-clothing`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      return {
        item_id: itemId || 'item_unknown',
        processing_status: 'error',
        error_message: `AI vision service unreachable: ${err.message}. Ensure FastAPI service is running.`,
        category: null,
        colour: null,
        pattern: null
      };
    }
  }

  /**
   * Generates smart outfit recommendations from a user's wardrobe.
   * Runs natively inside Node.js for maximum speed and zero network latency.
   * 
   * @param {Array} wardrobe - Array of clothing item objects from MongoDB
   * @param {Object} options - { occasion, season, limit, boostUnworn }
   * @returns {Object} Structured recommendation result
   */
  getRecommendations(wardrobe, options = {}) {
    return recommendOutfits(wardrobe, options);
  }

  /**
   * Analyzes wardrobe usage history and generates outfits built around neglected clothes.
   * Runs natively inside Node.js.
   * 
   * @param {Array} wardrobe - Array of clothing item objects from MongoDB
   * @param {Object} options - { occasion, season, limit }
   * @returns {Object} Neglected clothing report and revival outfits
   */
  getUnusedClothingRevival(wardrobe, options = {}) {
    return recommendUnusedItemOutfits(wardrobe, options);
  }

  /**
   * Checks health and availability of the Vision AI microservice.
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/health`);
      return await response.json();
    } catch (err) {
      return { status: 'unreachable', error: err.message };
    }
  }
}

module.exports = new AIClient();
module.exports.AIClient = AIClient;
