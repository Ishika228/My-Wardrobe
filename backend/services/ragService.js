/**
 * RAG (Retrieval-Augmented Generation) Fashion Stylist Service
 * 
 * Architecture:
 * 1. RETRIEVE: Queries MongoDB Atlas for authentic clothing items matching user's query,
 *    style, occasion, weather, and usage history.
 * 2. AUGMENT: Injects retrieved wardrobe context and fashion constraints into prompt.
 * 3. GENERATE: Groq LLaMA-3 generates bespoke styling explanations & selects item IDs.
 *    Resilient Fallback: If Groq key is offline/invalid, uses deterministic rule-based
 *    fashion color theory engine.
 */

import ClothingItem from '../models/ClothingItem.js';
import Groq from 'groq-sdk';

// Universal fashion neutrals
const NEUTRALS = new Set([
  'white', 'black', 'grey', 'gray', 'beige', 'cream', 'khaki', 'navy', 'navy blue', 'denim blue'
]);

// Color families for monochromatic matching
const COLOR_FAMILIES = {
  blue: ['blue', 'navy', 'navy blue', 'sky blue', 'royal blue', 'indigo'],
  red: ['red', 'crimson', 'burgundy', 'maroon', 'wine', 'pink'],
  green: ['green', 'emerald', 'olive', 'mint', 'forest green', 'sage'],
  brown: ['brown', 'tan', 'beige', 'camel', 'chocolate', 'khaki'],
  yellow: ['yellow', 'mustard', 'gold', 'amber'],
  purple: ['purple', 'violet', 'lavender', 'plum']
};

/**
 * Normalizes color string for matching
 */
function normalizeColor(color) {
  if (!color) return 'unknown';
  if (typeof color === 'object') {
    return (color.primary || color.dominant || 'unknown').toLowerCase().trim();
  }
  return String(color).toLowerCase().trim();
}

/**
 * Calculates color harmony score between two colors (0 - 100)
 */
function calculateColorHarmony(color1, color2) {
  const c1 = normalizeColor(color1);
  const c2 = normalizeColor(color2);

  if (c1 === 'unknown' || c2 === 'unknown') return 70;
  if (c1 === c2) return 85; // Monochromatic exact
  if (NEUTRALS.has(c1) || NEUTRALS.has(c2)) return 92; // Neutral anchor

  // Check shared color family
  for (const family of Object.values(COLOR_FAMILIES)) {
    if (family.includes(c1) && family.includes(c2)) return 88;
  }

  // Classic fashion pairings
  if (
    (c1.includes('red') || c1.includes('burgundy') || c1.includes('crimson')) &&
    (c2.includes('gold') || c2.includes('yellow'))
  ) return 96; // Traditional Indian Royal Wedding harmony

  if (
    (c1.includes('emerald') || c1.includes('green')) &&
    (c2.includes('gold') || c2.includes('white'))
  ) return 95;

  return 75; // Standard complement
}

/**
 * 1. RETRIEVE: Fetch and score relevant wardrobe items from MongoDB Atlas
 */
