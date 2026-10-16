const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const service = require('./checkins.service');

const create = asyncHandler(async (req, res) => {
  const checkin = await service.checkIn(req.user.id, req.body.gym, req.body.visibleToBuddiesOnly);
  return success(res, { status: 201, message: 'Checked in', data: checkin });
});

const list = asyncHandler(async (req, res) => {
  const result = await service.listMine(req.user.id, req.query);
  return success(res, { data: result.checkins, meta: { total: result.total, page: result.page, limit: result.limit } });
});

module.exports = { create, list };
