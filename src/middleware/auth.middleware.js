// Authentication + authorization middleware.
//
// requireAuth: verifies the access token (cookie first, then Authorization
// header for mobile clients), loads a minimal user identity onto req.user.
// Does NOT hit the DB on every request for the full user document - only
// the fields needed for authorization decisions are trusted from the JWT
// (sub, role). Controllers that need full profile data fetch it explicitly.
//
// requireRole: simple RBAC gate (currently 'user' | 'admin').
const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

function extractToken(req) {
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired session');
  }

  // Confirm the account still exists and is not suspended/deactivated.
  // We deliberately keep this lookup cheap (lean + projection).
  const user = await User.findById(payload.sub)
    .select('_id role accountStatus')
    .lean();

  if (!user || user.accountStatus !== 'active') {
    throw ApiError.unauthorized('Account not available');
  }

  req.user = { id: user._id.toString(), role: user.role };
  next();
});

// Does not fail if unauthenticated; just attaches req.user if present.
// Useful for endpoints that behave differently for logged-in vs anonymous
// users but don't strictly require auth.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('_id role accountStatus').lean();
    if (user && user.accountStatus === 'active') {
      req.user = { id: user._id.toString(), role: user.role };
    }
  } catch (err) {
    // silently ignore invalid token for optional auth
  }
  next();
});

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
