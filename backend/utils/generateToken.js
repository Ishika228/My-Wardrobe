import jwt from 'jsonwebtoken';

/**
 * Generates a signed JSON Web Token (JWT) with user ID payload.
 * 
 * @param {string} userId - The MongoDB ObjectId of the user
 * @returns {string} Signed JWT token
 */
export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign({ userId }, secret, {
    expiresIn,
  });
};

export default generateToken;
