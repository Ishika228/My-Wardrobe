process.env.NODE_ENV = 'test';
process.env.PORT = '5011';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import Outfit from '../models/Outfit.js';
import generateToken from '../utils/generateToken.js';

const runSecurityTests = async () => {
  console.log('=== WardrobeWise Phase 9: Security, Integration & Health Tests ===\n');
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

  const TEST_PORT = 5011;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  const createdItemIds = [];
  const createdOutfitIds = [];

  try {
    // 1. Start server on dedicated test port
    runningServer = await startServer(TEST_PORT);

    // 2. Create two test users
    userA = await User.create({
      name: 'Security User A',
      email: `security.user.a.${Date.now()}@example.com`,
      password: 'StrongSecretPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'Security User B',
      email: `security.user.b.${Date.now()}@example.com`,
      password: 'StrongSecretPassword123!',
    });
    tokenB = generateToken(userB._id);

    // ==========================================
    // TEST 1: Health check endpoint verification
    // ==========================================
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 &&
      healthData.success === true &&
      healthData.message === 'WardrobeWise backend is running' &&
      healthData.database === 'connected',
      '1. Health check GET /api/health reports active server and connected MongoDB'
    );

    // ==========================================
    // TEST 2: Information leakage prevention (X-Powered-By header disabled)
    // ==========================================
    const xPoweredBy = healthRes.headers.get('x-powered-by');
    assert(
      xPoweredBy === null,
      '2. Security header check: X-Powered-By is disabled to hide underlying Express framework'
    );

    // ==========================================
    // TEST 3: CORS headers for authorized origin
    // ==========================================
    const corsRes = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    assert(
      allowOrigin === 'http://localhost:5173',
      '3. CORS headers properly whitelist allowed frontend client origin'
    );

    // ==========================================
    // TEST 4: Sensitive password field exclusion in DB and API responses
    // ==========================================
    const profileRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const profileData = await profileRes.json();
    assert(
      profileRes.status === 200 &&
      profileData.data?.user?.email === userA.email &&
      profileData.data?.user?.password === undefined,
      '4. Sensitive data handling: User profile endpoint never exposes password hash'
    );

    // Verify stored password in MongoDB is properly bcrypt-hashed (not plain text)
    const rawUserDoc = await User.findById(userA._id);
    assert(
      rawUserDoc.password.startsWith('$2') &&
      rawUserDoc.password !== 'StrongSecretPassword123!',
      '4b. Database security: Password in MongoDB is securely hashed with bcrypt salt'
    );

    // ==========================================
    // TEST 5: JWT Tampering & Malformed Token Rejection
    // ==========================================
    const tamperedToken = `${tokenA.slice(0, -6)}xyz123`;
    const tamperedRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    assert(
      tamperedRes.status === 401,
      '5. JWT validation: Cryptographically tampered token is rejected with HTTP 401'
    );

    // Expired token test
    const expiredToken = jwt.sign(
      { userId: userA._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '0s' }
    );
    const expiredRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const expiredData = await expiredRes.json();
    assert(
      expiredRes.status === 401 &&
      expiredData.message.includes('expired'),
      '5b. JWT validation: Expired token is identified and rejected with HTTP 401'
    );

    // ==========================================
    // TEST 6: User profile update cannot alter email or password
    // ==========================================
    const updateProfileRes = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Updated Name Safe',
        email: 'hacked.email@example.com',
        password: 'HackedPassword999!',
      }),
    });
    const updateProfileData = await updateProfileRes.json();
    assert(
      updateProfileRes.status === 200 &&
      updateProfileData.data?.user?.name === 'Updated Name Safe' &&
      updateProfileData.data?.user?.email === userA.email, // Email unchanged
      '6. Parameter tampering protection: Updating profile ignores email and password overrides'
    );

    // ==========================================
    // TEST 7: Cross-User IDOR Protection Matrix (Clothing & Outfits)
    // ==========================================
    // Create an item for User A
    const itemA = await ClothingItem.create({
      userId: userA._id,
      name: 'User A Secret Jacket',
      category: 'Jacket',
      color: 'Navy',
    });
    createdItemIds.push(itemA._id.toString());

    // Create an outfit for User A
    const outfitA = await Outfit.create({
      userId: userA._id,
      name: "User A's Exclusive Look",
      clothingItems: [itemA._id],
    });
    createdOutfitIds.push(outfitA._id.toString());

    // User B tries to read User A's clothing item
    const idorClothingGet = await fetch(`${baseUrl}/api/clothes/${itemA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      idorClothingGet.status === 404,
      "7a. IDOR check: User B cannot view User A's clothing item (HTTP 404)"
    );

    // User B tries to update User A's clothing item
    const idorClothingPut = await fetch(`${baseUrl}/api/clothes/${itemA._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: 'Hacked Item' }),
    });
    assert(
      idorClothingPut.status === 404,
      "7b. IDOR check: User B cannot update User A's clothing item (HTTP 404)"
    );

    // User B tries to delete User A's clothing item
    const idorClothingDel = await fetch(`${baseUrl}/api/clothes/${itemA._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      idorClothingDel.status === 404,
      "7c. IDOR check: User B cannot delete User A's clothing item (HTTP 404)"
    );

    // User B tries to read User A's outfit
    const idorOutfitGet = await fetch(`${baseUrl}/api/outfits/${outfitA._id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      idorOutfitGet.status === 404,
      "7d. IDOR check: User B cannot view User A's outfit (HTTP 404)"
    );

    // User B tries to create an outfit referencing User A's item
    const idorOutfitCreate = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        name: "User B's Pirated Outfit",
        clothingItems: [itemA._id.toString()],
      }),
    });
    assert(
      idorOutfitCreate.status === 400,
      "7e. IDOR check: User B cannot create an outfit referencing User A's clothing item (HTTP 400)"
    );

    // ==========================================
    // TEST 8: Invalid Route / 404 JSON Standard Response
    // ==========================================
    const notFoundRes = await fetch(`${baseUrl}/api/unmapped-endpoint-404`);
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 &&
      notFoundData.success === false &&
      notFoundData.message.includes('Resource not found'),
      '8. Unmapped endpoint returns structured JSON 404 Not Found response'
    );

    // ==========================================
    // TEST 9: Invalid ObjectId Error Sanitization
    // ==========================================
    const malformedIdRes = await fetch(`${baseUrl}/api/clothes/not-a-valid-id`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const malformedIdData = await malformedIdRes.json();
    assert(
      malformedIdRes.status === 400 &&
      malformedIdData.success === false &&
      malformedIdData.message.includes('Invalid clothing item ID format'),
      '9. Malformed MongoDB ObjectId is caught cleanly with HTTP 400'
    );

  } catch (error) {
    console.error('[Security Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Cleaning up test records...');
    if (createdOutfitIds.length > 0) {
      await Outfit.deleteMany({ _id: { $in: createdOutfitIds } });
    }
    if (createdItemIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: createdItemIds } });
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
    console.log(`\n=== Security Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runSecurityTests();
