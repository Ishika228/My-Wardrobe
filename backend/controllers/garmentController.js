import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import GarmentModel from '../models/GarmentModel.js';
import ClothingItem from '../models/ClothingItem.js';
import { getGeminiConfig, analyzeAndGenerate3DWithGemini } from '../services/geminiService.js';
import {
  getTripoConfig,
  uploadImageToTripo,
  createImageTo3DTask,
  getTaskStatusFromTripo,
  downloadAndPersistGlb,
  createSimulatedTask,
  getSimulatedTaskStatus,
} from '../services/tripoService.js';

/**
 * In-memory map for quick Gemini task status retrieval
 */
const geminiTaskCache = new Map();

/**
 * @desc    Get 3D generation API configuration status
 * @route   GET /api/garments/config
 * @access  Public
 */
export const getGarmentConfig = async (req, res) => {
  const geminiConfig = getGeminiConfig();
  const tripoConfig = getTripoConfig();

  res.json({
    success: true,
    data: {
      provider: geminiConfig.isConfigured ? 'gemini' : tripoConfig.isConfigured ? 'tripo' : 'preview',
      isConfigured: geminiConfig.isConfigured || tripoConfig.isConfigured,
      geminiConfigured: geminiConfig.isConfigured,
      tripoConfigured: tripoConfig.isConfigured,
      instructions: geminiConfig.isConfigured
        ? 'Google Gemini Multimodal AI is active and configured for 2D-to-3D garment generation.'
        : 'Please set GEMINI_API_KEY in backend/.env to activate Gemini Multimodal AI.',
    },
  });
};

/**
 * @desc    Start 2D-to-3D garment generation task (powered by Gemini Multimodal AI)
 * @route   POST /api/garments/generate-3d
 * @access  Public / Private
 */
