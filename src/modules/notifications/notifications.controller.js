const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const service = require('./notifications.service');

const list = asyncHandler(async (req, res) => {
  const result = await service.list(req.user.id, req.query);
  return success(res, {
    data: result.items,
    meta: {
      total: result.total, page: result.page, limit: result.limit, unreadCount: result.unreadCount,
    },
  });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await service.markRead(req.user.id, req.params.id);
  return success(res, { message: 'Marked as read', data: notification });
});

module.exports = { list, markRead };
