import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import GarmentModel from '../models/GarmentModel.js';
import ClothingItem from '../models/ClothingItem.js';
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
 * @desc    Get Tripo API status and environment configuration
 * @route   GET /api/garments/config
 * @access  Public
 */
export const getGarmentConfig = async (req, res) => {
  const config = getTripoConfig();
  res.json({
    success: true,
    data: {
      isConfigured: config.isConfigured,
      baseUrl: config.baseUrl,
      instructions: !config.isConfigured
        ? 'To enable live cloud-based 3D generation, obtain an API key from https://platform.tripo3d.ai/ and set TRIPO_API_KEY in backend/.env'
        : 'Tripo3D API is configured and ready.',
    },
  });
};

/**
 * @desc    Start 2D-to-3D garment generation task
 * @route   POST /api/garments/generate-3d
 * @access  Public / Private
 */
export const generateGarment3D = async (req, res, next) => {
  try {
    const { clothingItemId, category, originalImageUrl, modelType } = req.body || {};
    const { isConfigured } = getTripoConfig();

    let imageFilePath = null;
    let imageBuffer = null;
    let filename = 'clothing.png';
    let mimeType = 'image/png';

    // 1. Resolve uploaded file or existing image path
    if (req.file) {
      imageFilePath = req.file.path;
      filename = req.file.filename || req.file.originalname;
      mimeType = req.file.mimetype || 'image/png';
    } else if (originalImageUrl) {
      // Check if originalImageUrl is a local /uploads path
      if (originalImageUrl.startsWith('/uploads/')) {
        const localRel = originalImageUrl.replace(/^\/uploads\//, '');
        const absPath = path.resolve('uploads', localRel);
        if (fs.existsSync(absPath)) {
          imageFilePath = absPath;
          filename = path.basename(absPath);
        }
      }
    }

    // If clothingItemId provided, verify and link to MongoDB ClothingItem
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

    let taskId;
    let isLiveTripo = false;

    // 2. Execute via Live Tripo API if configured, otherwise fallback to simulated preview task
    if (isConfigured && imageFilePath && fs.existsSync(imageFilePath)) {
      try {
        console.log(`[Garment Controller] Starting live Tripo API v3 generation for ${filename}...`);
        const fileToken = await uploadImageToTripo(imageFilePath, filename, mimeType);
        taskId = await createImageTo3DTask(fileToken, {
          model: modelType || 'v3.1-20260211',
          pbr: true,
          texture: true,
        });
        isLiveTripo = true;
      } catch (tripoErr) {
        console.warn(`[Garment Controller] Live Tripo API error: ${tripoErr.message}. Falling back to preview mode.`);
        taskId = createSimulatedTask(category || clothingItem?.category || 'dress', originalImageUrl);
      }
    } else {
      console.log(
        `[Garment Controller] ${
          !isConfigured ? 'TRIPO_API_KEY is not configured in backend/.env' : 'No local file found'
        }. Starting simulation mode.`
      );
      taskId = createSimulatedTask(category || clothingItem?.category || 'dress', originalImageUrl);
    }

    // 3. Create or update GarmentModel record in MongoDB
    const garmentModel = await GarmentModel.create({
      taskId,
      clothingItemId: clothingItem?._id || null,
      userId: req.user?._id || clothingItem?.userId || null,
      category: category || clothingItem?.category || 'dress',
      originalImageUrl: originalImageUrl || clothingItem?.imageUrl || (req.file ? `/uploads/clothing/${req.file.filename}` : ''),
      status: 'queued',
      progress: 0,
      service: isLiveTripo ? 'tripo3d' : 'simulated_preview',
    });

    // 4. Update ClothingItem model3d fields if item exists
    if (clothingItem) {
      clothingItem.model3d = {
        taskId,
        status: 'queued',
        progress: 0,
        source: isLiveTripo ? 'tripo3d' : 'simulated_preview',
      };
      await clothingItem.save();
    }

    res.status(202).json({
      success: true,
      message: isLiveTripo
        ? 'Cloud-based 3D garment generation initiated via Tripo API v3.'
        : '3D garment generation task initialized (Simulation / High-fidelity preview mode).',
      data: {
        taskId,
        status: 'queued',
        progress: 0,
        isConfigured,
        service: isLiveTripo ? 'tripo3d' : 'simulated_preview',
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

    let garmentModel = await GarmentModel.findOne({ taskId });

    // Check if task is simulated
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

      // Update ClothingItem if linked
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

    // Real Tripo task status
    const tripoStatus = await getTaskStatusFromTripo(taskId);
    let finalModelUrl = garmentModel?.modelUrl || tripoStatus.modelUrl;

    if (garmentModel) {
      garmentModel.status = tripoStatus.status;
      garmentModel.progress = tripoStatus.progress;
      garmentModel.tripoModelUrl = tripoStatus.modelUrl;
      garmentModel.renderedImageUrl = tripoStatus.renderedImageUrl;

      // When success: download and store permanent local copy of GLB immediately
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
          console.warn(`[Garment Controller] GLB download error: ${downloadErr.message}. Using remote CDN URL.`);
          garmentModel.modelUrl = tripoStatus.modelUrl;
        }
      }

      await garmentModel.save();

      // Update linked ClothingItem
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