export const generateGarment3D = async (req, res, next) => {
  try {
    const { clothingItemId, category, originalImageUrl } = req.body || {};
    const geminiConfig = getGeminiConfig();

    let imageFilePath = null;
    let filename = 'clothing.png';
    let mimeType = 'image/png';

    // 1. Resolve uploaded file or existing image path
    if (req.file) {
      imageFilePath = req.file.path;
      filename = req.file.filename || req.file.originalname;
      mimeType = req.file.mimetype || 'image/png';
    } else if (originalImageUrl) {
      if (originalImageUrl.startsWith('/uploads/')) {
        const localRel = originalImageUrl.replace(/^\/uploads\//, '');
        const absPath = path.resolve('uploads', localRel);
        if (fs.existsSync(absPath)) {
          imageFilePath = absPath;
          filename = path.basename(absPath);
        }
      }
    }

    // Link ClothingItem if provided
    let clothingItem = null;
    if (clothingItemId && mongoose.Types.ObjectId.isValid(clothingItemId)) {
      clothingItem = await ClothingItem.findById(clothingItemId);
      if (clothingItem && !imageFilePath && clothingItem.imageUrl) {
        const localRel = clothingItem.imageUrl.replace(/^\/uploads\//, '');
        const absPath = path.resolve('uploads', localRel);
        if (fs.existsSync(absPath)) {
          imageFilePath = absPath;
          filename = path.basename(absPath);
        }
      }
    }

    // 2. Execute via Google Gemini Multimodal AI if configured
    if (geminiConfig.isConfigured && imageFilePath && fs.existsSync(imageFilePath)) {
      try {
        console.log(`[Garment Controller] Executing Google Gemini 2D-to-3D synthesis for ${filename}...`);
        const geminiResult = await analyzeAndGenerate3DWithGemini(imageFilePath, filename, mimeType);
        const taskId = `gemini_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Save in cache
        geminiTaskCache.set(taskId, {
          taskId,
          status: 'success',
          progress: 100,
          modelUrl: geminiResult.targetModelUrl,
          renderedImageUrl: originalImageUrl || `/uploads/clothing/${filename}`,
          silhouette: geminiResult.silhouette,
          geminiAnalysis: geminiResult,
        });

        // Save in MongoDB GarmentModel
        const garmentModel = await GarmentModel.create({
          taskId,
          clothingItemId: clothingItem?._id || null,
          userId: req.user?._id || clothingItem?.userId || null,
          category: geminiResult.category || category || 'dress',
          originalImageUrl: originalImageUrl || (req.file ? `/uploads/clothing/${req.file.filename}` : ''),
          status: 'success',
          progress: 100,
          modelUrl: geminiResult.targetModelUrl,
          service: 'gemini_multimodal_ai',
          metadata: geminiResult,
        });

        // Update linked ClothingItem
        if (clothingItem) {
          clothingItem.model3d = {
            taskId,
            modelUrl: geminiResult.targetModelUrl,
            status: 'success',
            progress: 100,
            source: 'gemini_multimodal_ai',
            generatedAt: new Date(),
          };
          if (geminiResult.primaryColor && !clothingItem.color) {
            clothingItem.color = geminiResult.primaryColor;
          }
          await clothingItem.save();
        }

        return res.status(200).json({
          success: true,
          message: '3D garment model synthesized successfully with Google Gemini Multimodal AI.',
          data: {
            taskId,
            status: 'success',
            progress: 100,
            provider: 'gemini',
            modelUrl: geminiResult.targetModelUrl,
            silhouette: geminiResult.silhouette,
            geminiAnalysis: geminiResult,
            garmentModelId: garmentModel._id,
          },
        });
      } catch (geminiErr) {
        console.warn(`[Garment Controller] Gemini generation notice: ${geminiErr.message}. Falling back to preview mode.`);
      }
    }

    // 3. Fallback to Tripo / Simulated preview if Gemini is not ready or failed
    const taskId = createSimulatedTask(category || clothingItem?.category || 'dress', originalImageUrl);
    const garmentModel = await GarmentModel.create({
      taskId,
      clothingItemId: clothingItem?._id || null,
      userId: req.user?._id || clothingItem?.userId || null,
      category: category || clothingItem?.category || 'dress',
      originalImageUrl: originalImageUrl || (req.file ? `/uploads/clothing/${req.file.filename}` : ''),
      status: 'queued',
      progress: 0,
      service: 'simulated_preview',
    });

    if (clothingItem) {
      clothingItem.model3d = {
        taskId,
        status: 'queued',
        progress: 0,
        source: 'simulated_preview',
      };
      await clothingItem.save();
    }

    res.status(202).json({
      success: true,
      message: '3D garment generation task initialized.',
      data: {
        taskId,
        status: 'queued',
        progress: 0,
        provider: 'preview',
        garmentModelId: garmentModel._id,
      },
    });
  } catch (err) {
    console.error('[Garment Controller Error] generateGarment3D failed:', err);
    res.status(500).json({
      success: false,
      message: `Failed to initiate 3D generation: ${err.message}`,
    });
  }
};

/**
 * @desc    Poll status and progress of 3D generation task
 * @route   GET /api/garments/tasks/:taskId
 * @access  Public / Private
 */
export const getGarmentTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ success: false, message: 'Task ID is required' });
    }

    // 1. Check Gemini cache
    if (geminiTaskCache.has(taskId)) {
      return res.json({
        success: true,
        data: geminiTaskCache.get(taskId),
      });
    }

    let garmentModel = await GarmentModel.findOne({ taskId });

    // 2. Check if simulated task
    if (taskId.startsWith('sim_tripo_')) {
      const simStatus = getSimulatedTaskStatus(taskId);
      if (!simStatus) {
        return res.status(404).json({ success: false, message: 'Simulation task not found' });
      }

      if (garmentModel) {
        garmentModel.status = simStatus.status;
        garmentModel.progress = simStatus.progress;
        if (simStatus.status === 'success') {
          garmentModel.modelUrl = simStatus.modelUrl;
          garmentModel.renderedImageUrl = simStatus.renderedImageUrl;
        }
        await garmentModel.save();
      }

      if (garmentModel?.clothingItemId) {
        await ClothingItem.findByIdAndUpdate(garmentModel.clothingItemId, {
          'model3d.status': simStatus.status,
          'model3d.progress': simStatus.progress,
          'model3d.modelUrl': simStatus.modelUrl,
          'model3d.generatedAt': simStatus.status === 'success' ? new Date() : null,
        });
      }

      return res.json({
        success: true,
        data: {
          taskId,
          status: simStatus.status,
          progress: simStatus.progress,
          modelUrl: simStatus.modelUrl,
          renderedImageUrl: simStatus.renderedImageUrl,
          silhouette: simStatus.output?.silhouette || 'custom',
          isSimulated: true,
        },
      });
    }

    // 3. Fallback Tripo task
    const tripoStatus = await getTaskStatusFromTripo(taskId);
    let finalModelUrl = garmentModel?.modelUrl || tripoStatus.modelUrl;

    if (garmentModel) {
      garmentModel.status = tripoStatus.status;
      garmentModel.progress = tripoStatus.progress;
      garmentModel.tripoModelUrl = tripoStatus.modelUrl;
      garmentModel.renderedImageUrl = tripoStatus.renderedImageUrl;

      if (tripoStatus.status === 'success' && tripoStatus.modelUrl && !garmentModel.localGlbPath) {
        try {
          const downloadResult = await downloadAndPersistGlb(
            tripoStatus.modelUrl,
            `garment_${taskId}.glb`
          );
          garmentModel.localGlbPath = downloadResult.localFilePath;
          garmentModel.modelUrl = downloadResult.localUrl;
          finalModelUrl = downloadResult.localUrl;
        } catch (downloadErr) {
          garmentModel.modelUrl = tripoStatus.modelUrl;
        }
      }

      await garmentModel.save();

      if (garmentModel.clothingItemId) {
        await ClothingItem.findByIdAndUpdate(garmentModel.clothingItemId, {
          'model3d.status': tripoStatus.status,
          'model3d.progress': tripoStatus.progress,
          'model3d.modelUrl': finalModelUrl,
          'model3d.generatedAt': tripoStatus.status === 'success' ? new Date() : null,
        });
      }
    }

    res.json({
      success: true,
      data: {
        taskId,
        status: tripoStatus.status,
        progress: tripoStatus.progress,
        modelUrl: finalModelUrl,
        renderedImageUrl: tripoStatus.renderedImageUrl,
        isSimulated: false,
      },
    });
  } catch (err) {
    console.error(`[Garment Controller Error] Polling task ${req.params.taskId} failed:`, err.message);
    res.status(500).json({
      success: false,
      message: `Failed to poll garment task: ${err.message}`,
    });
  }
};

/**
 * @desc    Get 3D garment record by ClothingItem ID
 * @route   GET /api/garments/item/:clothingItemId
 * @access  Public / Private
 */
export const getGarmentByClothingItem = async (req, res) => {
  try {
    const { clothingItemId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clothingItemId)) {
      return res.status(400).json({ success: false, message: 'Invalid clothing item ID format' });
    }

    const garment = await GarmentModel.findOne({ clothingItemId }).sort({ createdAt: -1 });

    if (!garment) {
      return res.status(404).json({ success: false, message: 'No 3D garment model found for this item' });
    }

    res.json({
      success: true,
      data: garment,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to get garment model: ${err.message}`,
    });
  }
};
