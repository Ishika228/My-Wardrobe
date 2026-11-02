/**
 * aiRoutes.example.js
 * Example Express.js router for Member 2 (Backend & Database).
 * Shows exactly how to connect Member 3's AI module into the Express application.
 * 
 * Usage in Member 2's app.js:
 *   const aiRoutes = require('./routes/aiRoutes');
 *   app.use('/api/wardrobe', aiRoutes);
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const aiClient = require('./aiClient');

// Configure multer for handling image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store in backend uploads directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'clothing-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

/**
 * 1. POST /api/wardrobe/scan
 * Uploads an image, calls Member 3's AI vision module, and returns category, color & pattern.
 */
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a clothing image file.'
      });
    }

    const imagePath = req.file.path;
    // Call Member 3's AI client
    const aiResult = await aiClient.analyzeClothingImage(imagePath);

    if (aiResult.processing_status === 'error') {
      return res.status(500).json({
        success: false,
        message: aiResult.error_message,
        details: aiResult
      });
    }

    // Return the recognized properties to frontend so user can review/confirm
    return res.status(200).json({
      success: true,
      message: 'Clothing item recognized successfully.',
      data: {
        category: aiResult.category,
        category_group: aiResult.category_group,
        confidence: aiResult.confidence,
        colour: aiResult.colour,
        pattern: aiResult.pattern,
        recommended_seasons: aiResult.recommended_seasons,
        recommended_occasions: aiResult.recommended_occasions,
        image_url: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during clothing scan.',
      error: error.message
    });
  }
});

/**
 * 2. POST /api/wardrobe/recommendations
 * Generates smart outfit recommendations from the user's saved wardrobe.
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { occasion, season, limit } = req.body;

    // Member 2 fetches the user's clothing items from MongoDB:
    // const userWardrobe = await ClothingItem.find({ user: req.user._id });
    // For demonstration, req.body.wardrobe or mock database items can be used:
    const userWardrobe = req.body.wardrobe || [];

    // Call Member 3's Recommendation Engine
    const recommendationResult = aiClient.getRecommendations(userWardrobe, {
      occasion: occasion || 'Casual outing',
      season: season || 'Summer',
      limit: limit || 5,
      boostUnworn: true
    });

    return res.status(200).json({
      success: recommendationResult.status === 'success',
      ...recommendationResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations.',
      error: error.message
    });
  }
});

/**
 * 3. POST /api/wardrobe/unused-revival
 * Analyzes items that haven't been worn frequently and generates outfits to re-wear them.
 */
router.post('/unused-revival', async (req, res) => {
  try {
    const { occasion, season, limit } = req.body;
    const userWardrobe = req.body.wardrobe || [];

    const revivalResult = aiClient.getUnusedClothingRevival(userWardrobe, {
      occasion: occasion || 'Any',
      season: season || 'Any',
      limit: limit || 5
    });

    return res.status(200).json({
      success: revivalResult.status === 'success',
      ...revivalResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate unused clothing suggestions.',
      error: error.message
    });
  }
});

module.exports = router;
