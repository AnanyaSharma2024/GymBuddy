// ============================================================================
// EXPRESS APP ASSEMBLY
// ============================================================================
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const logger = require('./utils/logger');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const gymsRoutes = require('./modules/gyms/gyms.routes');
const buddyRoutes = require('./modules/buddy/buddy.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const workoutsRoutes = require('./modules/workouts/workouts.routes');
const checkinsRoutes = require('./modules/checkins/checkins.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Trust the first proxy hop (needed behind a load balancer / Docker
// reverse proxy) so req.ip and rate limiting see the real client IP.
app.set('trust proxy', 1);

// --- Security headers ---
app.use(helmet());

// --- CORS: only the configured frontend origin, with credentials enabled
// (required for HttpOnly cookies to be sent cross-origin). ---
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));

// --- Body parsing with size limits (defends against large-payload DoS) ---
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// --- NoSQL injection protection: strips any request key starting with `$`
// or containing `.`, which is how Mongo operator injection is attempted
// through JSON bodies/query strings. ---
app.use(mongoSanitize());

// --- HTTP Parameter Pollution protection (e.g. ?role=user&role=admin) ---
app.use(hpp());

// --- Baseline rate limiting for all routes; stricter limits are layered
// on top for sensitive routes inside each module's router. ---
app.use('/api', generalLimiter);

// --- Lightweight request logging (method + path only, never bodies/headers
// that could contain tokens) ---
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/gyms', gymsRoutes);
app.use('/api/buddies', buddyRoutes);
app.use('/api/conversations', chatRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
