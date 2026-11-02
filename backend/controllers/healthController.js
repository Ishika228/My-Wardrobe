import mongoose from 'mongoose';

/**
 * Maps Mongoose readyState integers to human-readable connection states
 * 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 * 
 * @returns {string} The current database connection status
 */
const getDatabaseStatus = () => {
  const state = mongoose.connection.readyState;
  switch (state) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    case 0:
    default:
      return 'disconnected';
  }
};

/**
 * @desc    Check backend and database health
 * @route   GET /api/health
 * @access  Public
 */
export const getHealthStatus = (req, res) => {
  const dbStatus = getDatabaseStatus();

  return res.status(200).json({
    success: true,
    message: 'WardrobeWise backend is running',
    database: dbStatus
  });
};
