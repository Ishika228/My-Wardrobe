/**
 * rankingEngine.js
 * Multi-factor outfit scoring and explanation generator.
 * Combines Color Harmony + Season/Occasion Fit + Unworn Clothing Revival Boost.
 */

const { evaluateOutfitColors } = require('./colorRules');

/**
 * Calculates wear recency and wear frequency score (0 to 20 bonus)
 */
function calculateUnwornBonus(items, targetDate = new Date()) {
  let bonus = 0;
  let neglectedItems = [];

  for (const item of items) {
    const timesWorn = item.times_worn;
    const lastWorn = item.last_worn ? new Date(item.last_worn) : null;

    // Never worn item
    if (timesWorn === 0 || (timesWorn === undefined && !lastWorn)) {
      bonus += 10;
      neglectedItems.push(`${item.name || item.category} (Never worn)`);
      continue;
    }

    // Worn very infrequently
    if (typeof timesWorn === 'number' && timesWorn <= 2) {
      bonus += 5;
    }

    // Not worn in over 60 days
    if (lastWorn && !isNaN(lastWorn.getTime())) {
      const diffDays = Math.floor((targetDate.getTime() - lastWorn.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 60) {
        bonus += 6;
        neglectedItems.push(`${item.name || item.category} (Unworn for ${diffDays} days)`);
      }
    }
  }

  // Cap bonus at 20 points
  return {
    bonusScore: Math.min(bonus, 20),
    neglectedItems
  };
}

/**
 * Evaluates occasion and season alignment score (0 to 30 points each)
 */
function evaluateContextFit(items, occasion, season) {
  let occasionPoints = 0;
  let seasonPoints = 0;
  const n = items.length;

  for (const item of items) {
    // Occasion check
    if (!occasion || occasion === 'Any') {
      occasionPoints += 30 / n;
    } else if (item.occasions && item.occasions.some(o => o.toLowerCase() === occasion.toLowerCase())) {
      occasionPoints += 30 / n;
    } else {
      occasionPoints += 15 / n; // Partial credit
    }

    // Season check
    if (!season || season === 'Any') {
      seasonPoints += 30 / n;
    } else if (item.seasons && item.seasons.some(s => s.toLowerCase() === season.toLowerCase())) {
      seasonPoints += 30 / n;
    } else {
      seasonPoints += 10 / n;
    }
  }

  return {
    occasionScore: Math.round(occasionPoints),
    seasonScore: Math.round(seasonPoints)
  };
}

/**
 * Scores an outfit and generates a human-friendly styling explanation
 */
function scoreOutfit(candidate, occasion, season, options = {}) {
  const items = candidate.items;
  
  // 1. Color Harmony (scaled to 0-40)
  const colorEval = evaluateOutfitColors(items);
  const colorScorePart = Math.round((colorEval.score / 100) * 40);

  // 2. Occasion & Season Fit (0-30 each)
  const contextFit = evaluateContextFit(items, occasion, season);

  // 3. Unworn Clothing Boost (0-20 bonus)
  const unworn = calculateUnwornBonus(items);
  const unwornBonus = options.boostUnworn !== false ? unworn.bonusScore : 0;

  // Cold season outerwear bonus: In Winter or Monsoon, outerwear is essential
  const isColdSeason = (season || '').toLowerCase() === 'winter' || (season || '').toLowerCase() === 'monsoon';
  const hasOuterwear = items.some(i => ['jacket', 'hoodie', 'sweater', 'outerwear'].includes((i.category || '').toLowerCase()));
  let seasonalLayerBonus = 0;
  if (isColdSeason && hasOuterwear) {
    seasonalLayerBonus = 5;
  }

  // Composite raw score (max ~ 125, clamped to 100)
  let rawScore = colorScorePart + contextFit.occasionScore + contextFit.seasonScore + unwornBonus + seasonalLayerBonus;
  
  // Severe penalty if clashing colors
  if (colorEval.isClashing) {
    rawScore = Math.min(rawScore, 45);
  }

  const finalScore = Math.min(Math.max(rawScore, 10), 100);

  // Build natural-sounding explanation
  const explanationParts = [];
  
  if (colorEval.isClashing) {
    explanationParts.push(`Caution: Contains contrasting colors that may clash (${colorEval.reasons}).`);
  } else {
    explanationParts.push(colorEval.reasons);
  }

  if (occasion && occasion !== 'Any') {
    explanationParts.push(`Well-suited for ${occasion} wear in ${season || 'current weather'}.`);
  }

  if (isColdSeason && hasOuterwear) {
    explanationParts.push('Includes warm outerwear layering ideal for cold weather.');
  }

  if (unworn.neglectedItems.length > 0 && options.boostUnworn !== false) {
    explanationParts.push(`Sustainable pick: Helps you re-wear forgotten clothes (${unworn.neglectedItems.join(', ')}).`);
  }

  return {
    ...candidate,
    occasion: occasion || 'Any',
    season: season || 'Any',
    recommendation_score: finalScore,
    raw_score: rawScore,
    compatibility: {
      color_score: colorEval.score,
      color_harmony_status: colorEval.isClashing ? 'clashing' : (colorEval.score >= 80 ? 'excellent' : 'good'),
      is_clashing: colorEval.isClashing,
      details: colorEval.reasons
    },
    unworn_bonus: unwornBonus,
    explanation: explanationParts.join(' ')
  };
}

module.exports = {
  calculateUnwornBonus,
  evaluateContextFit,
  scoreOutfit
};
