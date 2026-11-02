process.env.NODE_ENV = 'test';
process.env.PORT = '5006';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import generateToken from '../utils/generateToken.js';

const runClothingTests = async () => {
  console.log('=== WardrobeWise Phase 4: Digital Wardrobe CRUD & Filter Tests ===\n');
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

  const TEST_PORT = 5006;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  let createdItemId = null;
  const userAItemIds = [];

  try {
    // 1. Start server on dedicated test port
    runningServer = await startServer(TEST_PORT);

    // 2. Create two distinct test users to verify multi-tenancy and IDOR protection
    userA = await User.create({
      name: 'Wardrobe User A',
      email: `wardrobe.user.a.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'Wardrobe User B',
      email: `wardrobe.user.b.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenB = generateToken(userB._id);

    // --- TEST 1: Add Clothing Item with Valid Token ---
    const addRes = await fetch(`${baseUrl}/api/clothes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Blue Striped Shirt',
        category: 'Shirt',
        subCategory: 'Casual Shirt',
        color: 'Blue',
        secondaryColors: ['White'],
        pattern: 'Striped',
        material: 'Cotton',
        brand: 'Classic Brand',
        season: ['Summer', 'Spring'],
        occasion: ['College', 'Casual'],
        style: ['Casual'],
        imageUrl: '/uploads/blue-striped-shirt.jpg',
        isFavorite: false,
      }),
    });
    const addData = await addRes.json();

    assert(
      addRes.status === 201 &&
      addData.success === true &&
      addData.data?.clothingItem?.name === 'Blue Striped Shirt' &&
      addData.data.clothingItem.userId.toString() === userA._id.toString(),
      '1. Add clothing with valid token creates item assigned to authenticated user (201)'
    );

    createdItemId = addData.data?.clothingItem?._id;
    userAItemIds.push(createdItemId);

    // --- TEST 2: Add Clothing Item Without Token ---
    const noTokenRes = await fetch(`${baseUrl}/api/clothes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthenticated Shirt',
        category: 'Shirt',
        imageUrl: '/uploads/shirt.jpg',
      }),
    });
    const noTokenData = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 &&
      noTokenData.success === false &&
      noTokenData.message.includes('No token provided'),
      '2. Add clothing without token is rejected with HTTP 401'
    );

    // Seed additional items for User A to thoroughly test filtering, search, and pagination
    const seedItems = [
      {
        userId: userA._id,
        name: 'Black Slim Jeans',
        category: 'Jeans',
        color: 'Black',
        season: ['Autumn', 'Winter'],
        occasion: ['Casual', 'Work'],
        imageUrl: '/uploads/black-jeans.jpg',
        isFavorite: true,
      },
      {
        userId: userA._id,
        name: 'White Graphic T-Shirt',
        category: 'T-Shirt',
        color: 'White',
        season: ['Summer'],
        occasion: ['Casual', 'Sports'],
        imageUrl: '/uploads/white-tshirt.jpg',
        isFavorite: false,
      },
      {
        userId: userA._id,
        name: 'Leather Biker Jacket',
        category: 'Jacket',
        color: 'Black',
        season: ['Winter', 'Autumn'],
        occasion: ['Party', 'Casual'],
        imageUrl: '/uploads/biker-jacket.jpg',
        isFavorite: true,
      },
    ];

    for (const item of seedItems) {
      const doc = await ClothingItem.create(item);
      userAItemIds.push(doc._id);
    }

    // --- TEST 3: Get All Clothing Items for User A ---
    const getAllRes = await fetch(`${baseUrl}/api/clothes`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getAllData = await getAllRes.json();
    assert(
      getAllRes.status === 200 &&
      getAllData.success === true &&
      getAllData.data.length === 4 &&
      getAllData.pagination.totalItems === 4,
      '3. Get all clothing items returns user items with correct count (4 items)'
    );

    // --- TEST 4: Get Clothing with Category Filter ---
    const catFilterRes = await fetch(`${baseUrl}/api/clothes?category=Jeans`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const catFilterData = await catFilterRes.json();
    assert(
      catFilterRes.status === 200 &&
      catFilterData.data.length === 1 &&
      catFilterData.data[0].category === 'Jeans',
      '4. Get clothing with category filter (category=Jeans) returns 1 item'
    );

    // --- TEST 5: Get Clothing with Multiple Filters (color=Black & isFavorite=true) ---
    const multiFilterRes = await fetch(
      `${baseUrl}/api/clothes?color=Black&isFavorite=true`,
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const multiFilterData = await multiFilterRes.json();
    assert(
      multiFilterRes.status === 200 &&
      multiFilterData.data.length === 2 &&
      multiFilterData.data.every((i) => i.color === 'Black' && i.isFavorite === true),
      '5. Get clothing with multiple filters (color=Black & isFavorite=true) returns 2 items'
    );

    // --- TEST 6: Test Pagination (limit=2, page=1 and page=2) ---
    const page1Res = await fetch(`${baseUrl}/api/clothes?page=1&limit=2`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const page1Data = await page1Res.json();

    const page2Res = await fetch(`${baseUrl}/api/clothes?page=2&limit=2`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const page2Data = await page2Res.json();

    assert(
      page1Res.status === 200 &&
      page1Data.data.length === 2 &&
      page1Data.pagination.currentPage === 1 &&
      page1Data.pagination.totalPages === 2 &&
      page2Data.data.length === 2 &&
      page2Data.pagination.currentPage === 2 &&
      page1Data.data[0]._id !== page2Data.data[0]._id,
      '6. Pagination works correctly (limit=2, 2 items per page across 2 total pages)'
    );

    // --- TEST 7: Search by Clothing Name ---
    const searchRes = await fetch(`${baseUrl}/api/clothes?search=Striped`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
      searchData.data.length === 1 &&
      searchData.data[0].name.includes('Striped'),
      '7. Search by clothing name (search=Striped) finds the matching item'
    );

    // --- TEST 8: Get Single Clothing Item by ID ---
    const singleRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const singleData = await singleRes.json();
    assert(
      singleRes.status === 200 &&
      singleData.success === true &&
      singleData.data.clothingItem._id.toString() === createdItemId.toString(),
      '8. Get single clothing item returns full details of the requested item'
    );

    // --- TEST 9: Update Clothing Item ---
    const updateRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Navy Blue Striped Linen Shirt',
        material: 'Linen',
        color: 'Navy Blue',
        brand: 'Upgraded Brand',
        // Attempt to tamper with userId or _id
        userId: userB._id,
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 &&
      updateData.data.clothingItem.name === 'Navy Blue Striped Linen Shirt' &&
      updateData.data.clothingItem.material === 'Linen' &&
      updateData.data.clothingItem.userId.toString() === userA._id.toString(), // Ownership remained with User A
      '9. Update clothing item modifies attributes while preserving user ownership'
    );

    // --- TEST 10: Toggle Favorite ---
    const favRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}/favorite`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const favData = await favRes.json();
    assert(
      favRes.status === 200 &&
      favData.data.clothingItem.isFavorite === true,
      '10. Toggle favorite successfully flips isFavorite from false to true'
    );

    // --- TEST 11: Attempt to Access Another User\'s Item (IDOR Protection) ---
    // User B attempts to access User A's item
    const idorGetRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const idorGetData = await idorGetRes.json();

    const idorUpdateRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: 'Hacked by User B' }),
    });

    const idorDeleteRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert(
      idorGetRes.status === 404 &&
      idorGetData.success === false &&
      idorUpdateRes.status === 404 &&
      idorDeleteRes.status === 404,
      '11. IDOR protection prevents User B from reading, updating, or deleting User A\'s item (404 Not Found)'
    );

    // --- TEST 12: Delete Clothing Item by Owner ---
    const deleteRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 &&
      deleteData.success === true &&
      deleteData.message.includes('deleted successfully'),
      '12. Delete clothing item by owner succeeds with HTTP 200'
    );

    // Verify it is actually gone
    const verifyDeleteRes = await fetch(`${baseUrl}/api/clothes/${createdItemId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      verifyDeleteRes.status === 404,
      '    Deleted item no longer exists in database'
    );

    // --- TEST 13: Invalid ObjectId Format Rejection ---
    const invalidIdRes = await fetch(`${baseUrl}/api/clothes/invalid-mongo-id-123`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
      invalidIdData.success === false &&
      invalidIdData.message.includes('Invalid clothing item ID format'),
      '13. Invalid ObjectId format is rejected with HTTP 400'
    );

  } catch (error) {
    console.error('[Clothing Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Removing temporary test clothing items & users...');
    if (userAItemIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: userAItemIds } });
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
    console.log(`\n=== Clothing Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runClothingTests();
