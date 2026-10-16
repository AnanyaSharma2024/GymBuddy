// ============================================================================
// GOOGLE OAUTH 2.0 - AUTHORIZATION CODE FLOW + PKCE
// ============================================================================
// Flow summary (see README.md "OAuth Flow" section for the full diagram):
//
// 1. Frontend generates a PKCE `code_verifier` (random string) and derives
//    `code_challenge = base64url(sha256(code_verifier))`.
// 2. Frontend calls POST /api/auth/google/init { codeChallenge } to get a
//    Google consent URL. The backend generates a random `state`, stores
//    state -> codeChallenge in Redis with a short TTL (10 min), and returns
//    the Google authorization URL (client secret never leaves the server).
// 3. Browser is redirected to Google, user consents, Google redirects back
//    to the FRONTEND's registered redirect URI with ?code&state.
// 4. Frontend POSTs { code, state, codeVerifier } to
//    POST /api/auth/google/callback.
// 5. Backend:
//      a. looks up `state` in Redis -> gets back the codeChallenge that was
//         registered for it (and deletes it - single use, prevents replay)
//      b. recomputes sha256(codeVerifier) and compares to the stored
//         codeChallenge (this IS the PKCE check - proves the caller
//         completing the exchange is the same one who started it)
//      c. exchanges `code` for Google tokens server-to-server (this call
//         DOES use GOOGLE_CLIENT_SECRET, which never touches the browser)
//      d. verifies the returned Google ID token's signature + audience
//      e. finds or creates the User by googleId
//      f. issues our OWN access token + refresh session (see jwt.js)
// ============================================================================

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');
const redis = require('../../config/redis');
const User = require('../../models/User');
const RefreshSession = require('../../models/RefreshSession');
const ApiError = require('../../utils/apiError');
const { signAccessToken, signRefreshWrapper, verifyRefreshWrapper } = require('../../utils/jwt');
const { sha256 } = require('../../utils/hash');
const logger = require('../../utils/logger');

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);

const STATE_TTL_SECONDS = 600; // 10 minutes - authorization codes/state should be short-lived
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, mirrors JWT_REFRESH_EXPIRES_IN

function base64UrlSha256(input) {
  return crypto.createHash('sha256').update(input).digest('base64url');
}

// Step 2: initiate flow
async function initGoogleAuth(codeChallenge) {
  if (!codeChallenge || codeChallenge.length < 43) {
    throw ApiError.badRequest('A valid PKCE code_challenge is required');
  }
  const state = uuidv4();
  await redis.set(`oauth:state:${state}`, codeChallenge, 'EX', STATE_TTL_SECONDS);

  const authUrl = googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    // We are not passing Google's own code_challenge here because Google's
    // token endpoint PKCE support varies by client type; instead we
    // implement our OWN application-level PKCE check against `state`
    // (above), which achieves the same "prove you're the party that
    // started the flow" guarantee end-to-end through our backend.
    prompt: 'select_account',
  });

  return { authUrl, state };
}

// Step 4-5: complete flow
async function completeGoogleAuth({ code, state, codeVerifier, ip, userAgent }) {
  const storedChallenge = await redis.get(`oauth:state:${state}`);
  if (!storedChallenge) {
    throw ApiError.badRequest('Invalid or expired state parameter');
  }
  // single use - delete immediately to prevent replay of the same state
  await redis.del(`oauth:state:${state}`);

  const computedChallenge = base64UrlSha256(codeVerifier);
  if (computedChallenge !== storedChallenge) {
    throw ApiError.badRequest('PKCE verification failed');
  }

  let tokens;
  try {
    ({ tokens } = await googleClient.getToken(code));
  } catch (err) {
    logger.warn('Google token exchange failed', { error: err.message });
    throw ApiError.badRequest('Invalid or expired authorization code');
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw ApiError.unauthorized('Failed to verify Google identity token');
  }

  if (!payload.email_verified) {
    throw ApiError.forbidden('Google account email is not verified');
  }

  let user = await User.findOne({ googleId: payload.sub }).select('+googleId');

  if (!user) {
    // Handle account mismatch: an existing user with this email but a
    // different googleId (shouldn't normally happen with Google as sole
    // provider, but guards against edge cases / future providers).
    const existingByEmail = await User.findOne({ email: payload.email });
    if (existingByEmail) {
      throw ApiError.conflict('An account with this email already exists under a different identity');
    }
    user = await User.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      googleId: payload.sub,
      profileImage: payload.picture || null,
    });
    logger.info('New user registered via Google OAuth', { userId: user._id.toString() });
  }

  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden('This account is not active');
  }

  const { accessToken, refreshCookieToken } = await issueSession(user, { ip, userAgent });
  return { user, accessToken, refreshCookieToken };
}

