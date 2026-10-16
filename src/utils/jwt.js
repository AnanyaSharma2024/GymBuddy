// JWT helpers.
//
// ACCESS TOKEN: short-lived (15m default), signed with JWT_ACCESS_SECRET,
// contains only { sub: userId, role }. Sent to the browser as an HttpOnly,
// Secure, SameSite=Lax cookie ("access_token"). Also readable by the
// Authorization: Bearer header for non-browser clients (e.g. React Native,
// which cannot use browser cookies the same way).
//
// REFRESH TOKEN: we do NOT put refresh privileges inside a long-lived JWT
// alone. Instead we use a rotating opaque-session model (see
// models/RefreshSession.js + modules/auth/auth.service.js):
//   - a random session ID (uuid) is generated
//   - only a HASH of it is stored in MongoDB (bcrypt-ish via crypto sha256)
//   - the raw session ID is put inside a short JWT wrapper (refresh_token
//     cookie) purely so we can verify integrity/expiry cheaply before
//     hitting the DB
// This means stealing the DB alone does not give you usable refresh tokens,
// and stealing the cookie alone still requires the session to be valid
// (not revoked, not already rotated/reused) in the DB.
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function signRefreshWrapper(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

function verifyRefreshWrapper(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken, verifyAccessToken, signRefreshWrapper, verifyRefreshWrapper,
};
