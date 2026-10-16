const router = require('express').Router();
const controller = require('./notifications.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');

router.use(requireAuth);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get('/', validate({ query: listQuery }), controller.list);
router.patch('/:id/read', validate({ params: z.object({ id: z.string().length(24) }) }), controller.markRead);

module.exports = router;
