/**
 * colorRules.js
 * Rule-based fashion color compatibility engine.
 * Implements fashion color harmony theory:
 * - Neutral anchoring (Black, White, Grey, Beige, Navy Blue, Denim Blue)
 * - Monochromatic pairing (shades of the same color family)
 * - Complementary & analogous pairings
 * - Clashing prevention rules
 */

// Universal neutrals that can pair with almost any color
const NEUTRALS = new Set([
  'white',
  'black',
  'grey',
  'gray',
  'beige',
  'cream',
  'khaki',
  'navy blue',
  'navy',
  'denim blue'
]);

// Color families for monochromatic matching
const COLOR_FAMILIES = {
  blue: ['blue', 'navy blue', 'navy', 'sky blue', 'royal blue', 'light blue', 'indigo'],
  red: ['red', 'maroon', 'burgundy', 'crimson', 'wine', 'pink'],
  green: ['green', 'olive green', 'olive', 'emerald green', 'mint', 'forest green', 'sage'],
  brown: ['brown', 'tan', 'beige', 'camel', 'chocolate', 'coffee', 'khaki'],
  yellow: ['yellow', 'mustard', 'gold', 'amber'],
  purple: ['purple', 'violet', 'lavender', 'plum', 'mauve'],
  grey: ['grey', 'gray', 'charcoal', 'silver', 'slate']
};

// Known high-harmony pairs (Primary -> Compatible Secondaries)
const HARMONY_PAIRS = {
  'navy blue': ['white', 'grey', 'beige', 'brown', 'red', 'pink', 'mustard', 'light blue'],
  'blue': ['white', 'grey', 'black', 'beige', 'brown', 'orange', 'yellow'],
  'black': ['white', 'grey', 'red', 'blue', 'pink', 'green', 'yellow', 'beige', 'purple'],
  'white': ['black', 'blue', 'navy blue', 'red', 'green', 'brown', 'grey', 'pink', 'olive green'],
  'grey': ['white', 'black', 'navy blue', 'burgundy', 'pink', 'olive green', 'yellow'],
  'beige': ['navy blue', 'brown', 'white', 'black', 'olive green', 'burgundy', 'emerald green'],
  'brown': ['beige', 'white', 'cream', 'navy blue', 'light blue', 'olive green'],
  'olive green': ['beige', 'white', 'black', 'cream', 'navy blue', 'brown', 'burgundy'],
  'green': ['white', 'black', 'beige', 'grey', 'brown', 'navy blue'],
  'burgundy': ['grey', 'black', 'white', 'navy blue', 'beige', 'pink'],
  'red': ['black', 'white', 'grey', 'navy blue', 'denim blue'],
  'pink': ['grey', 'white', 'navy blue', 'black', 'denim blue'],
  'yellow': ['grey', 'navy blue', 'black', 'white', 'denim blue'],
  'purple': ['grey', 'white', 'black', 'beige', 'silver']
};

// Colors that generally clash when worn directly together without a neutral buffer
const CLASHING_PAIRS = [
  ['red', 'green'], // Unless holiday/themed, bright red + bright green often clash
  ['brown', 'black'], // Clashes when worn as two heavy dark tones without contrast
  ['purple', 'yellow'], // High visual vibrating contrast, difficult to balance
  ['orange', 'pink'], // Competing warm hues
  ['navy blue', 'black'] // Extremely close dark tones that look like an accidental mismatch
];

/**
 * Normalize color name to lowercase trimmed string
 */
function normalizeColor(color) {
  if (!color) return 'unknown';
  if (typeof color === 'object' && color.dominant) {
    return color.dominant.toLowerCase().trim();
  }
  return String(color).toLowerCase().trim();
}

/**
 * Checks if two colors are in the same color family (monochromatic harmony)
 */
