import mongoose from 'mongoose';
import Outfit from '../models/Outfit.js';
import ClothingItem from '../models/ClothingItem.js';

/**
 * Escapes special characters for safe regular expression generation
 * @param {string} string - Raw user input string
 * @returns {string} Escaped string safe for RegExp
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Create a new outfit with existing clothing item references
 * @route   POST /api/outfits
 * @access  Private (Authenticated User)
 */
export const createOutfit = async (req, res, next) => {
  try {
    const {
      name,
      clothingItems,
      occasion,
      season,
      description,
      previewImage,
      isFavorite,
    } = req.body;

    // 1. Validate outfit name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Outfit name is required',
      });
    }

    // 2. Validate clothing items array (at least one item required)
    if (!Array.isArray(clothingItems) || clothingItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An outfit must contain at least one clothing item',
      });
    }

    // 3. Validate all clothing item IDs format
    const rawIds = clothingItems.map(String);
    for (const id of rawIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid clothing item ID format: '${id}'`,
        });
      }
    }

    // 4. Prevent duplicate clothing item IDs in one outfit
    const uniqueIds = [...new Set(rawIds)];
    if (uniqueIds.length !== rawIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate clothing items are not allowed in the same outfit',
      });
    }

    // 5. Verify every clothing item exists and belongs to the authenticated user
    const existingItems = await ClothingItem.find({
      _id: { $in: uniqueIds },
      userId: req.user._id,
    });

    if (existingItems.length !== uniqueIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more clothing items do not exist or do not belong to you',
      });
    }

    // 6. Create outfit scoped strictly to authenticated req.user._id
    const outfit = await Outfit.create({
      userId: req.user._id,
      name: name.trim(),
      clothingItems: uniqueIds,
      occasion: occasion ? String(occasion).trim() : undefined,
      season: season ? String(season).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      previewImage: previewImage ? String(previewImage).trim() : undefined,
      isFavorite: Boolean(isFavorite),
    });

    // 7. Populate clothing item details
    await outfit.populate('clothingItems');

    return res.status(201).json({
      success: true,
      message: 'Outfit created successfully',
      data: {
        outfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all outfits for the authenticated user with filtering, search & pagination
 * @route   GET /api/outfits
 * @access  Private (Authenticated User)
 */
export const getOutfits = async (req, res, next) => {
  try {
    // 1. Scoped strictly to authenticated user
    const filter = {
      userId: req.user._id,
    };

    const {
      page = 1,
      limit = 12,
      occasion,
      season,
      isFavorite,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // 2. Apply filters
    if (occasion) {
      filter.occasion = new RegExp(`^${escapeRegex(String(occasion).trim())}$`, 'i');
    }

    if (season) {
      filter.season = new RegExp(`^${escapeRegex(String(season).trim())}$`, 'i');
    }

    if (isFavorite !== undefined && isFavorite !== '') {
      filter.isFavorite = String(isFavorite).toLowerCase() === 'true';
    }

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
    const allowedSortFields = ['createdAt', 'name', 'updatedAt'];
    const selectedSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sortObj = { [selectedSortField]: sortDirection };

    // 5. Query execution
    const [totalItems, outfits] = await Promise.all([
      Outfit.countDocuments(filter),
      Outfit.find(filter)
        .populate('clothingItems')
        .sort(sortObj)
        .skip(skip)
        .limit(parsedLimit),
    ]);

    const totalPages = Math.ceil(totalItems / parsedLimit) || 0;

    return res.status(200).json({
      success: true,
      data: outfits,
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
 * @desc    Get a single outfit by ID with populated clothing items
 * @route   GET /api/outfits/:id
 * @access  Private (Authenticated User)
 */
export const getOutfitById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outfit ID format',
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId: req.user._id,
    }).populate('clothingItems');

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Outfit retrieved successfully',
      data: {
        outfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing outfit
 * @route   PUT /api/outfits/:id
 * @access  Private (Authenticated User)
 */
export const updateOutfit = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outfit ID format',
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found',
      });
    }

    const {
      name,
      clothingItems,
      occasion,
      season,
      description,
      previewImage,
      isFavorite,
    } = req.body;

    // Validate and update name
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Outfit name cannot be empty',
        });
      }
      outfit.name = name.trim();
    }

    // Validate and update clothing items
    if (clothingItems !== undefined) {
      if (!Array.isArray(clothingItems) || clothingItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'An outfit must contain at least one clothing item',
        });
      }

      const rawIds = clothingItems.map(String);
      for (const itemId of rawIds) {
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid clothing item ID format: '${itemId}'`,
          });
        }
      }

      const uniqueIds = [...new Set(rawIds)];
      if (uniqueIds.length !== rawIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate clothing items are not allowed in the same outfit',
        });
      }

      const userItems = await ClothingItem.find({
        _id: { $in: uniqueIds },
        userId: req.user._id,
      });

      if (userItems.length !== uniqueIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more clothing items do not exist or do not belong to you',
        });
      }

      outfit.clothingItems = uniqueIds;
    }

    // Optional metadata updates
    if (occasion !== undefined) outfit.occasion = occasion ? String(occasion).trim() : null;
    if (season !== undefined) outfit.season = season ? String(season).trim() : null;
    if (description !== undefined) outfit.description = description ? String(description).trim() : null;
    if (previewImage !== undefined) outfit.previewImage = previewImage ? String(previewImage).trim() : null;
    if (isFavorite !== undefined) outfit.isFavorite = Boolean(isFavorite);

    // Save and populate
    await outfit.save();
    await outfit.populate('clothingItems');

    return res.status(200).json({
      success: true,
      message: 'Outfit updated successfully',
      data: {
        outfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an outfit (does NOT delete clothing items)
 * @route   DELETE /api/outfits/:id
 * @access  Private (Authenticated User)
 */
export const deleteOutfit = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outfit ID format',
      });
    }

    const deletedOutfit = await Outfit.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deletedOutfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Outfit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle favorite status of an outfit
 * @route   PATCH /api/outfits/:id/favorite
 * @access  Private (Authenticated User)
 */
