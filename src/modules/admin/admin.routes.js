const router = require('express').Router();
const controller = require('./admin.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { z } = require('zod');

// Every route here requires an authenticated user with role === 'admin'.
// Roles are never settable by the user themselves (see User model / users
// validators - `role` is not in the allowed update fields).
router.use(requireAuth, requireRole('admin'));

const listQuery = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const reviewSchema = z.object({
  status: z.enum(['reviewing', 'resolved', 'dismissed']),
  resolutionNotes: z.string().max(1000).optional(),
});
const idParam = z.object({ id: z.string().length(24) });
const userIdParam = z.object({ userId: z.string().length(24) });

router.get('/reports', validate({ query: listQuery }), controller.listReports);
router.patch('/reports/:id', validate({ params: idParam, body: reviewSchema }), controller.reviewReport);
router.post('/users/:userId/suspend', validate({ params: userIdParam }), controller.suspendUser);
router.post('/users/:userId/reactivate', validate({ params: userIdParam }), controller.reactivateUser);

module.exports = router;
