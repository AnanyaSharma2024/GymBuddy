// Notifications module: persists an in-app Notification record AND
// (best-effort) sends a push notification via FCM if the user has device
// tokens registered and hasn't disabled that notification type.
//
// Design choice: in-app notifications (stored in Mongo, readable via
// GET /api/notifications) are the source of truth. Push (FCM) is a
// best-effort delivery mechanism layered on top - if FCM fails or is not
// configured, the in-app notification still exists.
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { initFirebase } = require('../../config/firebase');
const logger = require('../../utils/logger');

const PREFERENCE_MAP = {
  buddy_request: 'buddyRequests',
  buddy_request_accepted: 'buddyRequests',
  new_message: 'chat',
  workout_reminder: 'workoutReminders',
  check_in: 'checkIns',
};

async function notify(recipientId, { type, title, body, data = {} }) {
  const recipient = await User.findById(recipientId).select('+deviceTokens blockedUsers notificationPreferences accountStatus');
  if (!recipient || recipient.accountStatus !== 'active') return null;

  const prefKey = PREFERENCE_MAP[type];
  const prefEnabled = prefKey ? recipient.notificationPreferences?.[prefKey] !== false : true;

  // Always persist the in-app notification record regardless of push
  // preference, EXCEPT the user has fully disabled that category - in
  // that case we still store it so they can see it in-app, only push is gated.
  const notification = await Notification.create({
    recipient: recipientId, type, title, body, data,
  });

  if (prefEnabled && recipient.deviceTokens?.length) {
    await sendPush(recipient.deviceTokens, { title, body, data }).catch((err) => {
      logger.warn('FCM push failed (non-fatal)', { error: err.message, recipientId });
    });
  }

  return notification;
}

async function sendPush(deviceTokens, { title, body, data }) {
  const admin = initFirebase();
  if (!admin) return; // Firebase not configured - skip silently

  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens: deviceTokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Clean up device tokens that Firebase reports as invalid/unregistered,
  // so we stop trying to push to dead devices.
  const invalidTokens = [];
  response.responses.forEach((res, idx) => {
    if (!res.success && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(res.error?.code)) {
      invalidTokens.push(deviceTokens[idx]);
    }
  });
  if (invalidTokens.length) {
    await User.updateMany({ deviceTokens: { $in: invalidTokens } }, { $pull: { deviceTokens: { $in: invalidTokens } } });
  }
}

async function list(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);
  return {
    items, total, page, limit, unreadCount,
  };
}

async function markRead(userId, notificationId) {
  const ApiError = require('../../utils/apiError');
  const notification = await Notification.findById(notificationId);
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.recipient.toString() !== userId) throw ApiError.forbidden('Not your notification');
  notification.read = true;
  await notification.save();
  return notification;
}

module.exports = {
  notify, list, markRead,
};