export async function retrieveWardrobeContext({ userId, query = '', preferences = {} }) {
  let filter = {};

  if (userId) {
    const userCount = await ClothingItem.countDocuments({ userId });
    if (userCount > 0) {
      filter.userId = userId;
    }
  }

  // Fetch candidate items from MongoDB Atlas
  let items = await ClothingItem.find(filter).lean();

  if (!items || items.length === 0) {
    // Fallback to all seeded items if user's personal wardrobe is empty
    items = await ClothingItem.find({}).lean();
  }

  if (!items || items.length === 0) {
    return [];
  }

  const queryLower = (query || '').toLowerCase();
  const occPref = (preferences.occasion || '').toLowerCase();
  const weatherPref = (preferences.weather || preferences.season || '').toLowerCase();

  // Score each item's relevance to user's natural language request
  const scoredItems = items.map((item) => {
    let score = 50; // base score

    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const subCat = (item.subCategory || '').toLowerCase();
    const mat = (item.material || '').toLowerCase();
    const col = normalizeColor(item.color);
    const occasions = (item.occasion || []).map((o) => String(o).toLowerCase());
    const seasons = (item.season || []).map((s) => String(s).toLowerCase());
    const styles = (item.style || []).map((st) => String(st).toLowerCase());

    // Query keyword match
    if (queryLower) {
      if (queryLower.includes(cat) || queryLower.includes(subCat)) score += 30;
      if (queryLower.includes(col)) score += 25;
      if (queryLower.includes(mat)) score += 20;

      // Occasion keywords in query
      if (
        (queryLower.includes('festive') || queryLower.includes('wedding') || queryLower.includes('traditional') || queryLower.includes('saree')) &&
        (cat.includes('dress') || subCat.includes('saree') || subCat.includes('anarkali') || styles.includes('ethnic'))
      ) {
        score += 45;
      }

      if (
        (queryLower.includes('formal') || queryLower.includes('work') || queryLower.includes('office') || queryLower.includes('business')) &&
        (occasions.includes('work') || occasions.includes('formal') || styles.includes('formal'))
      ) {
        score += 35;
      }

      if (
        (queryLower.includes('casual') || queryLower.includes('daily') || queryLower.includes('relax') || queryLower.includes('weekend')) &&
        (occasions.includes('casual') || occasions.includes('college'))
      ) {
        score += 30;
      }

      if (
        (queryLower.includes('cold') || queryLower.includes('winter') || queryLower.includes('chilly')) &&
        (seasons.includes('winter') || cat.includes('jacket') || mat.includes('wool') || mat.includes('cashmere'))
      ) {
        score += 35;
      }

      if (
        (queryLower.includes('summer') || queryLower.includes('hot') || queryLower.includes('beach')) &&
        (seasons.includes('summer') || mat.includes('cotton') || mat.includes('silk') || mat.includes('linen'))
      ) {
        score += 30;
      }

      // Sustainable revival query
      if (queryLower.includes('unworn') || queryLower.includes('unused') || queryLower.includes('forgotten') || queryLower.includes('revive')) {
        if (!item.timesWorn || item.timesWorn === 0) score += 40;
      }
    }

    // Occasion preference match
    if (occPref && occasions.some((o) => o.includes(occPref))) score += 25;

    // Weather preference match
    if (weatherPref && seasons.some((s) => s.includes(weatherPref))) score += 25;

    // Unworn boost (Sustainable Fashion Principle)
    if (!item.timesWorn || item.timesWorn === 0) score += 15;
    if (item.favorite || item.isFavorite) score += 10;

    return { item, score };
  });

  // Sort by relevance and take top candidates
  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.map((si) => si.item);
}

/**
 * 2. AUGMENT: Format retrieved wardrobe items into context schema
 */
export function buildRAGContextString(retrievedItems, userQuery, preferences) {
  const inventoryList = retrievedItems.map((item, idx) => {
    const col = normalizeColor(item.color);
    return `${idx + 1}. ID="${item._id}" | Name="${item.name}" | Category="${item.category}" | SubCategory="${item.subCategory || 'N/A'}" | Color="${col}" | Material="${item.material || 'Quality Textile'}" | Occasions=${JSON.stringify(item.occasion || [])} | Seasons=${JSON.stringify(item.season || [])} | TimesWorn=${item.timesWorn ?? 0}`;
  }).join('\n');

  return {
    inventoryList,
    userQuery: userQuery || 'Suggest an outfit for today',
    preferences
  };
}

/**
 * 3A. GENERATE TIER 1: Groq AI LLaMA-3.3-70B RAG Recommender
 */
async function generateWithGroq(ragContext) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your_actual_groq')) {
    throw new Error('Groq API Key not configured or placeholder');
  }

  const groq = new Groq({ apiKey });

  const systemPrompt = `You are a world-class AI Fashion Stylist inside a high-end 3D Virtual Boutique Penthouse.
A user has asked for an outfit recommendation based on their verified wardrobe inventory stored in MongoDB Atlas.

STRICT CONSTRAINTS (RAG VERIFICATION RULES):
1. You must select complete outfits composed ONLY of items from the USER INVENTORY below.
2. Use the EXACT string ID from the inventory list (e.g. "ID"). Do NOT invent, hallucinate, or alter any IDs.
3. Support both Western ensembles (Top + Bottom + Footwear or Dress + Footwear) and Traditional Indian Ensembles (Saree/Anarkali + Ethnic Shoes).
4. For each outfit, explain the styling rationale, color harmony, and weather/occasion suitability.

USER QUERY:
"${ragContext.userQuery}"

ADDITIONAL PREFERENCES:
${JSON.stringify(ragContext.preferences)}

VERIFIED USER INVENTORY (${ragContext.inventoryList.split('\n').length} items from MongoDB):
${ragContext.inventoryList}

Return ONLY a valid JSON array of 1 to 3 outfits (no markdown fences, no extra text):
[
  {
    "outfitName": "<Creative Stylish Name>",
    "clothingItemIds": ["<exact_id_1>", "<exact_id_2>", "<exact_id_3>"],
    "confidence": 0.95,
    "occasion": "<Best Occasion>",
    "style": "<Aesthetic Style>",
    "season": "<Best Season>",
    "colorHarmony": "<e.g. Rich crimson silk anchored by opulent gold zari embroidery>",
    "explanation": "<2-3 sentence personalized styling explanation>",
    "sustainabilityNote": "<Note if this revitalizes an unworn item, or null>"
  }
]`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: systemPrompt }],
    temperature: 0.25,
    max_tokens: 1200
  });

  const raw = response.choices[0]?.message?.content?.trim() || '[]';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  return Array.isArray(parsed) ? parsed : (parsed.outfits || parsed.recommendations || [parsed]);
}

