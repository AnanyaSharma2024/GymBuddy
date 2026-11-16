
const mongoose = require('mongoose');

const BuddyRequest = require('../../models/BuddyRequest');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const User = require('../../models/User');
const ApiError = require('../../utils/apiError');

// Find an existing conversation or create a new one.
async function getOrCreateConversation(userIdA, userIdB) {
  if (userIdA === userIdB) {
    throw ApiError.badRequest('Cannot start a conversation with yourself');
  }

  const [userA, userB] = await Promise.all([
    User.findById(userIdA),
    User.findById(userIdB),
  ]);

  if (!userA || !userB) {
    throw ApiError.notFound('User not found');
  }

  const connection = await BuddyRequest.findOne({
    status: 'accepted',
    $or: [
      { sender: userIdA, recipient: userIdB },
      { sender: userIdB, recipient: userIdA },
    ],
  });

  if (!connection) {
    throw ApiError.forbidden('You can chat only with connected buddies');
  }

  const aBlockedB = userA.blockedUsers?.some(
    (id) => id.toString() === userIdB.toString()
  );

  const bBlockedA = userB.blockedUsers?.some(
    (id) => id.toString() === userIdA.toString()
  );

  if (aBlockedB || bBlockedA) {
    throw ApiError.forbidden('Unable to start a conversation with this user');
  }

  let conversation = await Conversation.findOne({
    participants: mongoose.trusted({
      $all: [userIdA, userIdB],
      $size: 2,
    }),
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userIdA, userIdB],
    });
  }

  return conversation;
}

// Check whether the user belongs to the conversation.
async function assertMembership(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    throw ApiError.notFound('Conversation not found');
  }

  const isMember = conversation.participants.some(
    (id) => id.toString() === userId.toString()
  );

  if (!isMember) {
    throw ApiError.forbidden('You are not a participant in this conversation');
  }

  return conversation;
}

// Get conversations with their latest message and unread count.
async function listConversations(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    Conversation.find({ participants: userId })
      .populate('participants', 'name profileImage')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit),

    Conversation.countDocuments({ participants: userId }),
  ]);

  const conversationsWithUnreadCount = await Promise.all(
    conversations.map(async (conversation) => {
      const unreadCount = await Message.countDocuments({
        conversation: conversation._id,
        sender: mongoose.trusted({ $ne: userId }),
        status: mongoose.trusted({ $ne: 'read' }),
      });

      return {
        ...conversation.toObject(),
        unreadCount,
      };
    })
  );

  return {
    conversations: conversationsWithUnreadCount,
    total,
    page,
    limit,
  };
}

// Get messages of a conversation in chronological order.
async function listMessages(conversationId, userId, { page = 1, limit = 30 }) {
  await assertMembership(conversationId, userId);

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Message.countDocuments({ conversation: conversationId }),
  ]);

  return {
    messages: messages.reverse(),
    total,
    page,
    limit,
  };
}

// Save a message and update the conversation's latest message.
async function createMessage(conversationId, senderId, text) {
  const conversation = await assertMembership(conversationId, senderId);

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    text,
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;

  await conversation.save();

  const recipientId = conversation.participants.find(
    (id) => id.toString() !== senderId.toString()
  );

  return {
    message,
    recipientId: recipientId?.toString(),
  };
}

// Mark messages received from the other user as read.
async function markMessagesRead(conversationId, userId) {
  await assertMembership(conversationId, userId);

  await Message.updateMany(
    {
      conversation: conversationId,
      sender: mongoose.trusted({ $ne: userId }),
      status: mongoose.trusted({ $ne: 'read' }),
    },
    {
      $set: { status: 'read' },
      $addToSet: { readBy: userId },
    }
  );
}

module.exports = {
  getOrCreateConversation,
  assertMembership,
  listConversations,
  listMessages,
  createMessage,
  markMessagesRead,
};
