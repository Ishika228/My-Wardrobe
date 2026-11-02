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
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { uploadClothingImageMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/clothes
 * @desc    Add a new clothing item
 * @access  Private
 * 
 * @route   GET /api/clothes
 * @desc    Get clothing items with filters, search, and pagination (public/demo or user-specific)
 * @access  Public / Private
 */
router
  .route('/')
  .post(optionalProtect, addClothingItem)
  .get(optionalProtect, getClothingItems);

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
  .post(optionalProtect, uploadClothingImageMiddleware, uploadClothingImage)
  .delete(optionalProtect, deleteClothingImage);

/**
 * @route   POST /api/clothes/:id/analyze
 * @desc    Send clothing image to AI recognition service and save predictions
 * @access  Private
 */
router.post('/:id/analyze', optionalProtect, analyzeClothingItem);

/**
 * @route   POST /api/clothes/:id/reanalyze
 * @desc    Re-analyze clothing image with AI service, preserving manual overrides
 * @access  Private
 */
router.post('/:id/reanalyze', optionalProtect, reanalyzeClothingItem);

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
  .get(protect, getClothingAnalysis)
  .patch(protect, updateClothingAnalysis);

/**
 * @route   PATCH /api/clothes/:id/favorite
 * @desc    Toggle favorite status of a clothing item
 * @access  Private
 */
router.patch('/:id/favorite', optionalProtect, toggleFavorite);

/**
 * @route   GET /api/clothes/:id
 * @desc    Get a single clothing item by ID
 * @access  Public / Private
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
  .get(optionalProtect, getClothingItemById)
  .put(optionalProtect, updateClothingItem)
  .delete(optionalProtect, deleteClothingItem);

export default router;
