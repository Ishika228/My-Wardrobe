import mongoose from 'mongoose';

/**
 * Validated clothing categories supported across the digital wardrobe
 */
export const CLOTHING_CATEGORIES = [
  'Shirt',
  'T-Shirt',
  'Jeans',
  'Trousers',
  'Jacket',
  'Dress',
  'Skirt',
  'Shoes',
  'Accessories',
  'Ethnic',
  'Traditional',
  'Saree',
  'Kurti',
  'Anarkali',
  'Lehenga',
  'Suit',
  'Other',
];

/**
 * ClothingItem Schema
 * Represents an individual garment or accessory owned by a user.
 */
const clothingItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Clothing item name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Clothing category is required'],
      enum: {
        values: CLOTHING_CATEGORIES,
        message: '{VALUE} is not a supported clothing category',
      },
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    secondaryColors: {
      type: [String],
      default: [],
    },
    pattern: {
      type: String,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    season: {
      type: [String],
      default: [],
    },
    occasion: {
      type: [String],
      default: [],
    },
    style: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: null,
      trim: true,
    },
    aiAnalyzed: {
      type: Boolean,
      default: false,
    },
    aiAnalysis: {
      category: { type: String, trim: true },
      subCategory: { type: String, trim: true },
      color: { type: String, trim: true },
      secondaryColors: { type: [String], default: [] },
      pattern: { type: String, trim: true },
      material: { type: String, trim: true },
      season: { type: [String], default: [] },
      occasion: { type: [String], default: [] },
      style: { type: [String], default: [] },
      confidence: { type: Number, min: 0, max: 1 },
      analyzedAt: { type: Date },
      isMock: { type: Boolean, default: false },
    },
    model3d: {
      modelUrl: { type: String, trim: true },
      taskId: { type: String, trim: true },
      status: {
        type: String,
        enum: ['none', 'queued', 'running', 'success', 'failed'],
        default: 'none',
      },
      progress: { type: Number, default: 0 },
      source: { type: String, default: 'tripo3d' },
      generatedAt: { type: Date },
      errorMessage: { type: String, trim: true },
    },
    manuallyEditedFields: {
      type: [String],
      default: [],
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    timesWorn: {
      type: Number,
      default: 0,
      min: [0, 'Times worn cannot be negative'],
    },
    lastWornDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes to optimize querying clothing items by user, category, favorites, and recency
clothingItemSchema.index({ userId: 1, category: 1 });
clothingItemSchema.index({ userId: 1, isFavorite: 1 });
clothingItemSchema.index({ userId: 1, createdAt: -1 });

const ClothingItem = mongoose.model('ClothingItem', clothingItemSchema);

export default ClothingItem;