// Creates a new refresh session (used at login and at rotation time).
async function issueSession(user, { ip, userAgent }) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  const sessionId = uuidv4();
  const tokenHash = sha256(sessionId);

  await RefreshSession.create({
    user: user._id,
    tokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  // The cookie itself is a signed JWT WRAPPING the raw sessionId, so we can
  // cheaply reject tampered/expired cookies before ever touching the DB.
  const refreshCookieToken = signRefreshWrapper({ sid: sessionId, sub: user._id.toString() });

  return { accessToken, refreshCookieToken };
}

// Rotates a refresh session: validates it, revokes the old one, issues a
// new access token + new refresh session. Detects reuse of an already-
// rotated (or revoked) token, which is a strong signal of token theft -
// if detected, we revoke ALL sessions for that user as a precaution.
async function refreshSession({ refreshCookieToken, ip, userAgent }) {
  if (!refreshCookieToken) throw ApiError.unauthorized('No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshWrapper(refreshCookieToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = sha256(payload.sid);
  const session = await RefreshSession.findOne({ tokenHash });

  if (!session) throw ApiError.unauthorized('Session not recognized');

  if (session.revoked) {
    // REUSE DETECTION: this hash was already rotated away from (or
    // explicitly logged out). Someone is presenting a token we've already
    // invalidated - treat as probable theft and nuke every session for
    // this user, forcing a fresh login everywhere.
    await RefreshSession.updateMany({ user: session.user, revoked: false }, { revoked: true });
    logger.warn('Refresh token reuse detected - all sessions revoked', { userId: session.user.toString() });
    throw ApiError.unauthorized('Session invalid - please log in again');
  }

  if (session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session expired');
  }

  const user = await User.findById(session.user);
  if (!user || user.accountStatus !== 'active') {
    throw ApiError.unauthorized('Account not available');
  }

  // Rotate: mark old session revoked, create the new one.
  const { accessToken, refreshCookieToken: newRefreshCookieToken } = await issueSession(user, { ip, userAgent });
  const newSessionId = jwtSid(newRefreshCookieToken);

  session.revoked = true;
  session.replacedBy = sha256(newSessionId);
  await session.save();

  return { user, accessToken, refreshCookieToken: newRefreshCookieToken };
}

// small helper to pull the sid back out of a freshly-signed wrapper without
// a second round-trip through verifyRefreshWrapper's expiry check
function jwtSid(token) {
  const { verifyRefreshWrapper: verify } = require('../../utils/jwt');
  return verify(token).sid;
}

async function logout({ refreshCookieToken }) {
  if (!refreshCookieToken) return;
  try {
    const payload = verifyRefreshWrapper(refreshCookieToken);
    const tokenHash = sha256(payload.sid);
    await RefreshSession.updateOne({ tokenHash }, { revoked: true });
  } catch (err) {
    // token already invalid/expired - nothing to revoke, treat as success
  }
}

async function logoutAllSessions(userId) {
  await RefreshSession.updateMany({ user: userId, revoked: false }, { revoked: true });
}

module.exports = {
  initGoogleAuth, completeGoogleAuth, refreshSession, logout, logoutAllSessions,
};
