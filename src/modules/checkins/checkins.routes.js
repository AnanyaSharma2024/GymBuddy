const router = require('express').Router();
const controller = require('./checkins.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');

router.use(requireAuth);

const createSchema = z.object({
  gym: z.string().length(24),
  visibleToBuddiesOnly: z.boolean().optional(),
});
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.post('/', validate({ body: createSchema }), controller.create);
router.get('/', validate({ query: listQuery }), controller.list);

module.exports = router;
