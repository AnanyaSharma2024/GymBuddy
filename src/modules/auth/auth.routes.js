const router = require('express').Router();
const controller = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { authLimiter, refreshLimiter } = require('../../middleware/rateLimit.middleware');
const { z } = require('zod');
const { googleCallbackSchema } = require('./auth.validators');

const initSchema = z.object({ codeChallenge: z.string().min(43).max(128) });
const refreshSchema = z.object({ refreshToken: z.string().optional() });

// All auth endpoints are rate-limited more strictly than general API
// routes since they are the primary target for brute-force / enumeration
// / OAuth abuse.
router.post('/google/init', authLimiter, validate({ body: initSchema }), controller.googleInit);
router.post('/google/callback', authLimiter, validate({ body: googleCallbackSchema }), controller.googleCallback);
router.post('/refresh', refreshLimiter, validate({ body: refreshSchema }), controller.refresh);
router.post('/logout', controller.logout);
router.post('/logout-all', requireAuth, controller.logoutAll);
router.get('/me', requireAuth, controller.me);

module.exports = router;
