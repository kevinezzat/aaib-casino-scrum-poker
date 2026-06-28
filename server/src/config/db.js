'use strict';

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Connect to MongoDB Atlas.
 * Logs a warning when MONGODB_URI is not set instead of crashing,
 * so the server can still start for non-DB development.
 */
async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('[warn] MONGODB_URI not set — server will start but DB calls will fail.');
    console.warn('[warn] Copy server/.env.example → server/.env and fill in your Atlas URI.');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[mongo] connected to Atlas');
  } catch (err) {
    console.error('[mongo] connection error:', err.message);
  }
}

module.exports = connectDB;
