import express from 'express';
import {
  getOutfitRecommendations,
  getRAGOutfitRecommendations
} from '../controllers/recommendationController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

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
 * @route   POST /api/recommendations/outfits
 * @desc    Get AI outfit recommendations based on user wardrobe and preferences
 * @access  Public / Optional Auth
 */
router.post('/outfits', getOutfitRecommendations);

export default router;
