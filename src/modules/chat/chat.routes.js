const router = require('express').Router();
const controller = require('./chat.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');

router.use(requireAuth);

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const idParam = z.object({ id: z.string().length(24) });

router.get('/', validate({ query: listQuery }), controller.listConversations);
router.post('/', validate({ body: z.object({ userId: z.string().length(24) }) }), controller.startConversation);
router.get('/:id/messages', validate({ params: idParam, query: listQuery }), controller.listMessages);
router.patch('/:id/read', validate({ params: idParam }), controller.markRead);

module.exports = router;