function isMonochromatic(c1, c2) {
  for (const family of Object.values(COLOR_FAMILIES)) {
    if (family.includes(c1) && family.includes(c2) && c1 !== c2) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluates the color compatibility between two colors.
 * Returns a score between 0 and 100 with an explanation.
 */
function evaluateColorPair(color1, color2) {
  const c1 = normalizeColor(color1);
  const c2 = normalizeColor(color2);

  if (c1 === 'unknown' || c2 === 'unknown') {
    return {
      score: 65,
      reason: 'Neutral baseline assumed for unspecified color.',
      isClashing: false
    };
  }

  // Exact same color
  if (c1 === c2) {
    if (NEUTRALS.has(c1)) {
      return {
        score: 85,
        reason: `Clean monochromatic neutral set (${c1} on ${c2}).`,
        isClashing: false
      };
    }
    return {
      score: 75,
      reason: `Monochrome all-${c1} look. Recommended to break with contrasting accessories.`,
      isClashing: false
    };
  }

  // Check for clashes first
  for (const [clashA, clashB] of CLASHING_PAIRS) {
    if ((c1.includes(clashA) && c2.includes(clashB)) || (c1.includes(clashB) && c2.includes(clashA))) {
      return {
        score: 35,
        reason: `${c1} and ${c2} tend to visually clash without a neutral buffer.`,
        isClashing: true
      };
    }
  }

  // One or both are neutrals
  if (NEUTRALS.has(c1) && NEUTRALS.has(c2)) {
    return {
      score: 95,
      reason: `Timeless high-contrast neutral harmony (${c1} with ${c2}).`,
      isClashing: false
    };
  }

  if (NEUTRALS.has(c1) || NEUTRALS.has(c2)) {
    const neutral = NEUTRALS.has(c1) ? c1 : c2;
    const accent = NEUTRALS.has(c1) ? c2 : c1;
    return {
      score: 90,
      reason: `Well-balanced combination: neutral ${neutral} anchors the vibrant ${accent}.`,
      isClashing: false
    };
  }

  // Monochromatic check (e.g. Navy and Sky blue)
  if (isMonochromatic(c1, c2)) {
    return {
      score: 88,
      reason: `Elegant monochromatic tonal pairing (${c1} and ${c2}).`,
      isClashing: false
    };
  }

  // Documented fashion harmony pairs
  if (HARMONY_PAIRS[c1] && HARMONY_PAIRS[c1].some(h => c2.includes(h))) {
    return {
      score: 85,
      reason: `Harmonious fashion pairing between ${c1} and ${c2}.`,
      isClashing: false
    };
  }
  if (HARMONY_PAIRS[c2] && HARMONY_PAIRS[c2].some(h => c1.includes(h))) {
    return {
      score: 85,
      reason: `Harmonious fashion pairing between ${c1} and ${c2}.`,
      isClashing: false
    };
  }

  // Default pleasant combination
  return {
    score: 65,
    reason: `Balanced pairing (${c1} with ${c2}).`,
    isClashing: false
  };
}

/**
 * Evaluates the overall color harmony of an entire outfit (array of clothing items)
 */
function evaluateOutfitColors(items) {
  if (!items || items.length < 2) {
    return { score: 100, reason: 'Single piece outfit.' };
  }

  let totalScore = 0;
  let comparisons = 0;
  let hasClash = false;
  const reasons = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const colorA = items[i].colour;
      const colorB = items[j].colour;
      const result = evaluateColorPair(colorA, colorB);
      totalScore += result.score;
      comparisons++;
      if (result.isClashing) {
        hasClash = true;
      }
      if (result.score >= 85 || result.isClashing) {
        reasons.push(result.reason);
      }
    }
  }

  const averageScore = Math.round(totalScore / comparisons);
  const finalScore = hasClash ? Math.min(averageScore, 40) : averageScore;

  return {
    score: finalScore,
    isClashing: hasClash,
    reasons: reasons.slice(0, 2).join(' ') || 'Standard balanced outfit colors.'
  };
}

module.exports = {
  NEUTRALS,
  evaluateColorPair,
  evaluateOutfitColors,
  normalizeColor
};
