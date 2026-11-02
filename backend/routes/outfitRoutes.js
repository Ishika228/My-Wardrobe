import express from 'express';
import {
  createOutfit,
  getOutfits,
  getOutfitById,
  updateOutfit,
  deleteOutfit,
  toggleOutfitFavorite,
  updateOutfitItems,
} from '../controllers/outfitController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all outfit routes with JWT authentication
router.use(protect);

/**
 * @route   POST /api/outfits
 * @desc    Create a new outfit
 * @access  Private
 * 
 * @route   GET /api/outfits
 * @desc    Get all outfits with filtering, search, and pagination
 * @access  Private
 */
router
  .route('/')
  .post(createOutfit)
  .get(getOutfits);

/**
 * @route   PATCH /api/outfits/:id/favorite
 * @desc    Toggle favorite status of an outfit
 * @access  Private
 */
router.patch('/:id/favorite', toggleOutfitFavorite);

/**
 * @route   PATCH /api/outfits/:id/items
 * @desc    Add or remove clothing items from an outfit
 * @access  Private
 */
router.patch('/:id/items', updateOutfitItems);

/**
 * @route   GET /api/outfits/:id
 * @desc    Get an individual outfit by ID
 * @access  Private
 * 
 * @route   PUT /api/outfits/:id
 * @desc    Update an existing outfit
 * @access  Private
 * 
 * @route   DELETE /api/outfits/:id
 * @desc    Delete an outfit (does not delete clothing items)
 * @access  Private
 */
router
  .route('/:id')
  .get(getOutfitById)
  .put(updateOutfit)
  .delete(deleteOutfit);

export default router;
