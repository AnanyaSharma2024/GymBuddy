const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const reportsService = require('../reports/reports.service');
const User = require('../../models/User');
const ApiError = require('../../utils/apiError');

const listReports = asyncHandler(async (req, res) => {
  const result = await reportsService.listReports(req.query);
  return success(res, { data: result.reports, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const reviewReport = asyncHandler(async (req, res) => {
  const report = await reportsService.reviewReport(req.params.id, req.user.id, req.body);
  return success(res, { message: 'Report updated', data: report });
});

const suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found');
  user.accountStatus = 'suspended';
  await user.save();
  return success(res, { message: 'User suspended' });
});

const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw ApiError.notFound('User not found');
  user.accountStatus = 'active';
  await user.save();
  return success(res, { message: 'User reactivated' });
});

module.exports = {
  listReports, reviewReport, suspendUser, reactivateUser,
};
