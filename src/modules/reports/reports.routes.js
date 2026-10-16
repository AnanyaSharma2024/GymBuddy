const router = require('express').Router();
const controller = require('./reports.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');

router.use(requireAuth);

const createSchema = z.object({
  reportedUser: z.string().length(24),
  reason: z.enum(['harassment', 'spam', 'fake_profile', 'inappropriate_behavior', 'other']),
  details: z.string().max(1000).optional(),
});

router.post('/', validate({ body: createSchema }), controller.create);

module.exports = router;
