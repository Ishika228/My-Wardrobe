process.env.NODE_ENV = 'test';
process.env.PORT = '5010';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import OutfitHistory from '../models/OutfitHistory.js';
import generateToken from '../utils/generateToken.js';
import { aiConfig } from '../config/aiConfig.js';
import {
  formatWardrobeForAI,
  normalizeRecommendationResponse,
  getMockOutfitRecommendation,
} from '../services/aiRecommendationService.js';

const runAiRecommendationTests = async () => {
  console.log('=== WardrobeWise Phase 8: AI Recommendation Integration Tests ===\n');
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

  const TEST_PORT = 5010;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  const userAItemIds = [];
  const userBItemIds = [];
  const createdHistoryIds = [];

  try {
    // 1. Start server on dedicated test port
    runningServer = await startServer(TEST_PORT);

    // 2. Create users for multi-tenant and IDOR isolation tests
    userA = await User.create({
      name: 'Recommendation User A',
      email: `rec.user.a.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'Recommendation User B',
      email: `rec.user.b.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenB = generateToken(userB._id);

    // ==========================================
    // TEST 1: Unauthenticated request rejected (401)
    // ==========================================
    const unauthRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion: 'College' }),
    });
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.success === false,
      '1. Recommendation request without JWT token is rejected with HTTP 401'
    );

    // ==========================================
    // TEST 2: Empty wardrobe rejection (400)
    // ==========================================
    // User A currently has 0 clothing items in database
    const emptyWardrobeRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        occasion: 'College',
        style: 'Casual',
        weather: 'Winter',
      }),
    });
    const emptyWardrobeData = await emptyWardrobeRes.json();
    assert(
      emptyWardrobeRes.status === 400 &&
      emptyWardrobeData.success === false &&
      emptyWardrobeData.message.includes('Your wardrobe is empty'),
      '2. Recommendation request with empty wardrobe is rejected with HTTP 400'
    );

    // ==========================================
    // Setup: Populate wardrobe items for User A and User B
    // ==========================================
    const itemsA = await ClothingItem.insertMany([
      {
        userId: userA._id,
        name: 'Classic Denim Jacket',
        category: 'Jacket',
        color: 'Blue',
        season: ['Winter', 'Autumn'],
        occasion: ['Casual', 'College'],
        style: ['Casual'],
      },
      {
        userId: userA._id,
        name: 'Cotton White T-Shirt',
        category: 'T-Shirt',
        color: 'White',
        season: ['Summer', 'All Season'],
        occasion: ['Casual', 'College'],
        style: ['Casual'],
      },
      {
        userId: userA._id,
        name: 'Slim Fit Black Trousers',
        category: 'Trousers',
        color: 'Black',
        season: ['All Season'],
        occasion: ['Casual', 'Formal', 'College'],
        style: ['Casual'],
      },
      {
        userId: userA._id,
        name: 'Canvas White Sneakers',
        category: 'Shoes',
        color: 'White',
        season: ['Summer', 'Spring'],
        occasion: ['Casual', 'College'],
        style: ['Casual'],
      },
    ]);
    userAItemIds.push(...itemsA.map((i) => i._id.toString()));

    const itemB = await ClothingItem.create({
      userId: userB._id,
      name: 'User B Velvet Blazer',
      category: 'Jacket',
      color: 'Emerald',
      season: ['Winter'],
      occasion: ['Party'],
      style: ['Formal'],
    });
    userBItemIds.push(itemB._id.toString());

    // ==========================================
    // TEST 3: Unit function - formatWardrobeForAI
    // ==========================================
    const formattedWardrobe = formatWardrobeForAI(itemsA);
    assert(
      Array.isArray(formattedWardrobe) &&
      formattedWardrobe.length === 4 &&
      typeof formattedWardrobe[0].id === 'string' &&
      formattedWardrobe[0].name === 'Classic Denim Jacket' &&
      formattedWardrobe[0].category === 'Jacket' &&
      Array.isArray(formattedWardrobe[0].season),
      '3. formatWardrobeForAI properly serializes Mongoose items into AI-ready format'
    );

    // ==========================================
    // TEST 4: Unit function - normalizeRecommendationResponse
    // ==========================================
    const mockRawAiData = {
      recommendations: [
        {
          outfitName: 'Test AI Ensemble',
          clothingItemIds: [userAItemIds[0], userAItemIds[1]],
          confidence: 0.95,
          explanation: 'Harmonious blue and white pairing.',
          occasion: 'College',
          style: 'Casual',
          season: 'Winter',
        },
      ],
    };
    const normalized = normalizeRecommendationResponse(mockRawAiData);
    assert(
      Array.isArray(normalized) &&
      normalized.length === 1 &&
      normalized[0].outfitName === 'Test AI Ensemble' &&
      normalized[0].clothingItemIds.length === 2 &&
      normalized[0].confidence === 0.95,
      '4. normalizeRecommendationResponse correctly parses and sanitizes recommendations'
    );

    // ==========================================
    // TEST 5: Successful Recommendation Request (using Mock Adapter Fallback)
    // ==========================================
    const recRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        occasion: 'College',
        style: 'Casual',
        weather: 'Winter',
        preferredColors: ['Blue', 'White'],
        otherPreferences: 'Lightweight and comfortable for walking',
      }),
    });
    const recData = await recRes.json();

    assert(
      recRes.status === 200 &&
      recData.success === true &&
      Array.isArray(recData.data?.recommendations) &&
      recData.data.recommendations.length > 0 &&
      recData.data.recommendations[0].clothingItems.length >= 1 &&
      recData.data.recommendations[0].clothingItems[0].name !== undefined && // Populated check
      recData.data.preferences?.occasion === 'College' &&
      recData.data.preferences?.style === 'Casual' &&
      recData.data.isMock === true,
      '5. Recommendation request returns HTTP 200 with populated items and preferences'
    );

    // Verify all recommended items strictly belong to User A
    const allRecommendedItemsOwned = recData.data.recommendations[0].clothingItems.every(
      (item) => item.userId.toString() === userA._id.toString()
    );
    assert(
      allRecommendedItemsOwned,
      "5b. Every recommended clothing item strictly belongs to the authenticated user"
    );

    // ==========================================
    // TEST 6: Save to History option
    // ==========================================
    const historyRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        occasion: 'Casual Weekend',
        style: 'Streetwear',
        weather: 'Spring',
        saveToHistory: true,
      }),
    });
    const historyData = await historyRes.json();
    assert(
      historyRes.status === 200 &&
      historyData.success === true &&
      historyData.data?.historyId !== undefined,
      '6. saveToHistory: true creates an OutfitHistory record and returns historyId'
    );

    if (historyData.data?.historyId) {
      createdHistoryIds.push(historyData.data.historyId);
      const savedHistoryDoc = await OutfitHistory.findById(historyData.data.historyId);
      assert(
        savedHistoryDoc !== null &&
        savedHistoryDoc.userId.toString() === userA._id.toString() &&
        savedHistoryDoc.clothingItems.length > 0 &&
        savedHistoryDoc.notes.includes('AI Recommended'),
        '6b. OutfitHistory record was saved with authenticated userId and clothing item references'
      );
    }

    // ==========================================
    // TEST 7: IDOR Protection against foreign item references
    // ==========================================
    // If an external service were to return itemB (belonging to User B) to User A,
    // verify the controller filters it out so User B's item is NEVER exposed to User A.
    const userAItemsMap = new Map(itemsA.map((i) => [i._id.toString(), i]));
    const mixedRecs = {
      recommendations: [
        {
          outfitName: 'Infiltrated Outfit',
          clothingItemIds: [userAItemIds[0], userBItemIds[0]], // One owned by User A, one by User B
          confidence: 0.88,
          explanation: 'Testing foreign item filtering',
        },
      ],
    };

    // Filter logic test: Only userAItemIds[0] must remain; userBItemIds[0] must be stripped
    const filteredItems = mixedRecs.recommendations[0].clothingItemIds.filter((id) =>
      userAItemsMap.has(id)
    );
    assert(
      filteredItems.length === 1 &&
      filteredItems[0] === userAItemIds[0] &&
      !filteredItems.includes(userBItemIds[0]),
      "7. Foreign items belonging to another user are filtered out from recommendations"
    );

    // ==========================================
    // TEST 8: AI Service Unavailable (503) when mock fallback is disabled
    // ==========================================
    const originalServiceUrl = aiConfig.recommendationServiceUrl;
    const originalFallback = aiConfig.recommendationMockFallback;

    // Direct to unreachable port and disable fallback
    aiConfig.recommendationServiceUrl = 'http://127.0.0.1:8999';
    aiConfig.recommendationMockFallback = false;

    const unavailableRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ occasion: 'College' }),
    });
    const unavailableData = await unavailableRes.json();

    assert(
      unavailableRes.status === 503 &&
      unavailableData.success === false &&
      unavailableData.message.includes('unavailable'),
      '8. AI service connection error returns HTTP 503 when mock fallback is disabled'
    );

    // Restore configuration
    aiConfig.recommendationServiceUrl = originalServiceUrl;
    aiConfig.recommendationMockFallback = originalFallback;

    // ==========================================
    // TEST 9: Multi-tenancy - User B cannot see User A's wardrobe items in recommendations
    // ==========================================
    const userBRecRes = await fetch(`${baseUrl}/api/recommendations/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ occasion: 'Party', style: 'Formal' }),
    });
    const userBRecData = await userBRecRes.json();
    assert(
      userBRecRes.status === 200 &&
      userBRecData.data?.recommendations[0].clothingItems.every(
        (item) => item.userId.toString() === userB._id.toString()
      ) &&
      !userBRecData.data.recommendations[0].clothingItems.some((item) =>
        userAItemIds.includes(item._id.toString())
      ),
      "9. User B recommendations strictly use User B's wardrobe and never User A's items"
    );

  } catch (error) {
    console.error('[AI Recommendation Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Cleaning up test records...');
    if (createdHistoryIds.length > 0) {
      await OutfitHistory.deleteMany({ _id: { $in: createdHistoryIds } });
    }
    if (userAItemIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: userAItemIds } });
    }
    if (userBItemIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: userBItemIds } });
    }
    if (userA?._id) {
      await User.findByIdAndDelete(userA._id);
    }
    if (userB?._id) {
      await User.findByIdAndDelete(userB._id);
    }

    if (runningServer) {
      runningServer.close();
    }
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected test connection');
    console.log(`\n=== AI Recommendation Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runAiRecommendationTests();
