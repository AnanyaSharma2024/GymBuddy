const env = require('../config/env');
const logger = require('../utils/logger');
const { fail } = require('../utils/response');

// Centralized error handler. This is the ONLY place that decides what
// error detail reaches the client. Full details always go to the logger
// (server-side only); the client only ever sees a safe message + status.
function notFoundHandler(req, res) {
  return fail(res, { status: 404, message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isApiError = err.isApiError;
  const status = isApiError ? err.status : 500;

  logger.error(err.message, {
    status,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  // Mongoose validation errors -> 422 with field-level messages
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return fail(res, { status: 422, message: 'Validation failed', errors });
  }

  // Duplicate key error (unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return fail(res, { status: 409, message: `${field} already in use` });
  }

  if (err.name === 'CastError') {
    return fail(res, { status: 400, message: 'Invalid identifier' });
  }

  const message = isApiError
    ? err.message
    : (env.NODE_ENV === 'production' ? 'Internal server error' : err.message);

  return fail(res, { status, message, errors: isApiError ? err.errors : [] });
}

module.exports = { notFoundHandler, errorHandler };
