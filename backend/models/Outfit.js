import mongoose from 'mongoose';

/**
 * Outfit Schema
 * Represents a curated combination of clothing items created by the user or recommended by AI.
 */
const outfitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Outfit name is required'],
      trim: true,
    },
    clothingItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothingItem',
      },
    ],
    occasion: {
      type: String,
      trim: true,
    },
    season: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    previewImage: {
      type: String,
      default: null,
      trim: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to optimize user outfit queries and sorting
outfitSchema.index({ userId: 1, createdAt: -1 });
outfitSchema.index({ userId: 1, occasion: 1 });

const Outfit = mongoose.model('Outfit', outfitSchema);

export default Outfit;
