import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { User, ClothingItem, Outfit, OutfitHistory } from '../models/index.js';

dotenv.config();

const runModelTests = async () => {
  console.log('--- Starting WardrobeWise Model Validation Tests ---');
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`[PASS] ${description}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${description}`);
      failedCount++;
    }
  };

  const testUserEmail = `test.user.${Date.now()}@example.com`;
  let createdUserId = null;
  let createdClothingIds = [];
  let createdOutfitId = null;
  let createdHistoryId = null;

  try {
    await connectDB();
    // Ensure all unique and compound indexes are active in MongoDB
    await User.init();
    await ClothingItem.init();
    await Outfit.init();
    await OutfitHistory.init();

    // 1. Test Valid User Creation & Validation
    const validUser = new User({
      name: 'Fashion Tester',
      email: testUserEmail,
      password: 'hashed_secure_password_123',
      gender: 'prefer_not_to_say',
      preferences: {
        favoriteColors: ['Navy', 'Burgundy'],
        preferredStyles: ['Minimalist', 'Smart Casual'],
        preferredOccasions: ['Work', 'Conference'],
      },
    });

    const userValidationErr = validUser.validateSync();
    assert(!userValidationErr, 'User model accepts valid user data without errors');

    const savedUser = await validUser.save();
    createdUserId = savedUser._id;
    assert(Boolean(createdUserId), 'User document saved successfully to MongoDB');

    // 2. Test Duplicate Email Rejection
    let duplicateRejected = false;
    try {
      const duplicateUser = new User({
        name: 'Another User',
        email: testUserEmail, // Identical email
        password: 'password_xyz',
      });
      await duplicateUser.save();
    } catch (err) {
      duplicateRejected = err.code === 11000 || err.name === 'MongoServerError';
    }
    assert(duplicateRejected, 'MongoDB rejects duplicate user email (E11000)');

    // 3. Test ClothingItem Required Fields Validation
    const emptyItem = new ClothingItem({});
    const emptyItemValidationErr = emptyItem.validateSync();
    assert(
      Boolean(emptyItemValidationErr?.errors?.userId) &&
      Boolean(emptyItemValidationErr?.errors?.name) &&
      Boolean(emptyItemValidationErr?.errors?.category),
      'ClothingItem requires userId, name, and category'
    );

    // 4. Test Invalid Clothing Category Rejection
    const invalidCategoryItem = new ClothingItem({
      userId: createdUserId,
      name: 'Spacesuit Helmet',
      category: 'AstronautGear', // Unsupported category
      imageUrl: 'https://example.com/item.jpg',
    });
    const invalidCatErr = invalidCategoryItem.validateSync();
    assert(
      Boolean(invalidCatErr?.errors?.category),
      'ClothingItem rejects invalid clothing category via enum validation'
    );

    // 5. Test Valid Clothing Items Creation
    const shirtItem = await ClothingItem.create({
      userId: createdUserId,
      name: 'Classic White Oxford Shirt',
      category: 'Shirt',
      subCategory: 'Button-down',
      color: 'White',
      secondaryColors: ['Pearl'],
      material: '100% Cotton',
      pattern: 'Solid',
      season: ['Spring', 'Summer', 'Autumn', 'Winter'],
      occasion: ['Work', 'Formal', 'Casual'],
      style: ['Classic', 'Smart Casual'],
      imageUrl: 'https://example.com/clothes/white-shirt.jpg',
      aiAnalyzed: true,
      aiAnalysis: {
        category: 'Shirt',
        color: 'White',
        pattern: 'Solid',
        material: 'Cotton',
        confidence: 0.98,
      },
    });
    createdClothingIds.push(shirtItem._id);

    const jeansItem = await ClothingItem.create({
      userId: createdUserId,
      name: 'Slim Fit Dark Wash Jeans',
      category: 'Jeans',
      color: 'Dark Indigo',
      material: 'Denim',
      imageUrl: 'https://example.com/clothes/dark-jeans.jpg',
    });
    createdClothingIds.push(jeansItem._id);

    assert(createdClothingIds.length === 2, 'Valid ClothingItems successfully created');

    // 6. Test Outfit Referencing Multiple ClothingItems
    const newOutfit = await Outfit.create({
      userId: createdUserId,
      name: 'Smart Casual Friday',
      clothingItems: createdClothingIds,
      occasion: 'Work',
      season: 'All-Season',
      description: 'Clean Oxford shirt paired with dark wash denim',
      isFavorite: true,
    });
    createdOutfitId = newOutfit._id;

    const populatedOutfit = await Outfit.findById(createdOutfitId).populate('clothingItems');
    assert(
      populatedOutfit.clothingItems.length === 2 &&
      populatedOutfit.clothingItems[0].name === 'Classic White Oxford Shirt',
      'Outfit successfully references and populates multiple ClothingItems via ObjectIds'
    );

    // 7. Test OutfitHistory Rating Validation
    // Valid Rating (5)
    const validHistory = await OutfitHistory.create({
      userId: createdUserId,
      outfitId: createdOutfitId,
      clothingItems: createdClothingIds,
      wornDate: new Date(),
      rating: 5,
      notes: 'Received compliments during the team presentation',
    });
    createdHistoryId = validHistory._id;
    assert(validHistory.rating === 5, 'OutfitHistory accepts valid rating (1-5 range)');

    // Invalid Rating (> 5)
    const highRatingHistory = new OutfitHistory({
      userId: createdUserId,
      clothingItems: createdClothingIds,
      rating: 7, // Invalid
    });
    const highRatingErr = highRatingHistory.validateSync();
    assert(
      Boolean(highRatingErr?.errors?.rating),
      'OutfitHistory rejects rating greater than 5'
    );

    // Invalid Rating (< 1)
    const lowRatingHistory = new OutfitHistory({
      userId: createdUserId,
      clothingItems: createdClothingIds,
      rating: 0, // Invalid
    });
    const lowRatingErr = lowRatingHistory.validateSync();
    assert(
      Boolean(lowRatingErr?.errors?.rating),
      'OutfitHistory rejects rating less than 1'
    );

  } catch (error) {
    console.error('[Error during test execution]:', error);
    failedCount++;
  } finally {
    // 8. Strict Cleanup - Remove all test data so the database remains clean
    console.log('[Cleanup] Removing temporary test records...');
    if (createdHistoryId) await OutfitHistory.findByIdAndDelete(createdHistoryId);
    if (createdOutfitId) await Outfit.findByIdAndDelete(createdOutfitId);
    for (const id of createdClothingIds) {
      await ClothingItem.findByIdAndDelete(id);
    }
    if (createdUserId) await User.findByIdAndDelete(createdUserId);

    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected from MongoDB');
    console.log(`\n--- Test Summary: ${passedCount} Passed, ${failedCount} Failed ---`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
};

runModelTests();
