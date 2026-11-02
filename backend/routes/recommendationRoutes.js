import express from 'express';
import { getOutfitRecommendations } from '../controllers/recommendationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all recommendation endpoints using existing JWT auth middleware
router.use(protect);

/**
 * @route   POST /api/recommendations/outfits
 * @desc    Get AI outfit recommendations based on user wardrobe and preferences
 * @access  Private (Authenticated User)
 */
router.post('/outfits', getOutfitRecommendations);

export default router;
