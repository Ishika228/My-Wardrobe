/**
 * reindexDatabase.js
 * Safely indexes the MongoDB clothing collection:
 * - Backfills missing descriptions
 * - Generates 128-dimensional text embeddings
 * - Generates 64-dimensional visual image embeddings
 * - Preserves existing images, metadata, and user records
 * - Never deletes records or creates duplicates
 */

import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.js';
import mongoose from 'mongoose';
import { reindexWardrobeCollection } from '../services/embeddingService.js';

async function runReindexing() {
  try {
    console.log('[Re-index] Connecting to MongoDB Atlas...');
    await connectDB();

    console.log('[Re-index] Starting safe vector indexing and metadata backfill...');
    const result = await reindexWardrobeCollection();

    console.log(`[Re-index] Success! Scanned ${result.totalCount} items, updated embeddings & metadata on ${result.updatedCount} items.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Re-index] Error during reindexing:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runReindexing();

