import express from 'express';
import {
  addClothingItem,
  getClothingItems,
  getClothingItemById,
  updateClothingItem,
  deleteClothingItem,
  toggleFavorite,
  uploadClothingImage,
  deleteClothingImage,
  analyzeClothingItem,
  getClothingAnalysis,
  updateClothingAnalysis,
  reanalyzeClothingItem,
} from '../controllers/clothingController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadClothingImageMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all clothing endpoints
router.use(protect);

/**
 * @route   POST /api/clothes
 * @desc    Add a new clothing item
 * @access  Private
 * 
 * @route   GET /api/clothes
 * @desc    Get all clothing items with filters, search, and pagination
 * @access  Private
 */
router
  .route('/')
  .post(addClothingItem)
  .get(getClothingItems);

/**
 * @route   POST /api/clothes/:id/image
 * @desc    Upload an image for a clothing item (stored in uploads/clothing/)
 * @access  Private
 * 
 * @route   DELETE /api/clothes/:id/image
 * @desc    Delete clothing item image and reset references
 * @access  Private
 */
router
  .route('/:id/image')
  .post(uploadClothingImageMiddleware, uploadClothingImage)
  .delete(deleteClothingImage);

/**
 * @route   POST /api/clothes/:id/analyze
 * @desc    Send clothing image to AI recognition service and save predictions
 * @access  Private
 */
router.post('/:id/analyze', analyzeClothingItem);

/**
 * @route   POST /api/clothes/:id/reanalyze
 * @desc    Re-analyze clothing image with AI service, preserving manual overrides
 * @access  Private
 */
router.post('/:id/reanalyze', reanalyzeClothingItem);

/**
 * @route   GET /api/clothes/:id/analysis
 * @desc    Get AI analysis details for a clothing item
 * @access  Private
 * 
 * @route   PATCH /api/clothes/:id/analysis
 * @desc    Manually correct AI-generated clothing metadata
 * @access  Private
 */
router
  .route('/:id/analysis')
  .get(getClothingAnalysis)
  .patch(updateClothingAnalysis);

/**
 * @route   PATCH /api/clothes/:id/favorite
 * @desc    Toggle favorite status of a clothing item
 * @access  Private
 */
router.patch('/:id/favorite', toggleFavorite);

/**
 * @route   GET /api/clothes/:id
 * @desc    Get a single clothing item by ID
 * @access  Private
 * 
 * @route   PUT /api/clothes/:id
 * @desc    Update an existing clothing item
 * @access  Private
 * 
 * @route   DELETE /api/clothes/:id
 * @desc    Delete a clothing item and clean up stored local image
 * @access  Private
 */
router
  .route('/:id')
  .get(getClothingItemById)
  .put(updateClothingItem)
  .delete(deleteClothingItem);

export default router;
