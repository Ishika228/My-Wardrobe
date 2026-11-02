/**
 * recommender.js
 * Main entry point for the WardrobeWise Recommendation Engine.
 * Implements:
 * - Context-aware outfit generation (Occasion, Season)
 * - Strict wardrobe boundary checks (never invents missing clothes)
 * - Color harmony scoring & clashing prevention
 * - Unused clothing identification and revival recommendations
 */

const { groupAndFilterWardrobe, buildCombinations } = require('./outfitBuilder');
const { scoreOutfit } = require('./rankingEngine');

/**
 * Validates wardrobe structure
 */
function validateWardrobe(wardrobe) {
  if (!wardrobe) {
    return { valid: false, message: 'Wardrobe data is null or undefined.' };
  }
  if (!Array.isArray(wardrobe)) {
    return { valid: false, message: 'Wardrobe must be an array of clothing items.' };
  }
  if (wardrobe.length === 0) {
    return { valid: false, message: 'Wardrobe is empty. Please add clothing items to get recommendations.' };
  }
  return { valid: true };
}

/**
 * Recommends smart outfits from user's available wardrobe
 * 
 * @param {Array} wardrobe - Array of clothing item objects
 * @param {Object} options - { occasion, season, limit, boostUnworn }
 * @returns {Object} Structured recommendation result
 */
function recommendOutfits(wardrobe, options = {}) {
  const validation = validateWardrobe(wardrobe);
  if (!validation.valid) {
    return {
      status: 'error',
      message: validation.message,
      recommended_outfits: [],
      diagnostics: null
    };
  }

  const occasion = options.occasion || 'Any';
  const season = options.season || 'Any';
  const limit = options.limit || 5;
  const boostUnworn = options.boostUnworn !== false;

  // 1. Group and filter wardrobe by criteria
  const groups = groupAndFilterWardrobe(wardrobe, occasion, season);

  // Check if we have minimum requirements for at least one outfit template
  const hasTwoPiece = (groups.top.length > 0 && groups.bottom.length > 0 && groups.footwear.length > 0);
  const hasDress = (groups.dress.length > 0 && groups.footwear.length > 0);

  if (!hasTwoPiece && !hasDress) {
    const missing = [];
    if (groups.top.length === 0 && groups.dress.length === 0) missing.push('tops or dresses');
    if (groups.bottom.length === 0 && groups.dress.length === 0) missing.push('bottoms');
    if (groups.footwear.length === 0) missing.push('footwear');

    return {
      status: 'insufficient_items',
      message: `Could not form an outfit for occasion "${occasion}" in "${season}". Missing suitable ${missing.join(' and ')} in your wardrobe.`,
      recommended_outfits: [],
      diagnostics: {
        available_counts: {
          tops: groups.top.length,
          bottoms: groups.bottom.length,
          dresses: groups.dress.length,
          outerwear: groups.outerwear.length,
          footwear: groups.footwear.length
        },
        requested_occasion: occasion,
        requested_season: season
      }
    };
  }

  // 2. Build candidate outfit combinations
  const candidates = buildCombinations(groups, season, 60);

  if (candidates.length === 0) {
    return {
      status: 'no_valid_combinations',
      message: 'No compatible outfit combinations could be generated with your current filter settings.',
      recommended_outfits: []
    };
  }

  // 3. Score and explain each candidate
  const scoredOutfits = candidates.map(c => scoreOutfit(c, occasion, season, { boostUnworn }));

  // 4. Sort descending by score, breaking ties by raw_score and seasonal layering
  const isCold = (season || '').toLowerCase() === 'winter' || (season || '').toLowerCase() === 'monsoon';
  scoredOutfits.sort((a, b) => {
    if (b.recommendation_score !== a.recommendation_score) {
      return b.recommendation_score - a.recommendation_score;
    }
    if ((b.raw_score || 0) !== (a.raw_score || 0)) {
      return (b.raw_score || 0) - (a.raw_score || 0);
    }
    if (isCold) {
      if (b.type === 'layered' && a.type !== 'layered') return 1;
      if (a.type === 'layered' && b.type !== 'layered') return -1;
    }
    return 0;
  });

  // 5. Deduplicate similar top/bottom combos if multiple exist
  const uniqueOutfits = [];
  const seenCombos = new Set();

  for (const outfit of scoredOutfits) {
    const comboKey = outfit.items.map(i => i.item_id).sort().join('_');
    if (!seenCombos.has(comboKey)) {
      seenCombos.add(comboKey);
      uniqueOutfits.push(outfit);
    }
    if (uniqueOutfits.length >= limit) break;
  }

  return {
    status: 'success',
    total_candidates_evaluated: candidates.length,
    returned_count: uniqueOutfits.length,
    filters_applied: { occasion, season },
    recommended_outfits: uniqueOutfits
  };
}

