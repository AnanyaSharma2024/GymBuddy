const User = require('../../models/User');
const ApiError = require('../../utils/apiError');
const { isValidCoordinates } = require('../../utils/geo');
const cloudinary = require('../../config/cloudinary');

async function getById(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function updateMe(userId, updates) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (updates.location) {
    const { lng, lat } = updates.location;
    if (!isValidCoordinates([lng, lat])) {
      throw ApiError.badRequest('Invalid coordinates supplied');
    }
    user.location = { type: 'Point', coordinates: [lng, lat] };
    delete updates.location;
  }

  // Only assign known/allowed fields (never role, accountStatus, googleId, email).
  const allowed = [
    'name', 'age', 'gender', 'genderPreference', 'fitnessGoal', 'experienceLevel',
    'preferredWorkoutTime', 'gym', 'city', 'bio', 'ageRangePreference',
  ];
  for (const key of allowed) {
    if (updates[key] !== undefined) user[key] = updates[key];
  }
  if (updates.privacy) Object.assign(user.privacy, updates.privacy);
  if (updates.notificationPreferences) Object.assign(user.notificationPreferences, updates.notificationPreferences);

  await user.save();
  return user;
}

async function deleteMe(userId) {
  // Soft delete: deactivate rather than hard-delete, to preserve integrity
  // of conversations/reports the user was part of and avoid orphaned refs.
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  user.accountStatus = 'deactivated';
  await user.save();
}

async function uploadProfileImage(userId, fileBuffer, mimeType) {
  const user = await User.findById(userId).select('+profileImagePublicId');
  if (!user) throw ApiError.notFound('User not found');

  // Delete old image first so we don't accumulate orphaned Cloudinary assets.
  if (user.profileImagePublicId) {
    await cloudinary.uploader.destroy(user.profileImagePublicId).catch(() => {});
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'gym-buddy/profile-images',
        resource_type: 'image',
        transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(fileBuffer);
  });

  user.profileImage = uploadResult.secure_url;
  user.profileImagePublicId = uploadResult.public_id;
  await user.save();
  return user;
}

async function registerDeviceToken(userId, token) {
  await User.updateOne({ _id: userId }, { $addToSet: { deviceTokens: token } });
}

async function removeDeviceToken(userId, token) {
  await User.updateOne({ _id: userId }, { $pull: { deviceTokens: token } });
}

async function blockUser(userId, targetUserId) {
  if (userId === targetUserId) throw ApiError.badRequest('You cannot block yourself');
  const target = await User.findById(targetUserId);
  if (!target) throw ApiError.notFound('User not found');
  await User.updateOne({ _id: userId }, { $addToSet: { blockedUsers: targetUserId } });
}

async function unblockUser(userId, targetUserId) {
  await User.updateOne({ _id: userId }, { $pull: { blockedUsers: targetUserId } });
}

module.exports = {
  getById, updateMe, deleteMe, uploadProfileImage, registerDeviceToken, removeDeviceToken, blockUser, unblockUser,
};
