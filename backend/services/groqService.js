import fs from 'fs';
import path from 'path';
import Groq from 'groq-sdk';

// ─── Groq Client (lazy init so missing key only errors on first use) ──────────
let _groqClient = null;
function getGroqClient() {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables. Add it to your .env file.');
    }
    _groqClient = new Groq({ apiKey });
  }
  return _groqClient;
}

// ─── Models ───────────────────────────────────────────────────────────────────
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Image analysis
const TEXT_MODEL   = 'llama-3.3-70b-versatile';                   // Outfit recommendations

// ─── 1. CLOTHING IMAGE ANALYSIS ───────────────────────────────────────────────

/**
 * Converts a local image file to a base64 data URL for Groq Vision.
 */
function imageToBase64DataUrl(absolutePath) {
  const ext   = path.extname(absolutePath).toLowerCase().replace('.', '');
  const mime  = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const buf   = fs.readFileSync(absolutePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Calls Groq Vision model to analyse a clothing image.
 * Returns a structured JSON with category, color, pattern, material,
 * style, season, occasions, and confidence.
 *
 * @param {string} absoluteImagePath  - Full local filesystem path to the image
 * @param {string} [itemId]           - Optional item ID to tag in result
 * @returns {Promise<object>}         - Normalised clothing analysis
 */
export async function groqAnalyzeClothingImage(absoluteImagePath, itemId = null) {
  const groq       = getGroqClient();
  const dataUrl    = imageToBase64DataUrl(absoluteImagePath);
  const filename   = path.basename(absoluteImagePath);

  const prompt = `You are a professional fashion analyst AI. Carefully examine this clothing image and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Analyse the clothing item visible in the image and return:
{
  "category": "<one of: Shirt | T-Shirt | Jeans | Trousers | Shorts | Skirt | Dress | Jacket | Hoodie | Sweater | Shoes | Sneakers | Boots | Accessories | Other>",
  "subCategory": "<specific sub-type, e.g. 'Polo Shirt', 'Flared Skirt', 'Ankle Boots'>",
  "color": "<primary dominant color name, e.g. 'Navy Blue', 'Olive Green', 'Burgundy'>",
  "secondaryColors": ["<optional secondary color if visible>"],
  "pattern": "<one of: Plain | Striped | Checked | Floral | Printed | Graphic | Abstract | Unknown>",
  "material": "<fabric type if visible, e.g. 'Cotton', 'Denim', 'Wool', 'Polyester', 'Silk', 'Linen'>",
  "style": ["<style tags from: Casual | Formal | Streetwear | Bohemian | Athletic | Business | Party | Traditional | Smart Casual>"],
  "season": ["<suitable seasons from: Summer | Winter | Monsoon | Spring | Autumn | All Season>"],
  "occasion": ["<suitable occasions from: Casual outing | Office | College | Party | Wedding | Formal event | Travel | Beach | Gym>"],
  "fit": "<one of: Slim Fit | Regular Fit | Loose Fit | Oversized | Unknown>",
  "neckline": "<if applicable: Round Neck | V-Neck | Collar | Turtleneck | Off-Shoulder | Unknown | N/A>",
  "sleeveLength": "<if applicable: Sleeveless | Short Sleeve | 3/4 Sleeve | Full Sleeve | N/A>",
  "confidence": <float between 0.0 and 1.0 reflecting your certainty>,
  "stylingTip": "<one short practical styling suggestion for this item, max 20 words>"
}

If the image does not contain a clothing item, set category to "Unknown" and confidence to 0.1.
Return ONLY the JSON object. No markdown code blocks.`;

  try {
    const response = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text',      text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 600,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';

    // Strip markdown code fences if model accidentally adds them
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed  = JSON.parse(cleaned);

    return {
      success: true,
      isMock:  false,
      isGroq:  true,
      data: {
        category:       parsed.category        || 'Other',
        subCategory:    parsed.subCategory     || null,
        color:          parsed.color           || null,
        secondaryColors: Array.isArray(parsed.secondaryColors) ? parsed.secondaryColors : [],
        pattern:        parsed.pattern         || 'Unknown',
        material:       parsed.material        || null,
        style:          Array.isArray(parsed.style)    ? parsed.style    : [],
        season:         Array.isArray(parsed.season)   ? parsed.season   : [],
        occasion:       Array.isArray(parsed.occasion) ? parsed.occasion : [],
        fit:            parsed.fit             || 'Unknown',
        neckline:       parsed.neckline        || 'Unknown',
        sleeveLength:   parsed.sleeveLength    || 'Unknown',
        confidence:     typeof parsed.confidence === 'number'
                          ? Math.min(1, Math.max(0, parsed.confidence))
                          : 0.85,
        stylingTip:     parsed.stylingTip      || null,
        analyzedBy:     'Groq Vision (LLaMA 4 Scout)',
      }
    };
  } catch (err) {
    // JSON parse error or API error
    const error = new Error(`Groq image analysis failed: ${err.message}`);
    error.isGroqError = true;
    throw error;
  }
}


// ─── 2. OUTFIT RECOMMENDATIONS ────────────────────────────────────────────────

/**
 * Calls Groq text model to generate smart outfit recommendations
 * from the user's wardrobe items and preferences.
 *
 * @param {object} params
 * @param {Array<object>} params.wardrobeItems  - Array of formatted clothing items
 * @param {object}        params.preferences    - { occasion, style, weather, preferredColors, otherPreferences }
 * @returns {Promise<object>}                   - Structured recommendation response
 */
export async function groqRecommendOutfits({ wardrobeItems = [], preferences = {} }) {
  const groq = getGroqClient();

  if (!wardrobeItems || wardrobeItems.length === 0) {
    throw new Error('No wardrobe items provided to Groq recommender.');
  }

  // Build a clean wardrobe summary for the prompt
  const wardrobeSummary = wardrobeItems.map((item, i) =>
    `${i + 1}. ID="${item.id}" | Name="${item.name}" | Category="${item.category}" | Color="${item.color || 'Unknown'}" | Pattern="${item.pattern || 'Plain'}" | Season=${JSON.stringify(item.season || [])} | Occasion=${JSON.stringify(item.occasion || [])} | TimesWorn=${item.timesWorn ?? '?'} | LastWorn="${item.lastWorn || 'Unknown'}"`
  ).join('\n');

  const prefSummary = [
    preferences.occasion    ? `Occasion: ${preferences.occasion}`         : null,
    preferences.style       ? `Style: ${preferences.style}`               : null,
    preferences.weather     ? `Season/Weather: ${preferences.weather}`    : null,
    preferences.preferredColors?.length
      ? `Preferred Colors: ${preferences.preferredColors.join(', ')}` : null,
    preferences.otherPreferences ? `Other: ${preferences.otherPreferences}` : null,
  ].filter(Boolean).join(' | ');

  const prompt = `You are an expert fashion stylist AI. A user wants outfit recommendations from their wardrobe below.

USER PREFERENCES: ${prefSummary || 'No specific preferences — suggest the best general outfits'}

USER WARDROBE (${wardrobeItems.length} items):
${wardrobeSummary}

Your task:
1. Select 3-5 complete outfit combinations using ONLY items from the wardrobe above (use the exact item IDs).
2. Each outfit must include at minimum: a top OR dress + footwear (if available).
3. Consider color harmony, occasion suitability, season, and fashion rules.
4. Prefer items that are less worn (low timesWorn or old lastWorn) for a sustainable recommendation.

Return ONLY a valid JSON array (no markdown, no code fences, no explanation):
[
  {
    "outfitName": "<creative outfit name>",
    "clothingItemIds": ["<id1>", "<id2>", "<id3>"],
    "confidence": <float 0.0-1.0>,
    "occasion": "<occasion this outfit suits best>",
    "style": "<style of this outfit>",
    "season": "<season this outfit suits best>",
    "colorHarmony": "<brief color harmony note, e.g. 'Navy anchors the white tee perfectly'>",
    "explanation": "<2-3 sentence natural explanation of why this outfit works and how to style it>",
    "sustainabilityNote": "<mention if any item is rarely worn and deserves to be used>"
  }
]

Return ONLY the JSON array. No markdown. No extra text.`;

  try {
    const response = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const raw     = response.choices[0]?.message?.content?.trim() || '[]';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    // Sometimes model returns an object with a key, handle both cases
    let parsed;
    const temp = JSON.parse(cleaned);
    parsed = Array.isArray(temp) ? temp : (temp.recommendations || temp.outfits || []);

    const recommendations = parsed.map((rec, i) => ({
      outfitName:       rec.outfitName    || `Smart Outfit ${i + 1}`,
      clothingItemIds:  Array.isArray(rec.clothingItemIds) ? rec.clothingItemIds.map(String) : [],
      confidence:       typeof rec.confidence === 'number'
                          ? Math.min(1, Math.max(0, rec.confidence)) : 0.85,
      occasion:         rec.occasion       || preferences.occasion || 'Casual',
      style:            rec.style          || preferences.style    || 'Casual',
      season:           rec.season         || preferences.weather  || 'Any',
      colorHarmony:     rec.colorHarmony   || null,
      explanation:      rec.explanation    || 'Smart combination recommended by Groq AI.',
      sustainabilityNote: rec.sustainabilityNote || null,
    }));

    return {
      success:         true,
      isMock:          false,
      isGroq:          true,
      recommendations,
      modelUsed:       TEXT_MODEL,
    };
  } catch (err) {
    const error = new Error(`Groq outfit recommendation failed: ${err.message}`);
    error.isGroqError = true;
    throw error;
  }
}


// ─── 3. HEALTH CHECK ──────────────────────────────────────────────────────────

/**
 * Checks whether Groq API is reachable with the configured key.
 */
export async function groqHealthCheck() {
  try {
    const groq = getGroqClient();
    await groq.chat.completions.create({
      model:       TEXT_MODEL,
      messages:    [{ role: 'user', content: 'Say OK' }],
      max_tokens:  5,
      temperature: 0,
    });
    return { status: 'ok', model: TEXT_MODEL, visionModel: VISION_MODEL };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

export default {
  groqAnalyzeClothingImage,
  groqRecommendOutfits,
  groqHealthCheck,
};
