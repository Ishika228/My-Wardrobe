process.env.NODE_ENV = 'test';
process.env.PORT = '5005';

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { startServer } from '../server.js';
import User from '../models/User.js';

const runAuthTests = async () => {
  console.log('=== WardrobeWise Phase 3: Authentication & Authorization Tests ===\n');
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

  const TEST_PORT = process.env.PORT || 5005;
  let runningServer = null;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  const testEmail = `test.fashionista.${Date.now()}@example.com`;
  const testPassword = 'StrongFashionPassword2026!';
  let authToken = null;
  let registeredUserId = null;

  try {
    // 1. Start server for test suite
    runningServer = await startServer(TEST_PORT);

    // --- TEST 1: Register New User ---
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ayushi Fashion',
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();

    assert(
      regRes.status === 201 &&
      regData.success === true &&
      Boolean(regData.data?.token) &&
      regData.data.user?.email === testEmail.toLowerCase(),
      '1. Register new user returns HTTP 201 with token and user object'
    );

    assert(
      regData.data.user.password === undefined,
      '   User registration response never exposes password or hash'
    );

    registeredUserId = regData.data.user._id;
    authToken = regData.data.token;

    // --- TEST 2: Verify Password Hash in MongoDB ---
    const userInDb = await User.findById(registeredUserId).select('+password');
    assert(
      userInDb &&
      userInDb.password !== testPassword &&
      (userInDb.password.startsWith('$2a$') || userInDb.password.startsWith('$2b$')),
      '2. Password is stored as a secure bcrypt hash in MongoDB, not plain text'
    );

    // --- TEST 3: Duplicate Email Rejection ---
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Ayushi',
        email: testEmail,
        password: 'AnotherPassword123',
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 400 &&
      dupData.success === false &&
      dupData.message.toLowerCase().includes('already registered'),
      '3. Registering with an existing email is rejected with HTTP 400'
    );

    // --- TEST 4: Invalid Email Format Rejection ---
    const invalidEmailRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email User',
        email: 'invalid-email-address',
        password: 'ValidPassword123',
      }),
    });
    const invalidEmailData = await invalidEmailRes.json();
    assert(
      invalidEmailRes.status === 400 &&
      invalidEmailData.success === false &&
      invalidEmailData.message.toLowerCase().includes('valid email'),
      '4. Registering with invalid email format is rejected with HTTP 400'
    );

    // --- TEST 5: Weak Password Rejection (< 8 characters) ---
    const weakPassRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass User',
        email: `weak.${Date.now()}@example.com`,
        password: 'short', // 5 characters
      }),
    });
    const weakPassData = await weakPassRes.json();
    assert(
      weakPassRes.status === 400 &&
      weakPassData.success === false &&
      weakPassData.message.toLowerCase().includes('at least 8 characters'),
      '5. Registering with weak password (< 8 chars) is rejected with HTTP 400'
    );

    // --- TEST 6: Login With Correct Credentials ---
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 &&
      loginData.success === true &&
      Boolean(loginData.data?.token) &&
      loginData.data.user.password === undefined,
      '6. Login with correct credentials returns HTTP 200, JWT token, and safe user data'
    );

    // --- TEST 7: Login With Incorrect Password ---
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword456!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(
      wrongPassRes.status === 401 &&
      wrongPassData.success === false &&
      wrongPassData.message === 'Invalid email or password',
      '7. Login with incorrect password returns HTTP 401 with generic error message'
    );

    // --- TEST 8: Login With Non-Existent Email ---
    const nonExistentRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody.exists@example.com',
        password: testPassword,
      }),
    });
    const nonExistentData = await nonExistentRes.json();
    assert(
      nonExistentRes.status === 401 &&
      nonExistentData.success === false &&
      nonExistentData.message === 'Invalid email or password',
      '8. Login with non-existent email returns generic 401 error (prevents email harvesting)'
    );

    // --- TEST 9: Access Profile Without Token ---
    const noTokenRes = await fetch(`${baseUrl}/api/users/profile`);
    const noTokenData = await noTokenRes.json();
    assert(
      noTokenRes.status === 401 &&
      noTokenData.success === false &&
      noTokenData.message.includes('No token provided'),
      '9. Accessing protected profile without token is rejected with HTTP 401'
    );

    // --- TEST 10: Access Profile With Invalid Token ---
    const invalidTokenRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(
      invalidTokenRes.status === 401 &&
      invalidTokenData.success === false &&
      invalidTokenData.message.includes('Invalid or malformed'),
      '10. Accessing protected profile with invalid token is rejected with HTTP 401'
    );

    // --- TEST 11: Access Profile With Valid Token ---
    const profileRes = await fetch(`${baseUrl}/api/users/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const profileData = await profileRes.json();
    assert(
      profileRes.status === 200 &&
      profileData.success === true &&
      profileData.data?.user?.email === testEmail.toLowerCase() &&
      profileData.data.user.password === undefined,
      '11. Accessing profile with valid JWT returns HTTP 200 with user profile without password'
    );

    // --- TEST 12: Update Profile Using Valid Token ---
    const updateRes = await fetch(`${baseUrl}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Ayushi Fashion Lead',
        profileImage: 'https://example.com/avatar.jpg',
        gender: 'female',
        preferences: {
          favoriteColors: ['Midnight Blue', 'Emerald Green'],
          preferredStyles: ['Minimalist', 'High Fashion'],
          preferredOccasions: ['Gala', 'VR Runway'],
        },
        // Attempt to maliciously modify email or password
        email: 'hacked.email@example.com',
        password: 'HackedPassword123',
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 &&
      updateData.success === true &&
      updateData.data?.user?.name === 'Ayushi Fashion Lead' &&
      updateData.data?.user?.preferences?.favoriteColors.includes('Emerald Green') &&
      updateData.data?.user?.email === testEmail.toLowerCase(), // Email remained unmanipulated!
      '12. Updating profile updates allowed fields while ignoring email/password tampering'
    );

    // --- TEST 13: Logout API ---
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
    });
    const logoutData = await logoutRes.json();
    assert(
      logoutRes.status === 200 &&
      logoutData.success === true &&
      logoutData.message.includes('remove your access token'),
      '13. Logout endpoint returns HTTP 200 explaining client-side token removal'
    );

  } catch (error) {
    console.error('[Test Error]:', error);
    failed++;
  } finally {
    // Cleanup temporary test user
    if (registeredUserId) {
      console.log('\n[Cleanup] Removing temporary test user from database...');
      await User.findByIdAndDelete(registeredUserId);
    }

    if (runningServer) {
      runningServer.close();
    }
    await mongoose.disconnect();
    console.log('[Cleanup] Disconnected test connection');
    console.log(`\n=== Auth Test Summary: ${passed} Passed, ${failed} Failed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }
};

runAuthTests();
