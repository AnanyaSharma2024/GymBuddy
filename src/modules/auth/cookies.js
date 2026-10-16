const env = require('../../config/env');

// Cookie options shared by access + refresh cookies.
// - HttpOnly: JavaScript on the page cannot read them (mitigates XSS token theft)
// - Secure: only sent over HTTPS (disabled automatically outside production
//   so local http://localhost development still works)
// - SameSite=Lax: sent on top-level navigations/same-site requests but not
//   on cross-site POSTs from third-party pages (mitigates CSRF for the
//   cookie itself; we still recommend anti-CSRF tokens for state-changing
//   routes if the frontend is served from a different origin - see README)
const baseOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  path: '/',
};

function setAuthCookies(res, { accessToken, refreshCookieToken }) {
  res.cookie('access_token', accessToken, { ...baseOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshCookieToken, {
    ...baseOptions, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/api/auth',
  });
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { ...baseOptions });
  res.clearCookie('refresh_token', { ...baseOptions, path: '/api/auth' });
}

module.exports = { setAuthCookies, clearAuthCookies };
