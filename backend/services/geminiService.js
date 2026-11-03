import fs from 'fs';
import path from 'path';

/**
 * Returns configuration status of Google Gemini API
 */
export const getGeminiConfig = () => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const isConfigured = !!apiKey && apiKey.length > 10;

  return {
    isConfigured,
    apiKey,
    model: 'gemini-flash-lite-latest',
  };
};

/**
 * Extracts and cleans JSON from a Gemini Markdown response
 */
const extractJsonFromText = (text) => {
  if (!text) return null;
  let clean = text.trim();
  if (clean.includes('```json')) {
    clean = clean.split('```json')[1].split('```')[0].trim();
  } else if (clean.includes('```')) {
    clean = clean.split('```')[1].split('```')[0].trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    throw err;
  }
};

/**
 * Analyzes a 2D clothing image and synthesizes 3D garment parameters via Google Gemini API
 * @param {Buffer|string} imageInput - Buffer or file path to clothing image
 * @param {string} filename - original filename
 * @param {string} mimeType - image MIME type
 * @returns {Promise<object>} 3D garment specifications, bounding boxes, and model mapping
 */
export const analyzeAndGenerate3DWithGemini = async (imageInput, filename = 'clothing.png', mimeType = 'image/png') => {
  const { apiKey, isConfigured, model } = getGeminiConfig();

  if (!isConfigured) {
    throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
  }

  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string' && fs.existsSync(imageInput)) {
    buffer = fs.readFileSync(imageInput);
    if (imageInput.endsWith('.jpg') || imageInput.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (imageInput.endsWith('.webp')) mimeType = 'image/webp';
    else mimeType = 'image/png';
  } else {
    throw new Error('Invalid image input: must be a Buffer or accessible file path.');
  }

  const base64Data = buffer.toString('base64');
  console.log(`[Gemini Service] Sending image (${buffer.length} bytes, ${mimeType}) to Gemini Multimodal AI...`);

  const prompt = `You are a Lead 3D Virtual Fashion Engineer.
Analyze this fashion photograph with extreme precision. Identify whether a person is wearing the garment, locate the garment boundaries, and synthesize its complete 3D garment model reconstruction parameters for our 3D avatar virtual try-on engine.

Return ONLY a valid JSON object (no explanations, no preamble) with this exact schema:
{
  "name": "concise descriptive title of garment",
  "category": "dresses" | "tops" | "trousers" | "outerwear" | "shoes" | "accessories",
  "garmentType": "dress" | "top" | "bottom" | "shoes",
  "silhouette": "floral-puff" | "slip-dress" | "saree" | "wide-jeans" | "casual-top" | "custom",
  "hasPerson": boolean,
  "garmentBoundingBox": [ymin, xmin, ymax, xmax],
  "skinRegions": [[ymin, xmin, ymax, xmax]],
  "neckline": "square" | "sweetheart" | "v-neck" | "crew" | "round" | "off-shoulder",
  "sleeves": "puff" | "sleeveless" | "short" | "long" | "ruffled",
  "waist": "ribbon-bow" | "sash" | "fitted" | "empire" | "elastic",
  "skirt": "tiered" | "flounced" | "flared" | "pleated" | "straight",
  "pattern": "floral" | "solid" | "striped" | "printed",
  "fabric": "cotton" | "silk" | "satin" | "denim" | "chiffon",
  "primaryColor": "#hexColor",
  "secondaryColor": "#hexColor",
  "pbr": {
    "roughness": 0.35,
    "metalness": 0.05,
    "clearcoat": 0.25,
    "clearcoatRoughness": 0.08
  }
}
Note: bounding box coordinates must be normalized integers from 0 to 1000.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 900,
    },
  };

  const candidateModels = [model, 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError = null;
  let rawText = null;

  for (const candidate of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json();
      rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        console.log(`[Gemini Service] Success with model: ${candidate}`);
        break;
      }
    } catch (err) {
      console.warn(`[Gemini Service] Model ${candidate} notice: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }

  if (!rawText) {
    throw new Error(`Gemini Multimodal AI generation failed: ${lastError?.message || 'No response generated'}`);
  }

  const parsed = extractJsonFromText(rawText);
  console.log('[Gemini Service] Extracted 3D Garment Specs:', JSON.stringify(parsed, null, 2));

  // Determine the optimal matching rigged 3D GLB model
  const sil = (parsed.silhouette || '').toLowerCase();
  const cat = (parsed.category || '').toLowerCase();
  const sleeves = (parsed.sleeves || '').toLowerCase();
  const skirt = (parsed.skirt || '').toLowerCase();
  const name = (parsed.name || '').toLowerCase();

  let targetModelUrl = '/models/garments/dress_floral_puff.glb';
  let finalSilhouette = 'floral-puff';

  if (cat === 'trousers' || cat === 'bottom' || sil.includes('jean') || name.includes('jean')) {
    targetModelUrl = '/models/garments/trouser_jeans.glb';
    finalSilhouette = 'wide-jeans';
  } else if (cat === 'tops' || cat === 'top' || sil.includes('top') || sil.includes('shirt')) {
    targetModelUrl = '/models/garments/top_casual.glb';
    finalSilhouette = 'casual-top';
  } else if (sil.includes('saree') || name.includes('saree') || cat === 'indian_ethnic') {
    targetModelUrl = '/models/garments/dress_saree.glb';
    finalSilhouette = 'saree';
  } else if (sil.includes('slip') || name.includes('slip') || name.includes('gown')) {
    targetModelUrl = '/models/garments/dress_slip.glb';
    finalSilhouette = 'slip-dress';
  } else if (sleeves.includes('puff') || skirt.includes('tier') || parsed.pattern === 'floral') {
    targetModelUrl = '/models/garments/dress_floral_puff.glb';
    finalSilhouette = 'floral-puff';
  }

  return {
    ...parsed,
    silhouette: finalSilhouette,
    targetModelUrl,
    modelUrl: targetModelUrl,
    source: 'gemini_multimodal_ai',
  };
};
