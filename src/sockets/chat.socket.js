// Per-connection chat event handlers.
// Rule: every payload from the client is treated as untrusted. We never
// use a client-supplied userId/senderId - the sender is always
// socket.userId, established during the authenticated handshake.
const { z } = require('zod');
const chatService = require('../modules/chat/chat.service');
const notificationsService = require('../modules/notifications/notifications.service');
const logger = require('../utils/logger');

const MAX_MESSAGE_LENGTH = 2000;

const sendMessageSchema = z.object({
  conversationId: z.string().length(24),
  text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const joinConversationSchema = z.object({ conversationId: z.string().length(24) });
const typingSchema = z.object({ conversationId: z.string().length(24), isTyping: z.boolean() });

function registerChatHandlers(io, socket) {
  // Client must explicitly ask to join a conversation room; server verifies
  // membership before allowing it. Clients cannot join arbitrary rooms.
  socket.on('conversation:join', async (payload, ack) => {
    try {
      const { conversationId } = joinConversationSchema.parse(payload);
      await chatService.assertMembership(conversationId, socket.userId);
      socket.join(`conversation:${conversationId}`);
      ack?.({ success: true });
    } catch (err) {
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on('conversation:leave', (payload) => {
    const { conversationId } = payload || {};
    if (conversationId) socket.leave(`conversation:${conversationId}`);
  });

  socket.on('message:send', async (payload, ack) => {
    try {
      const { conversationId, text } = sendMessageSchema.parse(payload);
      const { message, recipientId } = await chatService.createMessage(conversationId, socket.userId, text);

      io.to(`conversation:${conversationId}`).emit('message:new', message);

      // Also emit directly to the recipient's personal room in case they
      // haven't joined the conversation room yet (e.g. app just opened).
      io.to(`user:${recipientId}`).emit('message:new', message);

      // Fire an in-app + push notification only if the recipient isn't
      // actively viewing this conversation (best-effort: we just always
      // notify here and let notification preferences/read-state handle noise;
      // a production system could check "is recipient's socket currently
      // joined to this conversation room" before notifying).
      await notificationsService.notify(recipientId, {
        type: 'new_message',
        title: 'New message',
        body: text.length > 80 ? `${text.slice(0, 77)}...` : text,
        data: { conversationId },
      });

      ack?.({ success: true, data: message });
    } catch (err) {
      logger.warn('message:send failed', { error: err.message, userId: socket.userId });
      ack?.({ success: false, message: err.message });
    }
  });

  socket.on('message:typing', async (payload) => {
    try {
      const { conversationId, isTyping } = typingSchema.parse(payload);
      await chatService.assertMembership(conversationId, socket.userId);
      socket.to(`conversation:${conversationId}`).emit('message:typing', { userId: socket.userId, isTyping });
    } catch (err) {
      // typing indicator failures are non-critical - just ignore
    }
  });

  socket.on('message:delivered', async (payload) => {
    try {
      const { conversationId } = joinConversationSchema.parse(payload);
      await chatService.assertMembership(conversationId, socket.userId);
      io.to(`conversation:${conversationId}`).emit('message:delivered', { conversationId, userId: socket.userId });
    } catch (err) {
      // non-critical
    }
  });

  socket.on('message:read', async (payload) => {
    try {
      const { conversationId } = joinConversationSchema.parse(payload);
      await chatService.markMessagesRead(conversationId, socket.userId);
      io.to(`conversation:${conversationId}`).emit('message:read', { conversationId, userId: socket.userId });
    } catch (err) {
      // non-critical
    }
  });
}

module.exports = registerChatHandlers;
