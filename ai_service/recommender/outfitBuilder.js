/**
 * outfitBuilder.js
 * Assembles logically complete outfits from available user wardrobe items.
 * Enforces strict wardrobe boundaries: never invents items not in the user closet.
 */

// Mapping of specific categories to structural role groups
const CATEGORY_MAP = {
  'shirt': 'top',
  't-shirt': 'top',
  'tshirt': 'top',
  'top': 'top',
  
  'jeans': 'bottom',
  'trousers': 'bottom',
  'shorts': 'bottom',
  'skirt': 'bottom',
  'bottom': 'bottom',
  
  'dress': 'dress',
  
  'jacket': 'outerwear',
  'hoodie': 'outerwear',
  'sweater': 'outerwear',
  'outerwear': 'outerwear',
  
  'shoes': 'footwear',
  'sneakers': 'footwear',
  'boots': 'footwear',
  'footwear': 'footwear',
  
  'accessories': 'accessory',
  'accessory': 'accessory'
};

/**
 * Resolves the structural group (top, bottom, dress, etc.) for a clothing item
 */
function getItemRole(item) {
  if (item.category_group) {
    return item.category_group.toLowerCase().trim();
  }
  const cat = (item.category || '').toLowerCase().trim();
  return CATEGORY_MAP[cat] || 'unknown';
}

/**
 * Checks if an item is compatible with a requested occasion
 */
function matchesOccasion(item, requestedOccasion) {
  if (!requestedOccasion || requestedOccasion === 'Any') return true;
  if (!item.occasions || !Array.isArray(item.occasions) || item.occasions.length === 0) return true;
  return item.occasions.some(
    occ => occ.toLowerCase() === requestedOccasion.toLowerCase()
  );
}

/**
 * Checks if an item is compatible with a requested season
 */
function matchesSeason(item, requestedSeason) {
  if (!requestedSeason || requestedSeason === 'Any') return true;
  if (!item.seasons || !Array.isArray(item.seasons) || item.seasons.length === 0) return true;
  return item.seasons.some(
    season => season.toLowerCase() === requestedSeason.toLowerCase()
  );
}

/**
 * Groups wardrobe items by structural role and filters by season/occasion
 */
function groupAndFilterWardrobe(wardrobe, occasion, season) {
  const groups = {
    top: [],
    bottom: [],
    dress: [],
    outerwear: [],
    footwear: [],
    accessory: []
  };

  for (const item of wardrobe) {
    if (!item || !item.item_id) continue;
    
    // Check filter criteria
    const seasonOk = matchesSeason(item, season);
    const occasionOk = matchesOccasion(item, occasion);

    if (seasonOk && occasionOk) {
      const role = getItemRole(item);
      if (groups[role]) {
        groups[role].push(item);
      }
    }
  }

  return groups;
}

/**
 * Builds candidate outfit combinations from grouped wardrobe items.
 * Caps combinations to prevent combinatorial explosions on large wardrobes.
 */
function buildCombinations(groups, season, maxCandidates = 50) {
  const candidates = [];
  const isColdSeason = (season || '').toLowerCase() === 'winter' || (season || '').toLowerCase() === 'monsoon';

  // Template 1: Top + Bottom + Footwear
  for (const top of groups.top) {
    for (const bottom of groups.bottom) {
      for (const footwear of groups.footwear) {
        // Prevent clash between formal top and beach shorts
        if (top.category?.toLowerCase() === 'shirt' && bottom.category?.toLowerCase() === 'shorts') {
          // Allowed for casual/summer, but skip if top is strictly formal
          if (top.occasions && top.occasions.includes('Formal event') && !top.occasions.includes('Casual outing')) {
            continue;
          }
        }

        const items = [top, bottom, footwear];
        const outfitId = `outfit_${top.item_id}_${bottom.item_id}_${footwear.item_id}`;
        candidates.push({
          outfit_id: outfitId,
          type: 'top_bottom_footwear',
          items,
          slots: { top, bottom, footwear }
        });

        if (candidates.length >= maxCandidates) return candidates;
      }
    }
  }

  // Template 2: Layered (Top + Bottom + Outerwear + Footwear) - especially valuable for Winter/Monsoon
  if (groups.outerwear.length > 0) {
    for (const top of groups.top) {
      for (const bottom of groups.bottom) {
        for (const outerwear of groups.outerwear) {
          for (const footwear of groups.footwear) {
            const items = [top, bottom, outerwear, footwear];
            const outfitId = `outfit_${top.item_id}_${bottom.item_id}_${outerwear.item_id}_${footwear.item_id}`;
            candidates.push({
              outfit_id: outfitId,
              type: 'layered',
              items,
              slots: { top, bottom, outerwear, footwear }
            });

            if (candidates.length >= maxCandidates) return candidates;
          }
        }
      }
    }
  }

  // Template 3: Dress + Footwear (+ optional Outerwear)
  for (const dress of groups.dress) {
    for (const footwear of groups.footwear) {
      const items = [dress, footwear];
      let slots = { dress, footwear };

      // In cold seasons, layer with outerwear if available
      if (isColdSeason && groups.outerwear.length > 0) {
        const coat = groups.outerwear[0];
        items.push(coat);
        slots.outerwear = coat;
      }

      const outfitId = `outfit_${dress.item_id}_${footwear.item_id}`;
      candidates.push({
        outfit_id: outfitId,
        type: 'dress_footwear',
        items,
        slots
      });

      if (candidates.length >= maxCandidates) return candidates;
    }
  }

  return candidates;
}

module.exports = {
  CATEGORY_MAP,
  getItemRole,
  matchesOccasion,
  matchesSeason,
  groupAndFilterWardrobe,
  buildCombinations
};
