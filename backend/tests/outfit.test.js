process.env.NODE_ENV = 'test';
process.env.PORT = '5009';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import Outfit from '../models/Outfit.js';
import generateToken from '../utils/generateToken.js';

const runOutfitTests = async () => {
  console.log('=== WardrobeWise Phase 7: Outfit Management API Tests ===\n');
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

  const TEST_PORT = 5009;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  const userAClothingIds = [];
  const userBClothingIds = [];
  const createdOutfitIds = [];

  try {
    // 1. Start server on dedicated port
    runningServer = await startServer(TEST_PORT);

    // 2. Create two distinct users for multi-tenant and IDOR isolation tests
    userA = await User.create({
      name: 'Outfit Designer A',
      email: `outfit.user.a.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'Outfit Designer B',
      email: `outfit.user.b.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenB = generateToken(userB._id);

    // 3. Create test clothing items for User A (4 items)
    const itemsA = await ClothingItem.insertMany([
      {
        userId: userA._id,
        name: 'Denim Jacket',
        category: 'Jacket',
        color: 'Blue',
        season: ['Winter', 'Autumn'],
        occasion: ['Casual', 'College'],
      },
      {
        userId: userA._id,
        name: 'White Crewneck T-Shirt',
        category: 'T-Shirt',
        color: 'White',
        season: ['Summer', 'All Season'],
        occasion: ['Casual', 'College'],
      },
      {
        userId: userA._id,
        name: 'Black Chino Pants',
        category: 'Trousers',
        color: 'Black',
        season: ['All Season'],
        occasion: ['Casual', 'Formal', 'College'],
      },
      {
        userId: userA._id,
        name: 'Canvas Sneakers',
        category: 'Shoes',
        color: 'White',
        season: ['Summer', 'Spring'],
        occasion: ['Casual', 'College'],
      },
    ]);
    userAClothingIds.push(...itemsA.map((i) => i._id.toString()));

    // 4. Create a test clothing item for User B
    const itemB = await ClothingItem.create({
      userId: userB._id,
      name: 'User B Velvet Blazer',
      category: 'Jacket',
      color: 'Emerald',
      season: ['Winter'],
      occasion: ['Party'],
    });
    userBClothingIds.push(itemB._id.toString());

    // ==========================================
    // TEST 1: Create Outfit with 3 clothing items (Valid)
    // ==========================================
    const createRes1 = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Casual College Look',
        clothingItems: [userAClothingIds[0], userAClothingIds[1], userAClothingIds[2]],
        occasion: 'College',
        season: 'Winter',
        description: 'Comfortable everyday winter college look',
        previewImage: 'https://example.com/outfit-preview-1.jpg',
        isFavorite: false,
      }),
    });
    const createData1 = await createRes1.json();

    assert(
      createRes1.status === 201 &&
      createData1.success === true &&
      createData1.data?.outfit?.name === 'Casual College Look' &&
      Array.isArray(createData1.data.outfit.clothingItems) &&
      createData1.data.outfit.clothingItems.length === 3 &&
      createData1.data.outfit.clothingItems[0].name !== undefined && // Populated check
      createData1.data.outfit.userId.toString() === userA._id.toString(),
      '1. Create outfit with three clothing items returns 201 with populated items'
    );
    const outfit1Id = createData1.data?.outfit?._id;
    if (outfit1Id) createdOutfitIds.push(outfit1Id);

    // ==========================================
    // TEST 2: Create outfit without name (Rejected)
    // ==========================================
    const noNameRes = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        clothingItems: [userAClothingIds[0]],
      }),
    });
    const noNameData = await noNameRes.json();
    assert(
      noNameRes.status === 400 &&
      noNameData.success === false &&
      noNameData.message.includes('Outfit name is required'),
      '2. Create outfit without name is rejected with HTTP 400'
    );

    // ==========================================
    // TEST 3: Create outfit without clothing items (Rejected)
    // ==========================================
    const noItemsRes = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Empty Outfit',
        clothingItems: [],
      }),
    });
    const noItemsData = await noItemsRes.json();
    assert(
      noItemsRes.status === 400 &&
      noItemsData.success === false &&
      noItemsData.message.includes('at least one clothing item'),
      '3. Create outfit without clothing items is rejected with HTTP 400'
    );

    // ==========================================
    // TEST 4: Create outfit with invalid clothing item ID (Rejected)
    // ==========================================
    const invalidItemRes = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Invalid Item Outfit',
        clothingItems: ['not-a-valid-object-id'],
      }),
    });
    const invalidItemData = await invalidItemRes.json();
    assert(
      invalidItemRes.status === 400 &&
      invalidItemData.success === false &&
      invalidItemData.message.includes('Invalid clothing item ID format'),
      '4. Create outfit with invalid clothing item ID is rejected with HTTP 400'
    );

    // ==========================================
    // TEST 5: Try creating outfit with another user's clothing item (IDOR Protection)
    // ==========================================
    const foreignItemRes = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Stolen Clothing Outfit',
        clothingItems: [userAClothingIds[0], userBClothingIds[0]],
      }),
    });
    const foreignItemData = await foreignItemRes.json();
    assert(
      foreignItemRes.status === 400 &&
      foreignItemData.success === false &&
      foreignItemData.message.includes('do not exist or do not belong to you'),
      "5. Creating outfit with another user's clothing item is rejected with HTTP 400"
    );

    // Also test duplicate IDs rejection
    const duplicateItemsRes = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Duplicate Items Outfit',
        clothingItems: [userAClothingIds[0], userAClothingIds[0]],
      }),
    });
    const dupData = await duplicateItemsRes.json();
    assert(
      duplicateItemsRes.status === 400 &&
      dupData.message.includes('Duplicate clothing items are not allowed'),
      '5b. Creating outfit with duplicate clothing item IDs is rejected with HTTP 400'
    );

    // Create a 2nd outfit for User A to test pagination, filtering, and search
    const createRes2 = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Formal Evening Party Suit',
        clothingItems: [userAClothingIds[2]],
        occasion: 'Party',
        season: 'Summer',
        description: 'Sharp evening styling',
        isFavorite: true,
      }),
    });
    const createData2 = await createRes2.json();
    if (createData2.data?.outfit?._id) createdOutfitIds.push(createData2.data.outfit._id);

    // Create an outfit for User B to verify user isolation in list
    const createResB = await fetch(`${baseUrl}/api/outfits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        name: 'User B Velvet Night',
        clothingItems: [userBClothingIds[0]],
        occasion: 'Party',
        season: 'Winter',
      }),
    });
    const createDataB = await createResB.json();
    if (createDataB.data?.outfit?._id) createdOutfitIds.push(createDataB.data.outfit._id);

    // ==========================================
    // TEST 6: Get all outfits (User isolation & pagination metadata)
    // ==========================================
    const getAllRes = await fetch(`${baseUrl}/api/outfits?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getAllData = await getAllRes.json();
    assert(
      getAllRes.status === 200 &&
      getAllData.success === true &&
      Array.isArray(getAllData.data) &&
      getAllData.data.length === 2 &&
      getAllData.pagination?.totalItems === 2 &&
      getAllData.pagination?.currentPage === 1 &&
      getAllData.data.every((o) => o.userId.toString() === userA._id.toString()),
      "6. Get all outfits returns only authenticated user's outfits with pagination metadata"
    );

    // ==========================================
    // TEST 7: Filter outfits by occasion
    // ==========================================
    const filterOccasionRes = await fetch(`${baseUrl}/api/outfits?occasion=College`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const filterOccasionData = await filterOccasionRes.json();
    assert(
      filterOccasionRes.status === 200 &&
      filterOccasionData.data.length === 1 &&
      filterOccasionData.data[0].occasion === 'College',
      '7. Filter outfits by occasion=College returns matching outfits'
    );

    // ==========================================
    // TEST 8: Filter outfits by season
    // ==========================================
    const filterSeasonRes = await fetch(`${baseUrl}/api/outfits?season=Winter`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const filterSeasonData = await filterSeasonRes.json();
    assert(
      filterSeasonRes.status === 200 &&
      filterSeasonData.data.length === 1 &&
      filterSeasonData.data[0].season === 'Winter',
      '8. Filter outfits by season=Winter returns matching outfits'
    );

    // ==========================================
    // TEST 9: Search by outfit name
    // ==========================================
    const searchRes = await fetch(`${baseUrl}/api/outfits?search=Casual`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
      searchData.data.length === 1 &&
      searchData.data[0].name.includes('Casual'),
      '9. Search outfits by name ?search=Casual returns matched outfit'
    );

    // Filter by isFavorite
    const favFilterRes = await fetch(`${baseUrl}/api/outfits?isFavorite=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const favFilterData = await favFilterRes.json();
    assert(
      favFilterRes.status === 200 &&
      favFilterData.data.length === 1 &&
      favFilterData.data[0].isFavorite === true,
      '9b. Filter outfits by ?isFavorite=true returns only favorite outfits'
    );

    // ==========================================
    // TEST 10: Get individual outfit by ID
    // ==========================================
    const getSingleRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getSingleData = await getSingleRes.json();
    assert(
      getSingleRes.status === 200 &&
      getSingleData.success === true &&
      getSingleData.data?.outfit?._id === outfit1Id &&
      getSingleData.data.outfit.clothingItems.length === 3 &&
      getSingleData.data.outfit.clothingItems[0].name === 'Denim Jacket',
      '10. Get individual outfit by ID returns populated clothing items'
    );

    // ==========================================
    // TEST 11: Update outfit name and description
    // ==========================================
    const updateRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Updated Casual Streetwear Look',
        description: 'New updated stylish winter wear',
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 &&
      updateData.success === true &&
      updateData.data?.outfit?.name === 'Updated Casual Streetwear Look' &&
      updateData.data?.outfit?.description === 'New updated stylish winter wear' &&
      updateData.data?.outfit?.occasion === 'College', // Preserved unsupplied fields
      '11. Update outfit modifies specified fields and preserves unsupplied fields'
    );

    // ==========================================
    // TEST 12: Add a clothing item via PATCH /items
    // ==========================================
    const addItemRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'add',
        clothingItemIds: [userAClothingIds[3]], // 4th item: Canvas Sneakers
      }),
    });
    const addItemData = await addItemRes.json();
    assert(
      addItemRes.status === 200 &&
      addItemData.success === true &&
      addItemData.data?.outfit?.clothingItems.length === 4 &&
      addItemData.data.outfit.clothingItems.some((i) => i._id.toString() === userAClothingIds[3]),
      '12. Add clothing item via PATCH /items appends item to outfit'
    );

    // Trying to add the same item again should be rejected
    const addDupItemRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'add',
        clothingItemIds: [userAClothingIds[3]],
      }),
    });
    const addDupItemData = await addDupItemRes.json();
    assert(
      addDupItemRes.status === 400 &&
      addDupItemData.message.includes('already in this outfit'),
      '12b. Adding an already existing clothing item is rejected with HTTP 400'
    );

    // ==========================================
    // TEST 13: Remove a clothing item via PATCH /items
    // ==========================================
    const removeItemRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'remove',
        clothingItemIds: [userAClothingIds[3]],
      }),
    });
    const removeItemData = await removeItemRes.json();
    assert(
      removeItemRes.status === 200 &&
      removeItemData.success === true &&
      removeItemData.data?.outfit?.clothingItems.length === 3 &&
      !removeItemData.data.outfit.clothingItems.some((i) => i._id.toString() === userAClothingIds[3]),
      '13. Remove clothing item via PATCH /items removes item from outfit'
    );

    // Test preventing outfit from becoming empty
    const removeAllItemsRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/items`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        action: 'remove',
        clothingItemIds: [userAClothingIds[0], userAClothingIds[1], userAClothingIds[2]],
      }),
    });
    const removeAllData = await removeAllItemsRes.json();
    assert(
      removeAllItemsRes.status === 400 &&
      removeAllData.message.includes('Cannot remove all items'),
      '13b. Removing all clothing items is rejected to prevent empty outfit'
    );

    // ==========================================
    // TEST 14: Toggle favourite status
    // ==========================================
    // Outfit 1 is currently isFavorite: false
    const favToggleRes1 = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/favorite`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const favToggleData1 = await favToggleRes1.json();
    assert(
      favToggleRes1.status === 200 &&
      favToggleData1.data?.outfit?.isFavorite === true,
      '14. Toggle favourite flips status from false to true'
    );

    const favToggleRes2 = await fetch(`${baseUrl}/api/outfits/${outfit1Id}/favorite`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const favToggleData2 = await favToggleRes2.json();
    assert(
      favToggleRes2.status === 200 &&
      favToggleData2.data?.outfit?.isFavorite === false,
      '14b. Second toggle flips favourite status back from true to false'
    );

    // ==========================================
    // TEST 15: Delete outfit and verify clothing items still exist
    // ==========================================
    const deleteRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 &&
      deleteData.success === true &&
      deleteData.message.includes('deleted successfully'),
      '15. Delete outfit succeeds with HTTP 200'
    );

    // Verify outfit no longer exists
    const checkDeletedRes = await fetch(`${baseUrl}/api/outfits/${outfit1Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      checkDeletedRes.status === 404,
      '    Deleted outfit returns 404 on subsequent retrieval'
    );

    // CRITICAL: Verify clothing items referenced by outfit were NOT deleted!
    const survivingItems = await ClothingItem.find({
      _id: { $in: [userAClothingIds[0], userAClothingIds[1], userAClothingIds[2]] },
    });
    assert(
      survivingItems.length === 3,
      '    Referenced clothing items were NOT deleted when outfit was deleted'
    );

    // ==========================================
    // TEST 16: Try accessing another user's outfit (IDOR Protection)
    // ==========================================
    const userBOutfitId = createDataB.data?.outfit?._id;

    // User A trying to get User B's outfit
    const idorGetRes = await fetch(`${baseUrl}/api/outfits/${userBOutfitId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      idorGetRes.status === 404,
      "16a. Accessing another user's outfit returns HTTP 404 (IDOR protected)"
    );

    // User A trying to update User B's outfit
    const idorPutRes = await fetch(`${baseUrl}/api/outfits/${userBOutfitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: 'Hacked Outfit Name' }),
    });
    assert(
      idorPutRes.status === 404,
      "16b. Updating another user's outfit returns HTTP 404 (IDOR protected)"
    );

    // User A trying to delete User B's outfit
    const idorDeleteRes = await fetch(`${baseUrl}/api/outfits/${userBOutfitId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      idorDeleteRes.status === 404,
      "16c. Deleting another user's outfit returns HTTP 404 (IDOR protected)"
    );

    // ==========================================
    // TEST 17: Test unauthenticated requests
    // ==========================================
    const unauthGetRes = await fetch(`${baseUrl}/api/outfits`);
    assert(
      unauthGetRes.status === 401,
      '17. Unauthenticated request without JWT token is rejected with HTTP 401'
    );

  } catch (error) {
    console.error('[Outfit Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Cleaning up test outfits, clothes, and users...');
    if (createdOutfitIds.length > 0) {
      await Outfit.deleteMany({ _id: { $in: createdOutfitIds } });
    }
    if (userAClothingIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: userAClothingIds } });
    }
    if (userBClothingIds.length > 0) {
      await ClothingItem.deleteMany({ _id: { $in: userBClothingIds } });
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
    console.log(`\n=== Outfit Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runOutfitTests();
