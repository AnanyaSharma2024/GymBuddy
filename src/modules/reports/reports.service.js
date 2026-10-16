const Report = require('../../models/Report');
const User = require('../../models/User');
const ApiError = require('../../utils/apiError');

async function createReport(reporterId, { reportedUser, reason, details }) {
  if (reporterId === reportedUser) throw ApiError.badRequest('You cannot report yourself');
  const target = await User.findById(reportedUser);
  if (!target) throw ApiError.notFound('User not found');

  return Report.create({
    reporter: reporterId, reportedUser, reason, details,
  });
}

// Admin-only listing/review below.
async function listReports({ status, page = 1, limit = 20 }) {
  const query = {};
  if (status) query.status = status;
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email accountStatus')
      .sort({ createdAt: -1 }).skip(skip).limit(limit),
    Report.countDocuments(query),
  ]);
  return { reports, total, page, limit };
}

async function reviewReport(reportId, adminId, { status, resolutionNotes }) {
  const report = await Report.findById(reportId);
  if (!report) throw ApiError.notFound('Report not found');
  report.status = status;
  report.reviewedBy = adminId;
  if (resolutionNotes) report.resolutionNotes = resolutionNotes;
  await report.save();
  return report;
}

module.exports = { createReport, listReports, reviewReport };
