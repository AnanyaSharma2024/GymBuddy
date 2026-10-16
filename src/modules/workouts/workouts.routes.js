const router = require('express').Router();
const controller = require('./workouts.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');
const { createWorkoutSchema, updateWorkoutSchema, createLogSchema } = require('./workouts.validators');

router.use(requireAuth);

const idParam = z.object({ id: z.string().length(24) });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.post('/', validate({ body: createWorkoutSchema }), controller.create);
router.get('/', validate({ query: listQuery }), controller.list);
router.get('/logs', validate({ query: listQuery }), controller.listLogs);
router.post('/logs', validate({ body: createLogSchema }), controller.createLog);
router.get('/:id', validate({ params: idParam }), controller.getOne);
router.patch('/:id', validate({ params: idParam, body: updateWorkoutSchema }), controller.update);
router.delete('/:id', validate({ params: idParam }), controller.remove);

module.exports = router;
