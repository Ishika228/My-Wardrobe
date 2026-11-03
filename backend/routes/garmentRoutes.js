import express from 'express';
import {
  getGarmentConfig,
  generateGarment3D,
  getGarmentTaskStatus,
  getGarmentByClothingItem,
} from '../controllers/garmentController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';
import { uploadClothingImageMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Configuration status & instructions
router.get('/config', getGarmentConfig);

// Start 2D-to-3D generation (supports multipart image file or JSON body)
router.post('/generate-3d', optionalProtect, (req, res, next) => {
  // If Content-Type is multipart/form-data, pass through upload middleware
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    uploadClothingImageMiddleware(req, res, (err) => {
      if (err) return next(err);
      generateGarment3D(req, res, next);
    });
  } else {
    generateGarment3D(req, res, next);
  }
});

// Poll task status and progress
router.get('/tasks/:taskId', optionalProtect, getGarmentTaskStatus);

// Get garment model by clothing item ID
router.get('/item/:clothingItemId', optionalProtect, getGarmentByClothingItem);

export default router;
