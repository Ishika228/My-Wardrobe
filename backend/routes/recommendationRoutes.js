import express from 'express';
import {
  getOutfitRecommendations,
  getRAGOutfitRecommendations,
  searchClothingByImage
} from '../controllers/recommendationController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';
import { uploadClothingImageMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Support both guest users (using seeded MongoDB clothes) and authenticated users (using personal wardrobe)
router.use(optionalProtect);

/**
 * @route   POST /api/recommendations/rag-outfits
 * @desc    RAG Outfit Recommendations (Retrieve from MongoDB -> Augment Context -> Groq/Local Generation)
 * @access  Public / Optional Auth
 */
router.post('/rag-outfits', getRAGOutfitRecommendations);

/**
 * @route   POST /api/recommendations/search-by-image
 * @desc    Search clothing by uploading or scanning an image
 * @access  Public / Optional Auth
 */
router.post('/search-by-image', uploadClothingImageMiddleware, searchClothingByImage);

/**
 * @route   POST /api/recommendations/outfits
 * @desc    Get AI outfit recommendations based on user wardrobe and preferences
 * @access  Public / Optional Auth
 */
router.post('/outfits', getOutfitRecommendations);

export default router;
