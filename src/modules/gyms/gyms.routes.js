const router = require('express').Router();
const controller = require('./gyms.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { z } = require('zod');
const { listQuerySchema, nearbyQuerySchema, createGymSchema } = require('./gyms.validators');

// Gym directory browsing does not strictly require auth, but we still
// require it here to keep the MVP simple and avoid unauthenticated
// scraping of the gym directory / rate-limit bypass surface.
router.use(requireAuth);

router.get('/', validate({ query: listQuerySchema }), controller.list);
router.get('/nearby', validate({ query: nearbyQuerySchema }), controller.nearby);
router.get('/:id', validate({ params: z.object({ id: z.string().length(24) }) }), controller.getOne);
router.post('/', validate({ body: createGymSchema }), controller.create);

module.exports = router;
