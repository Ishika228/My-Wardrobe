import mongoose from 'mongoose';

/**
 * GarmentModel Schema
 * Tracks cloud-based 2D-to-3D garment generation tasks (e.g., Tripo3D API v3),
 * generated GLB assets, and avatar fitting configuration.
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
      default: 'tripo3d',
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
