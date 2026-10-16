const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const service = require('./reports.service');

const create = asyncHandler(async (req, res) => {
  const report = await service.createReport(req.user.id, req.body);
  return success(res, { status: 201, message: 'Report submitted', data: report });
});

module.exports = { create };
