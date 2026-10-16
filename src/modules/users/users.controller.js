const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const usersService = require('./users.service');

const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getById(req.user.id);
  return success(res, { data: user.toSafeJSON() });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  return success(res, { message: 'Profile updated', data: user.toSafeJSON() });
});

const deleteMe = asyncHandler(async (req, res) => {
  await usersService.deleteMe(req.user.id);
  return success(res, { status: 204, message: 'Account deactivated' });
});

const uploadProfileImage = asyncHandler(async (req, res) => {
  const ApiError = require('../../utils/apiError');
  if (!req.file) throw ApiError.badRequest('No image file provided');
  const user = await usersService.uploadProfileImage(req.user.id, req.file.buffer, req.file.mimetype);
  return success(res, { message: 'Profile image updated', data: { profileImage: user.profileImage } });
});

const registerDeviceToken = asyncHandler(async (req, res) => {
  await usersService.registerDeviceToken(req.user.id, req.body.token);
  return success(res, { message: 'Device registered for notifications' });
});

const removeDeviceToken = asyncHandler(async (req, res) => {
  await usersService.removeDeviceToken(req.user.id, req.body.token);
  return success(res, { message: 'Device token removed' });
});

const blockUser = asyncHandler(async (req, res) => {
  await usersService.blockUser(req.user.id, req.params.userId);
  return success(res, { message: 'User blocked' });
});

const unblockUser = asyncHandler(async (req, res) => {
  await usersService.unblockUser(req.user.id, req.params.userId);
  return success(res, { message: 'User unblocked' });
});

module.exports = {
  getMe, updateMe, deleteMe, uploadProfileImage, registerDeviceToken, removeDeviceToken, blockUser, unblockUser,
};
