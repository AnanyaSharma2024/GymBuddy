const User = require('../../models/User');
const BuddyRequest = require('../../models/BuddyRequest');
const ApiError = require('../../utils/apiError');
const { distanceKm, isValidCoordinates } = require('../../utils/geo');
const { computeCompatibility } = require('./scoring.service');
const notificationsService = require('../notifications/notifications.service');

const MAX_CANDIDATES_SCANNED = 100; // cap the geo query so recommendations stay fast
const DEFAULT_RADIUS_KM = 25;

// Returns candidate users near `me`, excluding self and blocked users
// (in either direction), scored and sorted by compatibility.
async function getRecommendations(userId, { radiusKm = DEFAULT_RADIUS_KM, limit = 20 } = {}) {
  const me = await User.findById(userId);
  if (!me) throw ApiError.notFound('User not found');

  // Find who has blocked ME, so I don't get recommended to appear for them
  // either (handled on their side) - but I must also exclude anyone I've
  // blocked, and anyone who has blocked me, from MY recommendations.
  const blockedByOthers = await User.find({ blockedUsers: me._id }).select('_id').lean();
  const excludedIds = new Set([
    me._id.toString(),
    ...(me.blockedUsers || []).map((id) => id.toString()),
    ...blockedByOthers.map((u) => u._id.toString()),
  ]);

  const baseQuery = {
    _id: { $nin: Array.from(excludedIds) },
    accountStatus: 'active',
    'privacy.allowBuddyRequests': { $ne: false },
    'privacy.showProfile': { $ne: false },
  };

  let candidates;
  if (me.location?.coordinates && isValidCoordinates(me.location.coordinates)) {
    // Geo-based candidate search using the 2dsphere index.
    candidates = await User.find({
      ...baseQuery,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: me.location.coordinates },
          $maxDistance: radiusKm * 1000,
        },
      },
    }).limit(MAX_CANDIDATES_SCANNED);
  } else {
    // Fallback: no precise location set - match by city/gym only.
    candidates = await User.find({
      ...baseQuery,
      $or: [{ city: me.city }, { gym: me.gym }],
    }).limit(MAX_CANDIDATES_SCANNED);
  }

  const scored = candidates.map((candidate) => {
    let dist = null;
    if (
      me.location?.coordinates && candidate.location?.coordinates
      && isValidCoordinates(me.location.coordinates) && isValidCoordinates(candidate.location.coordinates)
    ) {
      dist = distanceKm(me.location.coordinates, candidate.location.coordinates);
    }
    const { compatibilityScore, commonFactors } = computeCompatibility(me, candidate, dist);
    return {
      user: candidate,
      distance: dist,
      compatibilityScore,
      commonFactors,
    };
  });

  scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return scored.slice(0, limit).map(({ user, distance, compatibilityScore, commonFactors }) => user.toPublicJSON({
    distance: distance !== null ? require('../../utils/geo').toApproximateDistance(distance) : undefined,
    compatibilityScore,
    commonFactors,
  }));
}

async function sendRequest(senderId, recipientId) {
  if (senderId === recipientId) throw ApiError.badRequest('You cannot send a buddy request to yourself');

  const [sender, recipient] = await Promise.all([
    User.findById(senderId),
    User.findById(recipientId),
  ]);
  if (!recipient || recipient.accountStatus !== 'active') throw ApiError.notFound('User not found');

  if (recipient.blockedUsers?.some((id) => id.toString() === senderId)) {
    // Do not reveal that the recipient specifically blocked the sender -
    // just say the action isn't allowed, to avoid leaking block state.
    throw ApiError.forbidden('Unable to send request to this user');
  }
  if (sender.blockedUsers?.some((id) => id.toString() === recipientId)) {
    throw ApiError.forbidden('Unable to send request to this user');
  }
  if (recipient.privacy?.allowBuddyRequests === false) {
    throw ApiError.forbidden('This user is not accepting buddy requests');
  }

  const existing = await BuddyRequest.findOne({
    sender: senderId,
    recipient: recipientId,
    status: { $in: ['pending', 'accepted'] },
  });
  if (existing) throw ApiError.conflict('A request already exists between you and this user');

  // also block re-sending if the recipient already sent ME a pending request
  const reverse = await BuddyRequest.findOne({
    sender: recipientId, recipient: senderId, status: 'pending',
  });
  if (reverse) throw ApiError.conflict('This user has already sent you a request - respond to that instead');

  let dist = null;
  if (sender.location?.coordinates && recipient.location?.coordinates) {
    dist = distanceKm(sender.location.coordinates, recipient.location.coordinates);
  }
  const { compatibilityScore } = computeCompatibility(sender, recipient, dist);

  const request = await BuddyRequest.create({
    sender: senderId,
    recipient: recipientId,
    compatibilityScoreAtRequest: compatibilityScore,
  });

  await notificationsService.notify(recipientId, {
    type: 'buddy_request',
    title: 'New buddy request',
    body: `${sender.name} wants to be your gym buddy`,
    data: { requestId: request._id.toString() },
  });

  return request;
}

async function respondToRequest(requestId, userId, action) {
  const request = await BuddyRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  if (request.recipient.toString() !== userId) {
    // Only the recipient may accept/reject. This is the core IDOR guard
    // for this endpoint.
    throw ApiError.forbidden('You are not authorized to respond to this request');
  }
  if (request.status !== 'pending') throw ApiError.conflict('This request is no longer pending');

  request.status = action; // 'accepted' | 'rejected'
  request.respondedAt = new Date();
  await request.save();

  if (action === 'accepted') {
    const recipient = await User.findById(userId);
    await notificationsService.notify(request.sender.toString(), {
      type: 'buddy_request_accepted',
      title: 'Buddy request accepted',
      body: `${recipient.name} accepted your buddy request`,
      data: { requestId: request._id.toString() },
    });
  }

  return request;
}

async function cancelRequest(requestId, userId) {
  const request = await BuddyRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');
  if (request.sender.toString() !== userId) {
    // Only the original sender can cancel their own outgoing request.
    throw ApiError.forbidden('You are not authorized to cancel this request');
  }
  if (request.status !== 'pending') throw ApiError.conflict('Only pending requests can be cancelled');

  request.status = 'cancelled';
  request.respondedAt = new Date();
  await request.save();
  return request;
}

async function unmatch(userId, otherUserId) {
  const result = await BuddyRequest.findOneAndUpdate(
    {
      status: 'accepted',
      $or: [
        { sender: userId, recipient: otherUserId },
        { sender: otherUserId, recipient: userId },
      ],
    },
    { status: 'cancelled' },
  );
  if (!result) throw ApiError.notFound('No active buddy connection found with this user');
}

async function listMyRequests(userId, { direction = 'incoming', status, page = 1, limit = 20 }) {
  const query = direction === 'incoming' ? { recipient: userId } : { sender: userId };
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    BuddyRequest.find(query)
      .populate('sender', 'name profileImage city gym fitnessGoal experienceLevel')
      .populate('recipient', 'name profileImage city gym fitnessGoal experienceLevel')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    BuddyRequest.countDocuments(query),
  ]);
  return { requests, total, page, limit };
}

module.exports = {
  getRecommendations, sendRequest, respondToRequest, cancelRequest, unmatch, listMyRequests,
};
