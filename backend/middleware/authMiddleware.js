import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Validates JWT Bearer tokens from incoming Authorization headers,
 * extracts user ID, and attaches authenticated user document to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Reject requests without a Bearer token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is missing from server configuration');
    }

    // Verify token
    const decoded = jwt.verify(token, secret);

    // Retrieve user without password
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authorization failed. User no longer exists.',
      });
    }

    // Attach authenticated user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed authorization token.',
    });
  }
};

/**
 * Optional Authentication Middleware
 * If valid Bearer token provided, attaches req.user.
 * If no token or invalid token, sets req.user = null and continues without error.
 */
export const optionalProtect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId).select('-password');
    req.user = user || null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

export default protect;
