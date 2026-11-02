import mongoose from 'mongoose';
import { groqHealthCheck } from '../services/groqService.js';

/**
 * Maps Mongoose readyState integers to human-readable connection states
 */
const getDatabaseStatus = () => {
  const state = mongoose.connection.readyState;
  switch (state) {
    case 1:  return 'connected';
    case 2:  return 'connecting';
    case 3:  return 'disconnecting';
    case 0:
    default: return 'disconnected';
  }
};

/**
 * @desc    Check backend, database and Groq AI health
 * @route   GET /api/health
 * @access  Public
 */
export const getHealthStatus = async (req, res) => {
  const dbStatus = getDatabaseStatus();

  // Check Groq AI status
  let groqStatus = { status: 'not_configured', note: 'Set GROQ_API_KEY in .env to enable Groq AI' };
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here') {
    try {
      groqStatus = await groqHealthCheck();
    } catch (err) {
      groqStatus = { status: 'error', error: err.message };
    }
  }

  return res.status(200).json({
    success:  true,
    message:  'WardrobeWise backend is running',
    database: dbStatus,
    ai: {
      groq:     groqStatus,
      priority: process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'gsk_your_groq_api_key_here'
                  ? 'Groq AI → OpenCV → Mock'
                  : 'OpenCV → Mock (Groq not configured)',
    },
  });
};
