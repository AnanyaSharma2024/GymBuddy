// Single shared Redis client used for:
//  - rate limiting (rate-limit-redis)
//  - caching (gyms, recommendation lists)
//  - online presence (short TTL keys)
//  - Socket.IO cross-instance pub/sub (future horizontal scaling)
//
// Redis is treated as OPTIONAL infrastructure: if it goes down, the app
// keeps serving requests (falling back to in-memory rate limiting / no
// cache) instead of crashing. Only auth/DB failures are fatal.
const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying forever
    return Math.min(times * 200, 3000);
  },
  lazyConnect: false,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.warn('Redis error (degraded mode)', { error: err.message }));

module.exports = redis;