/**
 * 3B. GENERATE TIER 2: Intelligent Rule-Based Local RAG Fashion Engine (100% Offline / Free)
 */
function generateWithLocalEngine(retrievedItems, userQuery, preferences) {
  const queryLower = (userQuery || '').toLowerCase();

  // Categorize retrieved items
  const tops = retrievedItems.filter((i) =>
    ['shirt', 't-shirt', 'blouse', 'top', 'sweater', 'hoodie'].includes((i.category || '').toLowerCase())
  );
  const bottoms = retrievedItems.filter((i) =>
    ['jeans', 'trousers', 'pants', 'skirt', 'bottom'].includes((i.category || '').toLowerCase())
  );
  const dressesAndEthnic = retrievedItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    const sc = (i.subCategory || '').toLowerCase();
    return c === 'dress' || sc.includes('saree') || sc.includes('anarkali') || sc.includes('kurti');
  });
  const shoes = retrievedItems.filter((i) =>
    ['shoes', 'sneakers', 'boots', 'heels', 'loafers'].includes((i.category || '').toLowerCase()) ||
    (i.subCategory || '').toLowerCase().includes('jutti')
  );
  const outerwear = retrievedItems.filter((i) =>
    ['jacket', 'coat', 'blazer', 'overcoat'].includes((i.category || '').toLowerCase())
  );

  const recommendations = [];

  // Check if query is targeting Indian Ethnic / Traditional
  const isEthnicQuery =
    queryLower.includes('wedding') ||
    queryLower.includes('saree') ||
    queryLower.includes('anarkali') ||
    queryLower.includes('festive') ||
    queryLower.includes('traditional');

  // Outfit 1: Indian Ethnic or Dress Ensemble (if available or requested)
  if (dressesAndEthnic.length > 0 && (isEthnicQuery || Math.random() > 0.4)) {
    const onePiece = dressesAndEthnic[0];
    const matchingShoe = shoes.find((s) => (s.subCategory || '').toLowerCase().includes('jutti')) || shoes[0];
    const selectedIds = [onePiece._id.toString()];
    if (matchingShoe) selectedIds.push(matchingShoe._id.toString());
    if (outerwear.length > 0 && (queryLower.includes('cold') || queryLower.includes('winter'))) {
      selectedIds.push(outerwear[0]._id.toString());
    }

    const isSaree = (onePiece.name || '').toLowerCase().includes('saree') || (onePiece.subCategory || '').toLowerCase().includes('saree');
    const colorHarmony = calculateColorHarmony(onePiece.color, matchingShoe?.color);

    recommendations.push({
      outfitName: isSaree ? 'Royal Heritage Saree Ensemble' : `${onePiece.name} Stylist Edit`,
      clothingItemIds: selectedIds,
      confidence: 0.94,
      occasion: onePiece.occasion?.[0] || 'Festive & Formal',
      style: isSaree ? 'Royal Traditional' : 'Sophisticated Chic',
      season: onePiece.season?.[0] || 'All Season',
      colorHarmony: `${normalizeColor(onePiece.color).toUpperCase()} base with luminous metallic accents (Score: ${colorHarmony}/100).`,
      explanation: `Curated exclusively from your MongoDB wardrobe. Features the ${onePiece.name} draped for fluid elegance, paired with ${matchingShoe?.name || 'matching footwear'} to complete the ensemble.`,
      sustainabilityNote: (!onePiece.timesWorn || onePiece.timesWorn === 0)
        ? `Revives your unworn ${onePiece.name} for this special occasion.`
        : null
    });
  }

  // Outfit 2: Western Coordinated Separates (Top + Bottom + Footwear + Outerwear)
  if (tops.length > 0 && bottoms.length > 0) {
    let bestTop = tops[0];
    let bestBottom = bottoms[0];
    let bestHarmony = 0;

    // Find highest color harmony combination
    for (const t of tops.slice(0, 3)) {
      for (const b of bottoms.slice(0, 3)) {
        const harmony = calculateColorHarmony(t.color, b.color);
        if (harmony > bestHarmony) {
          bestHarmony = harmony;
          bestTop = t;
          bestBottom = b;
        }
      }
    }

    const selectedIds = [bestTop._id.toString(), bestBottom._id.toString()];
    const matchingShoe = shoes.find((s) => !(s.subCategory || '').toLowerCase().includes('jutti')) || shoes[0];
    if (matchingShoe) selectedIds.push(matchingShoe._id.toString());

    if (outerwear.length > 0 && (queryLower.includes('cold') || queryLower.includes('formal') || queryLower.includes('work'))) {
      selectedIds.push(outerwear[0]._id.toString());
    }

    recommendations.push({
      outfitName: `${bestTop.name} & ${bestBottom.name} Synergy`,
      clothingItemIds: selectedIds,
      confidence: 0.91,
      occasion: preferences.occasion || bestTop.occasion?.[0] || 'Smart Casual',
      style: preferences.style || 'Contemporary Tailored',
      season: preferences.weather || bestTop.season?.[0] || 'Autumn / Spring',
      colorHarmony: `${normalizeColor(bestTop.color).toUpperCase()} paired with ${normalizeColor(bestBottom.color).toUpperCase()} (Harmony: ${bestHarmony}/100).`,
      explanation: `A balanced silhouette pairing ${bestTop.name} with ${bestBottom.name}. The neutral undertones create effortless proportions that look striking under 3D VR penthouse lighting.`,
      sustainabilityNote: (!bestTop.timesWorn || bestTop.timesWorn === 0)
        ? `Re-engages your ${bestTop.name} which has been waiting in your wardrobe.`
        : null
    });
  }

  // Fallback if neither was constructed
  if (recommendations.length === 0 && retrievedItems.length > 0) {
    recommendations.push({
      outfitName: 'Bespoke Curated Wardrobe Look',
      clothingItemIds: retrievedItems.slice(0, 3).map((i) => i._id.toString()),
      confidence: 0.85,
      occasion: 'Versatile',
      style: 'Modern Minimalist',
      season: 'All Seasons',
      colorHarmony: 'Harmonious complementary palette.',
      explanation: 'Carefully selected from your MongoDB wardrobe items to provide a clean, cohesive visual balance.',
      sustainabilityNote: null
    });
  }

  return recommendations;
}

