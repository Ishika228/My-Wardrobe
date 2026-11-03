import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Executes high-precision garment extraction, removing person and background.
 * Calls Python FastAPI microservice on port 8000, with an automatic CLI subprocess fallback.
 *
 * @param {string|Buffer} imageInput - File path or buffer
 * @param {string} filename - Filename for output identification
 * @param {Array<number>} garmentBbox - [ymin, xmin, ymax, xmax] normalized 0-1000
 * @param {Array<Array<number>>} skinRegions - Array of bounding boxes to subtract
 * @returns {Promise<object>} Extraction results with transparent PNG and mask URLs
 */
export const segmentGarmentImage = async (
  imageInput,
  filename = 'clothing.png',
  garmentBbox = null,
  skinRegions = null
) => {
  let imagePath = null;
  let tempCreated = false;

  if (typeof imageInput === 'string' && fs.existsSync(imageInput)) {
    imagePath = imageInput;
  } else if (Buffer.isBuffer(imageInput)) {
    const tempDir = path.resolve('uploads', 'clothing');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    imagePath = path.join(tempDir, `temp_seg_${Date.now()}_${filename}`);
    fs.writeFileSync(imagePath, imageInput);
    tempCreated = true;
  } else {
    throw new Error('segmentGarmentImage: Invalid image input.');
  }

  const outputBaseName = `extracted_${Date.now()}_${path.basename(filename, path.extname(filename))}.png`;

  // 1. Try FastAPI AI Microservice on port 8000
  try {
    const imgBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([imgBuffer], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', blob, path.basename(imagePath));
    if (garmentBbox) formData.append('garment_bbox', JSON.stringify(garmentBbox));
    if (skinRegions) formData.append('skin_regions', JSON.stringify(skinRegions));
    formData.append('output_filename', outputBaseName);

    console.log(`[Segmentation Service] Requesting garment segmentation from ${AI_SERVICE_URL}...`);
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/segment-garment`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(12000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.extractedImageUrl) {
        console.log(`[Segmentation Service] Garment segmented successfully: ${data.extractedImageUrl}`);
        if (tempCreated && fs.existsSync(imagePath)) {
          try { fs.unlinkSync(imagePath); } catch {}
        }
        return data;
      }
    }
  } catch (apiErr) {
    console.warn(`[Segmentation Service] Microservice call failed (${apiErr.message}), running direct OpenCV engine...`);
  }

  // 2. Direct Python OpenCV Engine Fallback
  try {
    const backendExtDir = path.resolve('uploads', 'extracted');
    const backendMaskDir = path.resolve('uploads', 'masks');
    const frontendExtDir = path.resolve('..', 'Frontend', 'public', 'uploads', 'extracted');
    const frontendMaskDir = path.resolve('..', 'Frontend', 'public', 'uploads', 'masks');

    for (const d of [backendExtDir, backendMaskDir, frontendExtDir, frontendMaskDir]) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    }

    const outPngPath = path.join(backendExtDir, outputBaseName);
    const outMaskPath = path.join(backendMaskDir, `mask_${outputBaseName}`);

    const pyScript = `
import sys, json
from ai_service.vision.segmenter import extract_garment

bbox = json.loads('${JSON.stringify(garmentBbox || [])}') or None
skin = json.loads('${JSON.stringify(skinRegions || [])}') or None

res = extract_garment(
    r"${imagePath.replace(/\\/g, '/')}",
    garment_bbox=bbox,
    skin_regions=skin,
    output_path=r"${outPngPath.replace(/\\/g, '/')}",
    mask_path=r"${outMaskPath.replace(/\\/g, '/')}"
)
print(json.dumps(res))
`;

    const pyProc = spawnSync('python', ['-c', pyScript], {
      cwd: path.resolve('..'),
      encoding: 'utf-8',
      timeout: 15000,
    });

    if (pyProc.error || pyProc.status !== 0) {
      throw new Error(`Direct OpenCV fallback failed: ${pyProc.stderr || pyProc.error?.message}`);
    }

    // Copy to Frontend public directory
    try {
      fs.copyFileSync(outPngPath, path.join(frontendExtDir, outputBaseName));
      fs.copyFileSync(outMaskPath, path.join(frontendMaskDir, `mask_${outputBaseName}`));
    } catch {}

    const parsedRes = JSON.parse(pyProc.stdout.trim());
    return {
      success: true,
      filename: outputBaseName,
      extractedImageUrl: `/uploads/extracted/${outputBaseName}`,
      maskUrl: `/uploads/masks/mask_${outputBaseName}`,
      width: parsedRes.width,
      height: parsedRes.height,
      garment_coverage: parsedRes.garment_coverage,
      crop_rect: parsedRes.crop_rect,
    };
  } finally {
    if (tempCreated && fs.existsSync(imagePath)) {
      try { fs.unlinkSync(imagePath); } catch {}
    }
  }
};

