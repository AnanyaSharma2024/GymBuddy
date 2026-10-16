const router = require('express').Router();
const controller = require('./buddy.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { buddyRequestLimiter } = require('../../middleware/rateLimit.middleware');
const {
  recommendationsQuerySchema, nearbyQuerySchema, listRequestsQuerySchema, objectIdParam,
} = require('./buddy.validators');

router.use(requireAuth);

router.get('/recommendations', validate({ query: recommendationsQuerySchema }), controller.recommendations);
router.get('/nearby', validate({ query: nearbyQuerySchema }), controller.nearby);

router.get('/requests', validate({ query: listRequestsQuerySchema }), controller.listRequests);
router.post(
  '/requests/:userId',
  buddyRequestLimiter,
  validate({ params: objectIdParam('userId') }),
  controller.sendRequest,
);
router.post(
  '/requests/:requestId/accept',
  validate({ params: objectIdParam('requestId') }),
  controller.acceptRequest,
);
router.post(
  '/requests/:requestId/reject',
  validate({ params: objectIdParam('requestId') }),
  controller.rejectRequest,
);
router.post(
  '/requests/:requestId/cancel',
  validate({ params: objectIdParam('requestId') }),
  controller.cancelRequest,
);

router.delete('/:userId', validate({ params: objectIdParam('userId') }), controller.unmatch);

module.exports = router;
