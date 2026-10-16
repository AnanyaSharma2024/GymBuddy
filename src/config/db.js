const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);
  // sanitizeFilter defends against NoSQL operator injection at the driver
  // level (e.g. { email: { $gt: '' } } being injected via req.body).
  mongoose.set('sanitizeFilter', true);

  try {
    await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB runtime error', { error: err.message });
  });
}

module.exports = connectDB;