export const toggleOutfitFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outfit ID format',
      });
    }

    const outfit = await Outfit.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found',
      });
    }

    outfit.isFavorite = !outfit.isFavorite;
    await outfit.save();

    return res.status(200).json({
      success: true,
      message: `Outfit ${outfit.isFavorite ? 'marked as' : 'removed from'} favorite`,
      data: {
        outfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add or remove clothing items from an outfit
 * @route   PATCH /api/outfits/:id/items
 * @access  Private (Authenticated User)
 */
export const updateOutfitItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, clothingItemIds } = req.body;

    // 1. Validate outfit ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outfit ID format',
      });
    }

    // 2. Validate action
    if (!action || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'add' or 'remove'",
      });
    }

    // 3. Validate clothingItemIds
    if (!Array.isArray(clothingItemIds) || clothingItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clothingItemIds must be a non-empty array of IDs',
      });
    }

    const rawIds = clothingItemIds.map(String);
    for (const itemId of rawIds) {
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({
          success: false,
          message: `Invalid clothing item ID format: '${itemId}'`,
        });
      }
    }

    // 4. Find outfit belonging to authenticated user
    const outfit = await Outfit.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found',
      });
    }

    // Handle 'add' action
    if (action === 'add') {
      // Verify all items belong to authenticated user
      const ownedItems = await ClothingItem.find({
        _id: { $in: rawIds },
        userId: req.user._id,
      });

      if (ownedItems.length !== rawIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more clothing items do not exist or do not belong to you',
        });
      }

      const existingSet = new Set(outfit.clothingItems.map((i) => i.toString()));
      for (const itemId of rawIds) {
        if (existingSet.has(itemId)) {
          return res.status(400).json({
            success: false,
            message: `Clothing item '${itemId}' is already in this outfit`,
          });
        }
      }

      outfit.clothingItems.push(...rawIds);
    }

    // Handle 'remove' action
    if (action === 'remove') {
      const removeSet = new Set(rawIds);
      const remainingItems = outfit.clothingItems.filter(
        (item) => !removeSet.has(item.toString())
      );

      // Prevent outfit from becoming empty
      if (remainingItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'An outfit must contain at least one clothing item. Cannot remove all items.',
        });
      }

      outfit.clothingItems = remainingItems;
    }

    await outfit.save();
    await outfit.populate('clothingItems');

    return res.status(200).json({
      success: true,
      message: `Clothing items ${action === 'add' ? 'added to' : 'removed from'} outfit successfully`,
      data: {
        outfit,
      },
    });
  } catch (error) {
    next(error);
  }
};
