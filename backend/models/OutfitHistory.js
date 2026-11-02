import mongoose from 'mongoose';

/**
 * OutfitHistory Schema
 * Logs real-world wear instances of clothing combinations over time.
 * Supports referencing an existing saved Outfit or an ad-hoc set of ClothingItems.
 */
const outfitHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      index: true,
    },
    outfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
      default: null,
    },
    clothingItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothingItem',
      },
    ],
    wornDate: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize timeline queries and wear frequency analytics by user and date
outfitHistorySchema.index({ userId: 1, wornDate: -1 });

const OutfitHistory = mongoose.model('OutfitHistory', outfitHistorySchema);

export default OutfitHistory;
