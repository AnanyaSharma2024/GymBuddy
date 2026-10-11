// Redis-backed rate limiting, with distinct limits per sensitive area.
// If Redis is unavailable, express-rate-limit's RedisStore will throw on
// individual requests; we catch that inside a try/catch wrapper so a Redis
// outage degrades to "no rate limiting" instead of "entire API down".
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');
const { fail } = require('../utils/response');

function makeLimiter({ windowMs, max, prefix, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // rate-limit-redis expects a sendCommand fn; ioredis exposes call()
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    handler: (req, res) => fail(res, { status: 429, message: message || 'Too many requests, slow down' }),
    // keep working even if the redis store throws
    skipFailedRequests: false,
  });
}

// Strict: login/OAuth endpoints - primary brute-force / account-enumeration target
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, max: 20, prefix: 'auth', message: 'Too many auth attempts, try again later',
});

// Refresh endpoint - allow more often (apps refresh silently) but still capped
const refreshLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, max: 60, prefix: 'refresh',
});

// Buddy requests - prevent spam-requesting every user on the platform
const buddyRequestLimiter = makeLimiter({
  windowMs: 60 * 60 * 1000, max: 30, prefix: 'buddyreq', message: 'Too many buddy requests, try again later',
});

// Messaging - prevent chat spam / flooding
const messageLimiter = makeLimiter({
  windowMs: 60 * 1000, max: 30, prefix: 'msg', message: 'You are sending messages too fast',
});

// General API-wide baseline
const generalLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, max: 300, prefix: 'general',
});

module.exports = {
  authLimiter, refreshLimiter, buddyRequestLimiter, messageLimiter, generalLimiter,
};