/**
 * MASTER RAG CONTROLLER: End-to-end execution of Retrieve -> Augment -> Generate
 */
export async function executeRAGOutfitStylist({ userId, query = '', preferences = {} }) {
  // 1. RETRIEVE
  const retrievedItems = await retrieveWardrobeContext({ userId, query, preferences });

  if (!retrievedItems || retrievedItems.length === 0) {
    return {
      success: false,
      message: 'No clothing items found in your MongoDB database to build outfits.',
      recommendations: []
    };
  }

  // 2. AUGMENT
  const ragContext = buildRAGContextString(retrievedItems, query, preferences);

  // 3. GENERATE
  let rawRecommendations = [];
  let generationSource = 'Groq RAG (LLaMA-3.3-70B)';

  try {
    rawRecommendations = await generateWithGroq(ragContext);
  } catch (groqErr) {
    console.warn('[RAG Engine] Groq API fallback activated:', groqErr.message);
    rawRecommendations = generateWithLocalEngine(retrievedItems, query, preferences);
    generationSource = 'Local RAG Fashion Engine (Guaranteed)';
  }

  // 4. MAP & HYDRATE: Link exact MongoDB ClothingItem objects to recommended IDs
  const itemMap = new Map(retrievedItems.map((item) => [item._id.toString(), item]));

  const validatedOutfits = [];

  for (const rec of rawRecommendations) {
    const validIds = [];
    const populatedPieces = [];

    const ids = Array.isArray(rec.clothingItemIds) ? rec.clothingItemIds : [];

    for (const id of ids) {
      const cleanId = String(id).trim();
      if (itemMap.has(cleanId)) {
        validIds.push(cleanId);
        populatedPieces.push(itemMap.get(cleanId));
      }
    }

    if (validIds.length > 0) {
      validatedOutfits.push({
        outfitName: rec.outfitName || 'Styled Wardrobe Combination',
        clothingItemIds: validIds,
        clothingItems: populatedPieces,
        confidence: typeof rec.confidence === 'number' ? rec.confidence : 0.9,
        occasion: rec.occasion || preferences.occasion || 'Versatile',
        style: rec.style || preferences.style || 'Chic',
        season: rec.season || preferences.weather || 'All Season',
        colorHarmony: rec.colorHarmony || 'Well-balanced chromatic harmony.',
        explanation: rec.explanation || 'Crafted with precision from your authentic wardrobe collection.',
        sustainabilityNote: rec.sustainabilityNote || null,
        generationSource
      });
    }
  }

  return {
    success: true,
    userQuery: query,
    generationSource,
    retrievedCount: retrievedItems.length,
    recommendations: validatedOutfits
  };
}

