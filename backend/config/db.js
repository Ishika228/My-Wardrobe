import mongoose from 'mongoose';
import dns from 'dns';

/**
 * Connects to MongoDB (Local or Atlas Cloud) using Mongoose.
 * Reads the connection string from environment variables (MONGODB_URI).
 * Does not hardcode credentials or connection URLs.
 * 
 * @returns {Promise<typeof mongoose>} Mongoose connection instance
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is missing.');
    }

    // Ensure robust DNS resolution for MongoDB Atlas SRV connection strings on Windows
    if (mongoUri.startsWith('mongodb+srv:')) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch {
        // Fall back to system default resolvers
      }
    }

    const conn = await mongoose.connect(mongoUri);

    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // Re-throw so the server startup process can halt safely
    throw error;
  }
};

export default connectDB;
