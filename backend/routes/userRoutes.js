import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get currently authenticated user's profile
 * @access  Private
 * 
 * @route   PUT /api/users/profile
 * @desc    Update currently authenticated user's profile
 * @access  Private
 */
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
