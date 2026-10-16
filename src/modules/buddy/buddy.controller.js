const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const buddyService = require('./buddy.service');

const recommendations = asyncHandler(async (req, res) => {
  const { radius, limit } = req.query;
  const results = await buddyService.getRecommendations(req.user.id, { radiusKm: radius, limit });
  return success(res, { data: results });
});

const nearby = asyncHandler(async (req, res) => {
  const { radius } = req.query;
  // "nearby" reuses the same engine but implies pure proximity - the
  // frontend can sort client-side by distance if desired.
  const results = await buddyService.getRecommendations(req.user.id, { radiusKm: radius, limit: 50 });
  return success(res, { data: results });
});

const sendRequest = asyncHandler(async (req, res) => {
  const request = await buddyService.sendRequest(req.user.id, req.params.userId);
  return success(res, { status: 201, message: 'Buddy request sent', data: request });
});

const acceptRequest = asyncHandler(async (req, res) => {
  const request = await buddyService.respondToRequest(req.params.requestId, req.user.id, 'accepted');
  return success(res, { message: 'Buddy request accepted', data: request });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const request = await buddyService.respondToRequest(req.params.requestId, req.user.id, 'rejected');
  return success(res, { message: 'Buddy request rejected', data: request });
});

const cancelRequest = asyncHandler(async (req, res) => {
  const request = await buddyService.cancelRequest(req.params.requestId, req.user.id);
  return success(res, { message: 'Buddy request cancelled', data: request });
});

const unmatch = asyncHandler(async (req, res) => {
  await buddyService.unmatch(req.user.id, req.params.userId);
  return success(res, { message: 'Unmatched successfully' });
});

const listRequests = asyncHandler(async (req, res) => {
  const result = await buddyService.listMyRequests(req.user.id, req.query);
  return success(res, {
    data: result.requests,
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
});

module.exports = {
  recommendations, nearby, sendRequest, acceptRequest, rejectRequest, cancelRequest, unmatch, listRequests,
};
