import mongoose from 'mongoose';

/**
 * GarmentModel Schema
 * Tracks garment extraction, background/person segmentation masks,
 * Google Gemini Multimodal AI fashion intelligence, and 3D GLB models.
 */
const garmentModelSchema = new mongoose.Schema(
  {
    clothingItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClothingItem',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    taskId: {
      type: String,
      required: [true, 'Task ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    service: {
      type: String,
      default: 'gemini_multimodal_ai',
      trim: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'success', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    category: {
      type: String,
      trim: true,
    },
    originalImageUrl: {
      type: String,
      trim: true,
    },
    extractedImageUrl: {
      type: String,
      trim: true,
    },
    maskUrl: {
      type: String,
      trim: true,
    },
    tripoFileToken: {
      type: String,
      trim: true,
    },
    tripoModelUrl: {
      type: String,
      trim: true,
    },
    modelUrl: {
      type: String,
      trim: true,
    },
    localGlbPath: {
      type: String,
      trim: true,
    },
    renderedImageUrl: {
      type: String,
      trim: true,
    },
    pbr: {
      type: Boolean,
      default: true,
    },
    format: {
      type: String,
      default: 'glb',
    },
    geminiAnalysis: {
      type: Object,
      default: null,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    fittingConfig: {
      scale: { type: [Number], default: [1, 1, 1] },
      position: { type: [Number], default: [0, 0, 0] },
      rotation: { type: [Number], default: [0, 0, 0] },
      silhouette: { type: String, default: 'custom' },
    },
  },
  {
    timestamps: true,
  }
);

garmentModelSchema.index({ userId: 1, createdAt: -1 });
garmentModelSchema.index({ clothingItemId: 1, status: 1 });

const GarmentModel = mongoose.model('GarmentModel', garmentModelSchema);

export default GarmentModel;
