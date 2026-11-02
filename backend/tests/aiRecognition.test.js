process.env.NODE_ENV = 'test';
process.env.PORT = '5008';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import generateToken from '../utils/generateToken.js';
import { aiConfig } from '../config/aiConfig.js';
import { normalizeAiPrediction } from '../services/aiRecognitionService.js';

const runAiRecognitionTests = async () => {
  console.log('=== WardrobeWise Phase 6: AI Recognition Integration Tests ===\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  };

  const TEST_PORT = 5008;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  let testClothingItem = null;
  let uploadedFilename = null;

  try {
    // 1. Start server for test suite
    runningServer = await startServer(TEST_PORT);

    // 2. Create users
    userA = await User.create({
      name: 'AI Test User A',
      email: `ai.user.a.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'AI Test User B',
      email: `ai.user.b.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenB = generateToken(userB._id);

    // 3. Create clothing item without an image initially
    testClothingItem = await ClothingItem.create({
      userId: userA._id,
      name: 'Vintage Biker Jacket',
      category: 'Other',
    });

    // --- TEST 1: Analyze an item without an image ---
    const noImgRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const noImgData = await noImgRes.json();
    assert(
      noImgRes.status === 400 &&
      noImgData.success === false &&
      noImgData.message.includes('No image uploaded'),
      '1. Analyze item without an image is rejected with HTTP 400'
    );

    // --- TEST 2: Check unanalyzed item via GET /analysis ---
    const unanalyzedGetRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analysis`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unanalyzedGetData = await unanalyzedGetRes.json();
    assert(
      unanalyzedGetRes.status === 200 &&
      unanalyzedGetData.data?.aiAnalyzed === false &&
      unanalyzedGetData.data?.aiAnalysis === null,
      '2. GET /analysis for unanalyzed item returns clear status indicating not yet analyzed'
    );

    // --- TEST 3: Upload an image to the clothing item ---
    const dummyBuffer = Buffer.alloc(1024, 'a');
    const formData = new FormData();
    formData.append('image', new Blob([dummyBuffer], { type: 'image/jpeg' }), 'biker-jacket.jpg');

    const uploadRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    uploadedFilename = uploadData.data?.clothingItem?.imagePublicId;
    assert(
      uploadRes.status === 200 && Boolean(uploadedFilename),
      '3. Successfully uploaded image to test clothing item before analysis'
    );

    // --- TEST 4: Analyze clothing item with uploaded image (Using isolated mock AI adapter) ---
    const analyzeRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const analyzeData = await analyzeRes.json();

    assert(
      analyzeRes.status === 200 &&
      analyzeData.success === true &&
      analyzeData.data?.clothingItem?.aiAnalyzed === true &&
      analyzeData.data?.clothingItem?.category === 'Jacket' &&
      analyzeData.data?.analysis?.confidence === 0.94 &&
      analyzeData.data?.isMock === true, // Documented mock adapter clearly identified
      '4. POST /analyze analyzes image, updates category/metadata, and sets aiAnalyzed to true (Mock Adapter)'
    );

    // --- TEST 5: Analyze nonexistent item ---
    const fakeId = new mongoose.Types.ObjectId();
    const fakeIdRes = await fetch(`${baseUrl}/api/clothes/${fakeId}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const fakeIdData = await fakeIdRes.json();
    assert(
      fakeIdRes.status === 404 &&
      fakeIdData.message.includes('not found'),
      '5. POST /analyze for nonexistent item ID returns HTTP 404'
    );

    // --- TEST 6: Try analyzing another user\'s item (IDOR Protection) ---
    const idorRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const idorData = await idorRes.json();
    assert(
      idorRes.status === 404 &&
      idorData.message.includes('not found'),
      '6. IDOR protection prevents User B from analyzing User A\'s item (HTTP 404)'
    );

    // --- TEST 7: Retrieve saved analysis (GET /analysis) ---
    const getAnalysisRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analysis`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getAnalysisData = await getAnalysisRes.json();
    assert(
      getAnalysisRes.status === 200 &&
      getAnalysisData.data?.aiAnalyzed === true &&
      getAnalysisData.data?.aiAnalysis?.category === 'Jacket' &&
      getAnalysisData.data?.aiAnalysis?.confidence === 0.94,
      '7. GET /analysis returns saved AI prediction details and confidence rating'
    );

    // --- TEST 8: Update AI metadata manually (PATCH /analysis) ---
    const patchRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analysis`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        material: '100% Genuine Italian Leather',
        color: 'Midnight Black',
      }),
    });
    const patchData = await patchRes.json();

    assert(
      patchRes.status === 200 &&
      patchData.data?.clothingItem?.material === '100% Genuine Italian Leather' &&
      patchData.data?.clothingItem?.color === 'Midnight Black' &&
      patchData.data?.manuallyEditedFields.includes('material') &&
      patchData.data?.manuallyEditedFields.includes('color'),
      '8. PATCH /analysis updates metadata and tracks modified fields in manuallyEditedFields'
    );

    // --- TEST 9: Re-analyze clothing item (Preserving manual edits) ---
    const reanalyzeRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/reanalyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const reanalyzeData = await reanalyzeRes.json();

    assert(
      reanalyzeRes.status === 200 &&
      // Manually edited fields are PRESERVED:
      reanalyzeData.data?.clothingItem?.material === '100% Genuine Italian Leather' &&
      reanalyzeData.data?.clothingItem?.color === 'Midnight Black' &&
      // Non-manually edited fields are re-analyzed:
      reanalyzeData.data?.analysis?.category === 'Jacket',
      '9. POST /reanalyze preserves manually edited fields according to policy'
    );

    // --- TEST 10: Re-analyze with forceReplace: true ---
    const forceReanalyzeRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/reanalyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ forceReplace: true }),
    });
    const forceReanalyzeData = await forceReanalyzeRes.json();

    assert(
      forceReanalyzeRes.status === 200 &&
      forceReanalyzeData.data?.clothingItem?.material === 'Denim' && // Overwritten with AI prediction
      forceReanalyzeData.data?.manuallyEditedFields.length === 0, // Cleared
      '10. POST /reanalyze with forceReplace: true overwrites manual edits and resets override list'
    );

    // --- TEST 11: Test Unauthenticated Request ---
    const unauthRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analyze`, {
      method: 'POST',
    });
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 &&
      unauthData.message.includes('No token provided'),
      '11. Unauthenticated request to /analyze is rejected with HTTP 401'
    );

    // --- TEST 12: Test AI service unavailable error when mockFallback is disabled ---
    const originalFallback = aiConfig.mockFallback;
    const originalUrl = aiConfig.serviceUrl;
    aiConfig.mockFallback = false; // Disable mock fallback to test real offline handling
    aiConfig.serviceUrl = 'http://127.0.0.1:8999'; // Test against closed port

    const unavailableRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unavailableData = await unavailableRes.json();

    assert(
      unavailableRes.status === 503 &&
      unavailableData.success === false &&
      unavailableData.message.includes('unavailable'),
      '12. AI service unavailable returns HTTP 503 when mock fallback is disabled'
    );

    aiConfig.mockFallback = originalFallback; // Restore fallback
    aiConfig.serviceUrl = originalUrl;

    // --- TEST 13: Test normalizeAiPrediction with invalid data and confidence bounds ---
    const normalized = normalizeAiPrediction({
      category: 'shirt',
      confidence: 1.5, // Should clamp to 1.0
      season: ['Summer', ''],
    });

    assert(
      normalized.category === 'Shirt' &&
      normalized.confidence === 1.0 &&
      normalized.season.length === 1,
      '13. normalizeAiPrediction correctly maps category enum, clamps confidence to 1.0, and strips empty entries'
    );

  } catch (error) {
    console.error('[AI Recognition Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Removing temporary test records and files...');
    if (testClothingItem?._id) {
      await ClothingItem.findByIdAndDelete(testClothingItem._id);
    }
    if (userA?._id) {
      await User.findByIdAndDelete(userA._id);
    }
    if (userB?._id) {
      await User.findByIdAndDelete(userB._id);
    }

    if (uploadedFilename) {
      const p = path.resolve('uploads', 'clothing', uploadedFilename);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }

    if (runningServer) {
      runningServer.close();
    }
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected test connection');
    console.log(`\n=== AI Recognition Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runAiRecognitionTests();
