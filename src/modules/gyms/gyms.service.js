const Gym = require('../../models/Gym');
const redis = require('../../config/redis');
const ApiError = require('../../utils/apiError');
const { isValidCoordinates } = require('../../utils/geo');
const logger = require('../../utils/logger');

const CACHE_TTL_SECONDS = 300; // 5 minutes - gym data changes rarely

async function listGyms({ city, search, page = 1, limit = 20 }) {
  const query = {};
  if (city) query.city = new RegExp(`^${city}$`, 'i');
  if (search) query.$text = { $search: search };

  const cacheKey = `gyms:list:${city || ''}:${search || ''}:${page}:${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn('Redis cache read failed, falling back to DB', { error: err.message });
  }

  const skip = (page - 1) * limit;
  const [gyms, total] = await Promise.all([
    Gym.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Gym.countDocuments(query),
  ]);

  const result = { gyms, total, page, limit };

  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
  } catch (err) {
    logger.warn('Redis cache write failed', { error: err.message });
  }

  return result;
}

async function findNearby({ lng, lat, radiusKm = 5 }) {
  if (!isValidCoordinates([lng, lat])) throw ApiError.badRequest('Invalid coordinates');
  if (radiusKm <= 0 || radiusKm > 50) throw ApiError.badRequest('radius must be between 0 and 50 km');

  const gyms = await Gym.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(50).lean();

  return gyms;
}

async function getById(gymId) {
  const gym = await Gym.findById(gymId).lean();
  if (!gym) throw ApiError.notFound('Gym not found');
  return gym;
}

async function createGym(data, createdBy) {
  if (!isValidCoordinates(data.location.coordinates)) {
    throw ApiError.badRequest('Invalid gym coordinates');
  }
  const gym = await Gym.create({ ...data, createdBy });
  // Invalidate simple list caches for that city (best-effort, non-fatal)
  try {
    const keys = await redis.keys(`gyms:list:${data.city}*`);
    if (keys.length) await redis.del(keys);
  } catch (err) {
    // cache invalidation failures are non-fatal
  }
  return gym;
}

module.exports = {
  listGyms, findNearby, getById, createGym,
};
