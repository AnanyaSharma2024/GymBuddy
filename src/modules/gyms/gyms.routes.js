const router = require('express').Router();
const controller = require('./gyms.controller');
const validate = require('../../middleware/validate.middleware');

const {
  requireAuth,
  requireRole,
} = require('../../middleware/auth.middleware');

const { z } = require('zod');

const {
  listQuerySchema,
  nearbyQuerySchema,
  createGymSchema,
} = require('./gyms.validators');

const gymIdSchema = z.object({
  id: z.string().length(24),
});

router.use(requireAuth);

// Admin-only routes — keep before /:id
router.get(
  '/admin/pending',
  requireRole('admin'),
  controller.listPending,
);

router.patch(
  '/admin/:id/approve',
  requireRole('admin'),
  validate({ params: gymIdSchema }),
  controller.approve,
);

router.patch(
  '/admin/:id/reject',
  requireRole('admin'),
  validate({ params: gymIdSchema }),
  controller.reject,
);

// Regular authenticated routes
router.get('/', validate({ query: listQuerySchema }), controller.list);
router.get('/nearby', validate({ query: nearbyQuerySchema }), controller.nearby);
router.get('/:id', validate({ params: gymIdSchema }), controller.getOne);
router.post('/', validate({ body: createGymSchema }), controller.create);

module.exports = router;