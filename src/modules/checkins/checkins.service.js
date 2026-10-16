const CheckIn = require('../../models/CheckIn');
const BuddyRequest = require('../../models/BuddyRequest');
const User = require('../../models/User');
const Gym = require('../../models/Gym');
const ApiError = require('../../utils/apiError');
const notificationsService = require('../notifications/notifications.service');

const CHECKIN_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const MIN_MINUTES_BETWEEN_CHECKINS = 15; // basic abuse guard against spam check-ins

async function checkIn(userId, gymId, visibleToBuddiesOnly = true) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const gym = await Gym.findById(gymId);
  if (!gym) throw ApiError.notFound('Gym not found');

  const recent = await CheckIn.findOne({ user: userId }).sort({ createdAt: -1 });
  if (recent) {
    const minutesSince = (Date.now() - recent.createdAt.getTime()) / 60000;
    if (minutesSince < MIN_MINUTES_BETWEEN_CHECKINS) {
      throw ApiError.tooMany(`Please wait before checking in again`);
    }
  }

  const checkin = await CheckIn.create({
    user: userId,
    gym: gymId,
    visibleToBuddiesOnly,
    expiresAt: new Date(Date.now() + CHECKIN_DURATION_MS),
  });

  if (user.privacy?.checkInVisible !== false) {
    // Notify accepted buddies only (never exact location - just "at the gym").
    const acceptedRequests = await BuddyRequest.find({
      status: 'accepted',
      $or: [{ sender: userId }, { recipient: userId }],
    });
    const buddyIds = acceptedRequests.map((r) => (r.sender.toString() === userId ? r.recipient.toString() : r.sender.toString()));

    await Promise.all(buddyIds.map((buddyId) => notificationsService.notify(buddyId, {
      type: 'check_in',
      title: 'Buddy check-in',
      body: `${user.name} just checked in at ${gym.name}`,
      data: { gymId: gym._id.toString() },
    })));
  }

  return checkin;
}

async function listMine(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [checkins, total] = await Promise.all([
    CheckIn.find({ user: userId }).populate('gym', 'name city').sort({ createdAt: -1 }).skip(skip).limit(limit),
    CheckIn.countDocuments({ user: userId }),
  ]);
  return { checkins, total, page, limit };
}

module.exports = { checkIn, listMine };