/**
 * Identifies unused or rarely used clothes and recommends outfits built around them
 * 
 * @param {Array} wardrobe - Array of clothing item objects
 * @param {Object} options - { occasion, season, limit }
 * @returns {Object} Structured unused clothing recommendations
 */
function recommendUnusedItemOutfits(wardrobe, options = {}) {
  const validation = validateWardrobe(wardrobe);
  if (!validation.valid) {
    return {
      status: 'error',
      message: validation.message,
      neglected_items: [],
      revival_outfits: []
    };
  }

  // Check if ANY item in wardrobe contains usage history
  const hasAnyUsageData = wardrobe.some(
    item => typeof item.times_worn === 'number' || (item.last_worn && item.last_worn.trim() !== '')
  );

  if (!hasAnyUsageData) {
    return {
      status: 'no_usage_history',
      message: "Unused-clothing analysis requires usage history ('times_worn' or 'last_worn' fields). Please log item wear to enable smart closet revival.",
      neglected_items: [],
      revival_outfits: []
    };
  }

  const now = new Date();
  const neglectedItems = [];

  for (const item of wardrobe) {
    let isNeglected = false;
    let reason = '';

    // Condition 1: Never worn
    if (item.times_worn === 0) {
      isNeglected = true;
      reason = 'Never worn yet';
    } 
    // Condition 2: Not worn in > 60 days
    else if (item.last_worn) {
      const lastWornDate = new Date(item.last_worn);
      if (!isNaN(lastWornDate.getTime())) {
        const diffDays = Math.floor((now.getTime() - lastWornDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 60) {
          isNeglected = true;
          reason = `Last worn ${diffDays} days ago`;
        }
      }
    } 
    // Condition 3: Very low wear count compared to rest of closet
    else if (typeof item.times_worn === 'number' && item.times_worn <= 1) {
      isNeglected = true;
      reason = `Worn only ${item.times_worn} time`;
    }

    if (isNeglected) {
      neglectedItems.push({
        item_id: item.item_id,
        name: item.name,
        category: item.category,
        colour: item.colour,
        times_worn: item.times_worn,
        last_worn: item.last_worn,
        neglect_reason: reason
      });
    }
  }

  if (neglectedItems.length === 0) {
    return {
      status: 'success',
      message: 'Great job! Your entire wardrobe is actively rotated and no items are currently neglected.',
      neglected_items: [],
      revival_outfits: []
    };
  }

  // Generate revival outfits specifically incorporating each neglected item
  const revivalOutfits = [];
  const allRecommendations = recommendOutfits(wardrobe, {
    occasion: options.occasion || 'Any',
    season: options.season || 'Any',
    limit: 25,
    boostUnworn: true
  });

  if (allRecommendations.status === 'success') {
    const neglectedIds = new Set(neglectedItems.map(i => i.item_id));
    for (const outfit of allRecommendations.recommended_outfits) {
      const containsNeglected = outfit.items.some(i => neglectedIds.has(i.item_id));
      if (containsNeglected) {
        revivalOutfits.push(outfit);
      }
      if (revivalOutfits.length >= (options.limit || 5)) break;
    }
  }

  return {
    status: 'success',
    neglected_items_count: neglectedItems.length,
    neglected_items: neglectedItems,
    revival_outfits: revivalOutfits
  };
}

module.exports = {
  recommendOutfits,
  recommendUnusedItemOutfits,
  validateWardrobe
};
