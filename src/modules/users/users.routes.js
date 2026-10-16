const router = require('express').Router();
const controller = require('./users.controller');
const validate = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { uploadSingleImage } = require('../../middleware/upload.middleware');
const { z } = require('zod');
const { updateMeSchema, registerDeviceTokenSchema } = require('./users.validators');

router.use(requireAuth);

router.get('/me', controller.getMe);
router.patch('/me', validate({ body: updateMeSchema }), controller.updateMe);
router.delete('/me', controller.deleteMe);

router.post('/me/profile-image', uploadSingleImage, controller.uploadProfileImage);

router.post('/me/device-tokens', validate({ body: registerDeviceTokenSchema }), controller.registerDeviceToken);
router.delete('/me/device-tokens', validate({ body: registerDeviceTokenSchema }), controller.removeDeviceToken);

const userIdParam = z.object({ userId: z.string().length(24) });
router.post('/:userId/block', validate({ params: userIdParam }), controller.blockUser);
router.delete('/:userId/block', validate({ params: userIdParam }), controller.unblockUser);

module.exports = router;
