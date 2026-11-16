const Gym = require('../../models/Gym');
const redis = require('../../config/redis');
const ApiError = require('../../utils/apiError');
const { isValidCoordinates } = require('../../utils/geo');
const logger = require('../../utils/logger');

const CACHE_TTL_SECONDS = 300;

async function invalidateGymCache() {
  try {
    const keys = await redis.keys('gyms:list:*');
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (err) {
    logger.warn('Gym cache invalidation failed', {
      error: err.message,
    });
  }
}

async function listGyms({ city, search, page = 1, limit = 20 }) {
  const query = {};

  if (city) query.city = new RegExp(`^${city}$`, 'i');
  if (search) query.$text = { $search: search };

  const cacheKey = `gyms:list:${city || ''}:${search || ''}:${page}:${limit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    logger.warn('Redis cache read failed', {
      error: err.message,
    });
  }

  const skip = (page - 1) * limit;

  const [gyms, total] = await Promise.all([
    Gym.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Gym.countDocuments(query),
  ]);

  const result = { gyms, total, page, limit };

  try {
    await redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS,
    );
  } catch (err) {
    logger.warn('Redis cache write failed', {
      error: err.message,
    });
  }

  return result;
}

async function listPendingGyms() {
  // Older records without verificationStatus are treated as pending
  // unless they were already verified.
  const gyms = await Gym.find({ verified: false })
    .sort({ createdAt: -1 })
    .lean();

  return gyms.filter(
    (gym) => !gym.verificationStatus || gym.verificationStatus === 'pending',
  );
}

async function findNearby({ lng, lat, radiusKm = 5 }) {
  if (!isValidCoordinates([lng, lat])) {
    throw ApiError.badRequest('Invalid coordinates');
  }

  if (radiusKm <= 0 || radiusKm > 50) {
    throw ApiError.badRequest('Radius must be between 0 and 50 km');
  }

  return Gym.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).limit(50).lean();
}

async function getById(gymId) {
  const gym = await Gym.findById(gymId).lean();

  if (!gym) {
    throw ApiError.notFound('Gym not found');
  }

  return gym;
}

async function createGym(data, createdBy) {
  if (!isValidCoordinates(data.location.coordinates)) {
    throw ApiError.badRequest('Invalid gym coordinates');
  }

  const gym = await Gym.create({
    ...data,
    createdBy,
    verified: false,
    verificationStatus: 'pending',
  });

  await invalidateGymCache();

  return gym;
}

async function approveGym(gymId) {
  const gym = await Gym.findByIdAndUpdate(
    gymId,
    {
      $set: {
        verified: true,
        verificationStatus: 'verified',
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!gym) {
    throw ApiError.notFound('Gym not found');
  }

  await invalidateGymCache();

  return gym;
}

async function rejectGym(gymId) {
  const gym = await Gym.findByIdAndUpdate(
    gymId,
    {
      $set: {
        verified: false,
        verificationStatus: 'rejected',
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!gym) {
    throw ApiError.notFound('Gym not found');
  }

  await invalidateGymCache();

  return gym;
}

module.exports = {
  listGyms,
  listPendingGyms,
  findNearby,
  getById,
  createGym,
  approveGym,
  rejectGym,
};