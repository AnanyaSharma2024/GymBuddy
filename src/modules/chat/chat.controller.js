const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/response');
const service = require('./chat.service');

const listConversations = asyncHandler(async (req, res) => {
  const result = await service.listConversations(req.user.id, req.query);
  return success(res, {
    data: result.conversations,
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
});

const startConversation = asyncHandler(async (req, res) => {
  const conversation = await service.getOrCreateConversation(req.user.id, req.body.userId);
  return success(res, { status: 201, data: conversation });
});

const listMessages = asyncHandler(async (req, res) => {
  const result = await service.listMessages(req.params.id, req.user.id, req.query);
  return success(res, {
    data: result.messages,
    meta: { total: result.total, page: result.page, limit: result.limit },
  });
});

const markRead = asyncHandler(async (req, res) => {
  await service.markMessagesRead(req.params.id, req.user.id);
  return success(res, { message: 'Messages marked as read' });
});

module.exports = {
  listConversations, startConversation, listMessages, markRead,
};
