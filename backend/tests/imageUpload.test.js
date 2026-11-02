process.env.NODE_ENV = 'test';
process.env.PORT = '5007';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { startServer } from '../server.js';
import User from '../models/User.js';
import ClothingItem from '../models/ClothingItem.js';
import generateToken from '../utils/generateToken.js';

const runImageUploadTests = async () => {
  console.log('=== WardrobeWise Phase 5: Image Upload & Local Storage Tests ===\n');
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

  const TEST_PORT = 5007;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let userA = null;
  let userB = null;
  let tokenA = null;
  let tokenB = null;

  let testClothingItem = null;
  let uploadedFilenamesToTrack = [];

  try {
    // 1. Start server for test suite
    runningServer = await startServer(TEST_PORT);

    // 2. Create users
    userA = await User.create({
      name: 'Uploader User A',
      email: `uploader.a.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenA = generateToken(userA._id);

    userB = await User.create({
      name: 'Uploader User B',
      email: `uploader.b.${Date.now()}@example.com`,
      password: 'StrongPassword123!',
    });
    tokenB = generateToken(userB._id);

    // 3. Create a clothing item without an image (validating optional imageUrl support)
    testClothingItem = await ClothingItem.create({
      userId: userA._id,
      name: 'Vintage Denim Jacket',
      category: 'Jacket',
      color: 'Denim Blue',
    });
    assert(testClothingItem && testClothingItem.imageUrl === null, '0. Item created without image (imageUrl defaults to null)');

    // Helper to create dummy file buffer
    const createDummyBuffer = (sizeInBytes) => Buffer.alloc(sizeInBytes, 'a');

    // --- TEST 1: Upload a JPG image ---
    const jpgFormData = new FormData();
    jpgFormData.append('image', new Blob([createDummyBuffer(1024)], { type: 'image/jpeg' }), 'jacket.jpg');

    const uploadJpgRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: jpgFormData,
    });
    const uploadJpgData = await uploadJpgRes.json();

    const jpgFilename = uploadJpgData.data?.clothingItem?.imagePublicId;
    if (jpgFilename) uploadedFilenamesToTrack.push(jpgFilename);
    const jpgDiskPath = path.resolve('uploads', 'clothing', jpgFilename || '');

    assert(
      uploadJpgRes.status === 200 &&
      uploadJpgData.success === true &&
      uploadJpgData.data?.clothingItem?.imageUrl.startsWith('/uploads/clothing/') &&
      uploadJpgData.data?.clothingItem?.imagePublicId.endsWith('.jpg') &&
      fs.existsSync(jpgDiskPath),
      '1. Upload a JPG image saves to uploads/clothing/ and updates MongoDB document'
    );

    // --- TEST 2: Static Asset Serving ---
    const staticServeRes = await fetch(`${baseUrl}${uploadJpgData.data.clothingItem.imageUrl}`);
    assert(
      staticServeRes.status === 200 &&
      staticServeRes.headers.get('content-type')?.includes('image/jpeg'),
      '2. Uploaded image is statically accessible over HTTP via /uploads/clothing/:filename'
    );

    // --- TEST 3: Upload a PNG image (Replace Existing Image) ---
    const pngFormData = new FormData();
    pngFormData.append('image', new Blob([createDummyBuffer(2048)], { type: 'image/png' }), 'jacket.png');

    const uploadPngRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: pngFormData,
    });
    const uploadPngData = await uploadPngRes.json();

    const pngFilename = uploadPngData.data?.clothingItem?.imagePublicId;
    if (pngFilename) uploadedFilenamesToTrack.push(pngFilename);
    const pngDiskPath = path.resolve('uploads', 'clothing', pngFilename || '');

    assert(
      uploadPngRes.status === 200 &&
      uploadPngData.data?.clothingItem?.imagePublicId.endsWith('.png') &&
      fs.existsSync(pngDiskPath) &&
      !fs.existsSync(jpgDiskPath), // Old JPG was deleted from disk!
      '3. Upload a PNG replaces previous image and safely deletes old JPG from local storage'
    );

    // --- TEST 4: Upload a WEBP image (Replace PNG) ---
    const webpFormData = new FormData();
    webpFormData.append('image', new Blob([createDummyBuffer(1500)], { type: 'image/webp' }), 'jacket.webp');

    const uploadWebpRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: webpFormData,
    });
    const uploadWebpData = await uploadWebpRes.json();

    const webpFilename = uploadWebpData.data?.clothingItem?.imagePublicId;
    if (webpFilename) uploadedFilenamesToTrack.push(webpFilename);
    const webpDiskPath = path.resolve('uploads', 'clothing', webpFilename || '');

    assert(
      uploadWebpRes.status === 200 &&
      uploadWebpData.data?.clothingItem?.imagePublicId.endsWith('.webp') &&
      fs.existsSync(webpDiskPath) &&
      !fs.existsSync(pngDiskPath), // Old PNG was deleted from disk!
      '4. Upload a WEBP replaces previous image and safely deletes old PNG from local storage'
    );

    // --- TEST 5: Reject Unsupported PDF File ---
    const pdfFormData = new FormData();
    pdfFormData.append('image', new Blob([createDummyBuffer(500)], { type: 'application/pdf' }), 'document.pdf');

    const uploadPdfRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: pdfFormData,
    });
    const uploadPdfData = await uploadPdfRes.json();

    assert(
      uploadPdfRes.status === 400 &&
      uploadPdfData.success === false &&
      uploadPdfData.message.includes('Invalid file format'),
      '5. Upload an unsupported PDF file is rejected with HTTP 400'
    );

    // --- TEST 6: Reject Image Larger Than 5 MB ---
    const largeBuffer = createDummyBuffer(5.5 * 1024 * 1024); // 5.5 MB
    const largeFormData = new FormData();
    largeFormData.append('image', new Blob([largeBuffer], { type: 'image/jpeg' }), 'large.jpg');

    const uploadLargeRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: largeFormData,
    });
    const uploadLargeData = await uploadLargeRes.json();

    assert(
      uploadLargeRes.status === 400 &&
      uploadLargeData.success === false &&
      uploadLargeData.message.includes('5 MB'),
      '6. Upload an image larger than 5 MB is rejected with HTTP 400'
    );

    // --- TEST 7: Reject Upload Without Authentication ---
    const unauthFormData = new FormData();
    unauthFormData.append('image', new Blob([createDummyBuffer(500)], { type: 'image/jpeg' }), 'test.jpg');

    const unauthRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      body: unauthFormData,
    });
    const unauthData = await unauthRes.json();

    assert(
      unauthRes.status === 401 &&
      unauthData.success === false &&
      unauthData.message.includes('No token provided'),
      '7. Upload without authentication is rejected with HTTP 401'
    );

    // --- TEST 8: Reject Upload Without Selecting An Image ---
    const emptyFormData = new FormData();
    // No 'image' field attached
    emptyFormData.append('otherField', 'some text');

    const noFileRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: emptyFormData,
    });
    const noFileData = await noFileRes.json();

    assert(
      noFileRes.status === 400 &&
      noFileData.success === false,
      '8. Upload without selecting an image file is rejected with HTTP 400'
    );

    // --- TEST 9: Reject Upload to Nonexistent Clothing Item ---
    const fakeId = new mongoose.Types.ObjectId();
    const fakeIdFormData = new FormData();
    fakeIdFormData.append('image', new Blob([createDummyBuffer(500)], { type: 'image/jpeg' }), 'fake.jpg');

    const fakeIdRes = await fetch(`${baseUrl}/api/clothes/${fakeId}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: fakeIdFormData,
    });
    const fakeIdData = await fakeIdRes.json();

    assert(
      fakeIdRes.status === 404 &&
      fakeIdData.success === false &&
      fakeIdData.message.includes('not found'),
      '9. Upload to a nonexistent clothing item is rejected with HTTP 404'
    );

    // --- TEST 10: Reject Upload to Another User\'s Item (IDOR Protection) ---
    const idorFormData = new FormData();
    idorFormData.append('image', new Blob([createDummyBuffer(500)], { type: 'image/jpeg' }), 'idor.jpg');

    // User B attempts to upload to User A's item
    const idorRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: idorFormData,
    });
    const idorData = await idorRes.json();

    assert(
      idorRes.status === 404 &&
      idorData.success === false &&
      idorData.message.includes('not found'),
      '10. IDOR protection prevents User B from uploading to User A\'s item (HTTP 404)'
    );

    // --- TEST 11: Delete Clothing Image API ---
    const deleteImgRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const deleteImgData = await deleteImgRes.json();

    assert(
      deleteImgRes.status === 200 &&
      deleteImgData.success === true &&
      deleteImgData.data?.clothingItem?.imageUrl === null &&
      deleteImgData.data?.clothingItem?.imagePublicId === null &&
      !fs.existsSync(webpDiskPath), // WEBP was removed from disk!
      '11. Delete image endpoint resets DB imageUrl/imagePublicId and deletes file from disk'
    );

    // --- TEST 12: Delete Clothing Item Cleans Up Image ---
    // Upload fresh image first
    const freshFormData = new FormData();
    freshFormData.append('image', new Blob([createDummyBuffer(1000)], { type: 'image/jpeg' }), 'cleanup.jpg');

    const freshUploadRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: freshFormData,
    });
    const freshUploadData = await freshUploadRes.json();
    const freshFilename = freshUploadData.data?.clothingItem?.imagePublicId;
    if (freshFilename) uploadedFilenamesToTrack.push(freshFilename);
    const freshDiskPath = path.resolve('uploads', 'clothing', freshFilename || '');
    assert(fs.existsSync(freshDiskPath), '    Temporary image successfully written for cleanup test');

    // Delete the whole clothing item
    const deleteItemRes = await fetch(`${baseUrl}/api/clothes/${testClothingItem._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const deleteItemData = await deleteItemRes.json();

    assert(
      deleteItemRes.status === 200 &&
      deleteItemData.success === true &&
      !fs.existsSync(freshDiskPath), // Local image was deleted along with the item!
      '12. Deleting clothing item cleans up its associated local image from uploads/clothing/'
    );

  } catch (error) {
    console.error('[Image Upload Test Error]:', error);
    failed++;
  } finally {
    console.log('\n[Cleanup] Cleaning up test records and local images...');
    if (testClothingItem?._id) {
      await ClothingItem.findByIdAndDelete(testClothingItem._id);
    }
    if (userA?._id) {
      await User.findByIdAndDelete(userA._id);
    }
    if (userB?._id) {
      await User.findByIdAndDelete(userB._id);
    }

    // Clean any lingering test images
    for (const filename of uploadedFilenamesToTrack) {
      const p = path.resolve('uploads', 'clothing', filename);
      if (fs.existsSync(p)) {
        try { fs.unlinkSync(p); } catch {}
      }
    }

    if (runningServer) {
      runningServer.close();
    }
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected test connection');
    console.log(`\n=== Image Upload Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runImageUploadTests();
