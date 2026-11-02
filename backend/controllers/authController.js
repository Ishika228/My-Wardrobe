import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

/**
 * Standard email format regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const trimmedName = name.trim();
    const formattedEmail = email.trim().toLowerCase();

    // 2. Validate email format
    if (!EMAIL_REGEX.test(formattedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // 3. Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // 4. Check if email already exists
    const existingUser = await User.findOne({ email: formattedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please log in or use another email.',
      });
    }

    // 5. Create user (password is automatically hashed via User schema pre-save hook)
    const user = await User.create({
      name: trimmedName,
      email: formattedEmail,
      password,
    });

    // 6. Generate JWT token
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (in case of race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered',
      });
    }
    next(error);
  }
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const formattedEmail = email.trim().toLowerCase();

    // 2. Find user by email
    const user = await User.findOne({ email: formattedEmail });

    // 3. Verify user existence and password comparison
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log out user (instructs client to clear stored token)
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove your access token from client storage.',
  });
};
