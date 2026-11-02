import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import ClothingItem, { CLOTHING_CATEGORIES } from '../models/ClothingItem.js';
import { recognizeClothingImage } from '../services/aiRecognitionService.js';

/**
 * Escapes special characters for safe regular expression generation
 * @param {string} string - Raw user input string
 * @returns {string} Escaped string safe for RegExp
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Safely deletes a file from the uploads/clothing directory
 * Uses path.basename to prevent path traversal vulnerabilities
 * @param {string} filename - Filename or relative path to delete
 */
const safelyDeleteClothingImage = (filename) => {
  if (!filename || typeof filename !== 'string') return;
  const safeFilename = path.basename(filename);
  const filePath = path.resolve('uploads', 'clothing', safeFilename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`[File Cleanup Error] Failed to delete file ${filePath}:`, err.message);
    }
  }
};

/**
 * @desc    Add a new clothing item to the user's digital wardrobe
 * @route   POST /api/clothes
 * @access  Private (Authenticated User)
 */
export const addClothingItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      subCategory,
      color,
      secondaryColors,
      pattern,
      material,
      brand,
      season,
      occasion,
      style,
      imageUrl,
      isFavorite,
    } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Clothing item name is required',
      });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Clothing category is required',
      });
    }

    // 2. Validate category against supported CLOTHING_CATEGORIES enum
    const matchedCategory = CLOTHING_CATEGORIES.find(
      (c) => c.toLowerCase() === category.trim().toLowerCase()
    );

    if (!matchedCategory) {
      return res.status(400).json({
        success: false,
        message: `Invalid category: '${category}'. Supported categories: ${CLOTHING_CATEGORIES.join(', ')}`,
      });
    }

    // 3. Create clothing item scoped strictly to authenticated req.user._id
    // imageUrl is optional in Phase 5 to support creating an item first, then uploading image
    const clothingItem = await ClothingItem.create({
      userId: req.user._id, // Enforce authenticated user ownership
      name: name.trim(),
      category: matchedCategory,
      subCategory: subCategory ? subCategory.trim() : undefined,
      color: color ? color.trim() : undefined,
      secondaryColors: Array.isArray(secondaryColors)
        ? secondaryColors.map((c) => String(c).trim()).filter(Boolean)
        : [],
      pattern: pattern ? pattern.trim() : undefined,
      material: material ? material.trim() : undefined,
      brand: brand ? brand.trim() : undefined,
      season: Array.isArray(season)
        ? season.map((s) => String(s).trim()).filter(Boolean)
        : [],
      occasion: Array.isArray(occasion)
        ? occasion.map((o) => String(o).trim()).filter(Boolean)
        : [],
      style: Array.isArray(style)
        ? style.map((st) => String(st).trim()).filter(Boolean)
        : [],
      imageUrl: imageUrl && typeof imageUrl === 'string' ? imageUrl.trim() : null,
      isFavorite: Boolean(isFavorite),
    });

    return res.status(201).json({
      success: true,
      message: 'Clothing item added successfully',
      data: {
        clothingItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all clothing items for the authenticated user with search, filtering & pagination
 * @route   GET /api/clothes
 * @access  Private (Authenticated User)
 */
export const getClothingItems = async (req, res, next) => {
  try {
    // 1. Base query strictly scoped to authenticated user
    const filter = {
      userId: req.user._id,
    };

    const {
      page = 1,
      limit = 12,
      category,
      color,
      season,
      occasion,
      isFavorite,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // 2. Apply filters
    if (category) {
      filter.category = new RegExp(`^${escapeRegex(String(category).trim())}$`, 'i');
    }

    if (color) {
      filter.color = new RegExp(escapeRegex(String(color).trim()), 'i');
    }

    if (season) {
      filter.season = {
        $elemMatch: { $regex: new RegExp(escapeRegex(String(season).trim()), 'i') },
      };
    }

    if (occasion) {
      filter.occasion = {
        $elemMatch: { $regex: new RegExp(escapeRegex(String(occasion).trim()), 'i') },
      };
    }

    if (isFavorite !== undefined && isFavorite !== '') {
      filter.isFavorite = String(isFavorite).toLowerCase() === 'true';
    }

    // Search filter across item name
    if (search && String(search).trim().length > 0) {
      filter.name = {
        $regex: new RegExp(escapeRegex(String(search).trim()), 'i'),
      };
    }

    // 3. Pagination sanitization
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (parsedPage - 1) * parsedLimit;

    // 4. Sorting setup
    const allowedSortFields = ['createdAt', 'name', 'timesWorn', 'updatedAt'];
    const selectedSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sortObj = { [selectedSortField]: sortDirection };

    // 5. Execute count and find concurrently
    const [totalItems, items] = await Promise.all([
      ClothingItem.countDocuments(filter),
      ClothingItem.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit),
    ]);

    const totalPages = Math.ceil(totalItems / parsedLimit) || 0;

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        totalItems,
        currentPage: parsedPage,
        totalPages,
        limit: parsedLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single clothing item by ID
 * @route   GET /api/clothes/:id
 * @access  Private (Authenticated User)
 */
export const getClothingItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    // Find item matching both item ID and authenticated user's ID
    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Clothing item retrieved successfully',
      data: {
        clothingItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing clothing item
 * @route   PUT /api/clothes/:id
 * @access  Private (Authenticated User)
 */
export const updateClothingItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    const {
      name,
      category,
      subCategory,
      color,
      secondaryColors,
      pattern,
      material,
      brand,
      season,
      occasion,
      style,
      imageUrl,
      isFavorite,
    } = req.body;

    // Validate and update fields
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty',
        });
      }
      clothingItem.name = name.trim();
    }

    if (category !== undefined) {
      const matchedCategory = CLOTHING_CATEGORIES.find(
        (c) => c.toLowerCase() === String(category).trim().toLowerCase()
      );
      if (!matchedCategory) {
        return res.status(400).json({
          success: false,
          message: `Invalid category: '${category}'. Supported categories: ${CLOTHING_CATEGORIES.join(', ')}`,
        });
      }
      clothingItem.category = matchedCategory;
    }

    if (subCategory !== undefined) clothingItem.subCategory = subCategory ? String(subCategory).trim() : null;
    if (color !== undefined) clothingItem.color = color ? String(color).trim() : null;
    if (secondaryColors !== undefined) {
      clothingItem.secondaryColors = Array.isArray(secondaryColors)
        ? secondaryColors.map((c) => String(c).trim()).filter(Boolean)
        : [];
    }
    if (pattern !== undefined) clothingItem.pattern = pattern ? String(pattern).trim() : null;
    if (material !== undefined) clothingItem.material = material ? String(material).trim() : null;
    if (brand !== undefined) clothingItem.brand = brand ? String(brand).trim() : null;
    if (season !== undefined) {
      clothingItem.season = Array.isArray(season)
        ? season.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    if (occasion !== undefined) {
      clothingItem.occasion = Array.isArray(occasion)
        ? occasion.map((o) => String(o).trim()).filter(Boolean)
        : [];
    }
    if (style !== undefined) {
      clothingItem.style = Array.isArray(style)
        ? style.map((st) => String(st).trim()).filter(Boolean)
        : [];
    }
    if (imageUrl !== undefined) {
      clothingItem.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }
    if (isFavorite !== undefined) {
      clothingItem.isFavorite = Boolean(isFavorite);
    }

    // Note: userId and _id cannot be modified
    const updatedItem = await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: 'Clothing item updated successfully',
      data: {
        clothingItem: updatedItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload an image for a clothing item (local storage in uploads/clothing/)
 * @route   POST /api/clothes/:id/image
 * @access  Private (Authenticated User)
 */
export const uploadClothingImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Check if file was uploaded by multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file to upload',
      });
    }

    // 2. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      safelyDeleteClothingImage(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    // 3. Find item belonging to authenticated user
    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      // Discard uploaded file if item not found / unauthorized
      safelyDeleteClothingImage(req.file.filename);
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    const oldImagePublicId = clothingItem.imagePublicId;
    const newImageFilename = req.file.filename;
    const newImageUrl = `/uploads/clothing/${newImageFilename}`;

    // 4. Update document with new image URL and public ID
    clothingItem.imageUrl = newImageUrl;
    clothingItem.imagePublicId = newImageFilename;

    try {
      await clothingItem.save();
    } catch (dbError) {
      // If DB save fails, roll back newly uploaded file
      safelyDeleteClothingImage(newImageFilename);
      throw dbError;
    }

    // 5. Delete old image from disk after DB save succeeds
    if (oldImagePublicId && oldImagePublicId !== newImageFilename) {
      safelyDeleteClothingImage(oldImagePublicId);
    } else if (
      clothingItem.imageUrl &&
      clothingItem.imageUrl.startsWith('/uploads/clothing/') &&
      path.basename(clothingItem.imageUrl) !== newImageFilename
    ) {
      safelyDeleteClothingImage(path.basename(clothingItem.imageUrl));
    }

    return res.status(200).json({
      success: true,
      message: 'Clothing image uploaded successfully',
      data: {
        clothingItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete clothing item image and clear references
 * @route   DELETE /api/clothes/:id/image
 * @access  Private (Authenticated User)
 */
export const deleteClothingImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    // Delete image from disk
    if (clothingItem.imagePublicId) {
      safelyDeleteClothingImage(clothingItem.imagePublicId);
    } else if (clothingItem.imageUrl && clothingItem.imageUrl.startsWith('/uploads/clothing/')) {
      safelyDeleteClothingImage(path.basename(clothingItem.imageUrl));
    }

    // Clear database references
    clothingItem.imageUrl = null;
    clothingItem.imagePublicId = null;
    await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: 'Clothing image deleted successfully',
      data: {
        clothingItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a clothing item and clean up its associated local image
 * @route   DELETE /api/clothes/:id
 * @access  Private (Authenticated User)
 */
export const deleteClothingItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    // Clean up associated local image from disk if exists
    if (clothingItem.imagePublicId) {
      safelyDeleteClothingImage(clothingItem.imagePublicId);
    } else if (clothingItem.imageUrl && clothingItem.imageUrl.startsWith('/uploads/clothing/')) {
      safelyDeleteClothingImage(path.basename(clothingItem.imageUrl));
    }

    await ClothingItem.deleteOne({ _id: clothingItem._id });

    return res.status(200).json({
      success: true,
      message: 'Clothing item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle favorite status of a clothing item
 * @route   PATCH /api/clothes/:id/favorite
 * @access  Private (Authenticated User)
 */
export const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    clothingItem.isFavorite = !clothingItem.isFavorite;
    await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: `Clothing item ${clothingItem.isFavorite ? 'added to' : 'removed from'} favorites`,
      data: {
        clothingItem,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to update clothing item metadata from AI predictions based on manual edit policies
 */
const applyAiPredictionsToItem = (clothingItem, predictions, forceReplace = false) => {
  const fields = [
    'category',
    'subCategory',
    'color',
    'secondaryColors',
    'pattern',
    'material',
    'season',
    'occasion',
    'style',
  ];

  if (forceReplace) {
    clothingItem.manuallyEditedFields = [];
  }

  for (const field of fields) {
    const predictedValue = predictions[field];
    const isManuallyEdited = clothingItem.manuallyEditedFields.includes(field);

    // If not manually edited or force replacement requested, apply valid prediction
    if ((!isManuallyEdited || forceReplace) && predictedValue !== null && predictedValue !== undefined) {
      if (Array.isArray(predictedValue)) {
        if (predictedValue.length > 0) {
          clothingItem[field] = predictedValue;
        }
      } else if (String(predictedValue).trim().length > 0) {
        clothingItem[field] = predictedValue;
      }
    }
  }
};

/**
 * @desc    Analyze clothing item with AI recognition service
 * @route   POST /api/clothes/:id/analyze
 * @access  Private (Authenticated User)
 */
export const analyzeClothingItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    if (!clothingItem.imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded for this clothing item. Please upload an image first.',
      });
    }

    // Call external AI recognition service (or isolated mock fallback)
    const aiResult = await recognizeClothingImage(clothingItem.imageUrl);

    // Apply metadata predictions adhering to manual edit policy
    applyAiPredictionsToItem(clothingItem, aiResult.data, Boolean(req.body.forceReplace));

    // Save full AI analysis subdocument
    clothingItem.aiAnalysis = {
      ...aiResult.data,
      analyzedAt: new Date(),
      isMock: Boolean(aiResult.isMock),
    };
    clothingItem.aiAnalyzed = true;

    await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: 'Clothing item analyzed successfully',
      data: {
        clothingItem,
        analysis: clothingItem.aiAnalysis,
        isMock: Boolean(aiResult.isMock),
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get AI analysis details for a clothing item
 * @route   GET /api/clothes/:id/analysis
 * @access  Private (Authenticated User)
 */
export const getClothingAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    if (!clothingItem.aiAnalyzed) {
      return res.status(200).json({
        success: true,
        message: 'Clothing item has not been analyzed yet',
        data: {
          aiAnalyzed: false,
          aiAnalysis: null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Clothing AI analysis retrieved successfully',
      data: {
        aiAnalyzed: true,
        aiAnalysis: clothingItem.aiAnalysis,
        manuallyEditedFields: clothingItem.manuallyEditedFields,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update/correct AI-generated clothing metadata
 * @route   PATCH /api/clothes/:id/analysis
 * @access  Private (Authenticated User)
 */
export const updateClothingAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    const updates = req.body;
    const modifiedFields = [];

    // Validate and apply fields
    if (updates.category !== undefined) {
      const matched = CLOTHING_CATEGORIES.find(
        (c) => c.toLowerCase() === String(updates.category).trim().toLowerCase()
      );
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: `Invalid category: '${updates.category}'. Supported categories: ${CLOTHING_CATEGORIES.join(', ')}`,
        });
      }
      clothingItem.category = matched;
      modifiedFields.push('category');
    }

    if (updates.subCategory !== undefined) {
      clothingItem.subCategory = updates.subCategory ? String(updates.subCategory).trim() : null;
      modifiedFields.push('subCategory');
    }
    if (updates.color !== undefined) {
      clothingItem.color = updates.color ? String(updates.color).trim() : null;
      modifiedFields.push('color');
    }
    if (updates.secondaryColors !== undefined) {
      clothingItem.secondaryColors = Array.isArray(updates.secondaryColors)
        ? updates.secondaryColors.map((c) => String(c).trim()).filter(Boolean)
        : [];
      modifiedFields.push('secondaryColors');
    }
    if (updates.pattern !== undefined) {
      clothingItem.pattern = updates.pattern ? String(updates.pattern).trim() : null;
      modifiedFields.push('pattern');
    }
    if (updates.material !== undefined) {
      clothingItem.material = updates.material ? String(updates.material).trim() : null;
      modifiedFields.push('material');
    }
    if (updates.season !== undefined) {
      clothingItem.season = Array.isArray(updates.season)
        ? updates.season.map((s) => String(s).trim()).filter(Boolean)
        : [];
      modifiedFields.push('season');
    }
    if (updates.occasion !== undefined) {
      clothingItem.occasion = Array.isArray(updates.occasion)
        ? updates.occasion.map((o) => String(o).trim()).filter(Boolean)
        : [];
      modifiedFields.push('occasion');
    }
    if (updates.style !== undefined) {
      clothingItem.style = Array.isArray(updates.style)
        ? updates.style.map((st) => String(st).trim()).filter(Boolean)
        : [];
      modifiedFields.push('style');
    }

    // Record modified fields into manuallyEditedFields
    for (const f of modifiedFields) {
      if (!clothingItem.manuallyEditedFields.includes(f)) {
        clothingItem.manuallyEditedFields.push(f);
      }
    }

    await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: 'Clothing metadata updated and marked as manually edited',
      data: {
        clothingItem,
        manuallyEditedFields: clothingItem.manuallyEditedFields,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Re-analyze clothing item with AI, preserving manually edited fields
 * @route   POST /api/clothes/:id/reanalyze
 * @access  Private (Authenticated User)
 */
export const reanalyzeClothingItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid clothing item ID format',
      });
    }

    const clothingItem = await ClothingItem.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!clothingItem) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found',
      });
    }

    if (!clothingItem.imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'No image uploaded for this clothing item. Please upload an image first.',
      });
    }

    // Re-run AI analysis
    const aiResult = await recognizeClothingImage(clothingItem.imageUrl);

    // Apply predictions preserving manually edited fields (unless forceReplace is true)
    applyAiPredictionsToItem(clothingItem, aiResult.data, Boolean(req.body.forceReplace));

    // Update AI analysis record
    clothingItem.aiAnalysis = {
      ...aiResult.data,
      analyzedAt: new Date(),
      isMock: Boolean(aiResult.isMock),
    };
    clothingItem.aiAnalyzed = true;

    await clothingItem.save();

    return res.status(200).json({
      success: true,
      message: 'Clothing item re-analyzed successfully',
      data: {
        clothingItem,
        analysis: clothingItem.aiAnalysis,
        isMock: Boolean(aiResult.isMock),
        manuallyEditedFields: clothingItem.manuallyEditedFields,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
