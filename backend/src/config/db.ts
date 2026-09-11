import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cricstats';

let isConnecting = false;

// Mongoose Connection Event Listeners
mongoose.connection.on('connected', () => {
  console.log(`✅ [MongoDB] Connected successfully to host: ${mongoose.connection.host}`);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ [MongoDB] Connection error occurred:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB] Connection lost. Will attempt automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 [MongoDB] Reconnected successfully to database');
});

export const connectDB = async (retryCount = 0): Promise<void> => {
  if (isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;

  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 20,              // Keep up to 20 connections in pool
      minPoolSize: 5,               // Maintain at least 5 warm connections to prevent drops
      serverSelectionTimeoutMS: 15000, // 15s timeout for server discovery
      socketTimeoutMS: 45000,       // 45s socket inactivity timeout
      heartbeatFrequencyMS: 10000,  // Periodic heartbeat to prevent idle connection termination by Atlas
      retryWrites: true,
      retryReads: true,
    });
    isConnecting = false;
  } catch (error) {
    isConnecting = false;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
    console.error(`❌ [MongoDB] Initial connection failed (${(error as Error).message}). Retrying in ${delay / 1000}s...`);
    
    // Instead of exiting process and crashing the server, retry with backoff
    setTimeout(() => {
      connectDB(retryCount + 1);
    }, delay);
  }
};

