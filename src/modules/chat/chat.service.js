const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const User = require('../../models/User');
const ApiError = require('../../utils/apiError');

// Finds an existing conversation between two users or creates one.
// Conversations are limited to exactly 2 participants (1:1 chat, per spec).
async function getOrCreateConversation(userIdA, userIdB) {
  if (userIdA === userIdB) throw ApiError.badRequest('Cannot start a conversation with yourself');

  const [userA, userB] = await Promise.all([User.findById(userIdA), User.findById(userIdB)]);
  if (!userB) throw ApiError.notFound('User not found');

  const aBlockedB = userA.blockedUsers?.some((id) => id.toString() === userIdB);
  const bBlockedA = userB.blockedUsers?.some((id) => id.toString() === userIdA);
  if (aBlockedB || bBlockedA) throw ApiError.forbidden('Unable to start a conversation with this user');

  let conversation = await Conversation.findOne({
    participants: { $all: [userIdA, userIdB], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({ participants: [userIdA, userIdB] });
  }
  return conversation;
}

async function assertMembership(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw ApiError.notFound('Conversation not found');
  const isMember = conversation.participants.some((id) => id.toString() === userId);
  if (!isMember) throw ApiError.forbidden('You are not a participant in this conversation');
  return conversation;
}

async function listConversations(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const [conversations, total] = await Promise.all([
    Conversation.find({ participants: userId })
      .populate('participants', 'name profileImage')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 }).skip(skip).limit(limit),
    Conversation.countDocuments({ participants: userId }),
  ]);
  return { conversations, total, page, limit };
}

async function listMessages(conversationId, userId, { page = 1, limit = 30 }) {
  await assertMembership(conversationId, userId);
  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments({ conversation: conversationId }),
  ]);
  return { messages: messages.reverse(), total, page, limit };
}

// Persists a message. Called both from the REST-adjacent flow and directly
// from the Socket.IO handler (chat.socket.js) so there is exactly one code
// path that writes messages to the DB.
async function createMessage(conversationId, senderId, text) {
  const conversation = await assertMembership(conversationId, senderId);

  const message = await Message.create({ conversation: conversationId, sender: senderId, text });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  const recipientId = conversation.participants.find((id) => id.toString() !== senderId);
  return { message, recipientId: recipientId?.toString() };
}

async function markMessagesRead(conversationId, userId) {
  await assertMembership(conversationId, userId);
  await Message.updateMany(
    { conversation: conversationId, sender: { $ne: userId }, status: { $ne: 'read' } },
    { $set: { status: 'read' }, $addToSet: { readBy: userId } },
  );
}

module.exports = {
  getOrCreateConversation, assertMembership, listConversations, listMessages, createMessage, markMessagesRead,
};
