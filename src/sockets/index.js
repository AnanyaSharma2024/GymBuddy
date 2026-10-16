// ============================================================================
// SOCKET.IO SETUP
// ============================================================================
// Security model:
//  1. AUTHENTICATION happens once, at the handshake, via the same access
//     token used for REST calls (cookie or auth.token from the client).
//     We never trust a userId sent by the client in event payloads.
//  2. Every socket joins a private room named `user:<userId>` on connect -
//     this is how we target notifications/events at a specific user
//     without the client ever choosing its own room name.
//  3. Conversation-scoped rooms (`conversation:<id>`) are only joined after
//     the server verifies (via chat.service.assertMembership) that the
//     authenticated user is actually a participant. Clients cannot join
//     arbitrary rooms by guessing IDs.
//  4. Redis is wired in as the Socket.IO adapter so that if this app is
//     later horizontally scaled (multiple Node instances behind a load
//     balancer), events still reach a user connected to a *different*
//     instance than the one handling the HTTP request that triggered it.
// ============================================================================
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const env = require('../config/env');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');
const registerChatHandlers = require('./chat.socket');
const redis = require('../config/redis');

const PRESENCE_TTL_SECONDS = 90;

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').filter(Boolean).map((part) => {
      const [k, ...v] = part.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    }),
  );
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    maxHttpBufferSize: 1e5, // 100KB cap per socket frame - defends against oversized payload abuse
  });

  // Optional: only attaches the Redis adapter if a second Redis connection
  // can be established (keeps local/dev usage simple with a single instance).
  try {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    logger.warn('Socket.IO Redis adapter not attached (single-instance mode)', { error: err.message });
  }

  // --- Authentication middleware for every incoming socket connection ---
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies.access_token || socket.handshake.auth?.token;

      if (!token) return next(new Error('Authentication required'));

      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select('_id accountStatus').lean();
      if (!user || user.accountStatus !== 'active') return next(new Error('Account not available'));

      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.debug('Socket connected', { userId: socket.userId, socketId: socket.id });

    // Presence: short-TTL Redis key. We refresh it on connect and rely on
    // TTL expiry (rather than trusting a clean disconnect event, which can
    // be missed on network drops) as the source of truth for "online".
    await redis.set(`presence:${socket.userId}`, '1', 'EX', PRESENCE_TTL_SECONDS).catch(() => {});
    socket.broadcast.emit('presence:update', { userId: socket.userId, online: true });

    const heartbeat = setInterval(() => {
      redis.set(`presence:${socket.userId}`, '1', 'EX', PRESENCE_TTL_SECONDS).catch(() => {});
    }, 30000);

    registerChatHandlers(io, socket);

    socket.on('disconnect', async () => {
      clearInterval(heartbeat);
      logger.debug('Socket disconnected', { userId: socket.userId, socketId: socket.id });
      // Don't immediately mark offline - let the presence TTL expire in
      // case the user has another tab/device connected.
      const stillConnected = await io.in(`user:${socket.userId}`).fetchSockets();
      if (stillConnected.length === 0) {
        socket.broadcast.emit('presence:update', { userId: socket.userId, online: false });
      }
    });
  });

  return io;
}

module.exports = initSocket;
