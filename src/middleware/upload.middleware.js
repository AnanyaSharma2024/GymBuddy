// Safe file upload handling for profile images.
// - memory storage (never written to disk) - buffer is streamed straight to Cloudinary
// - strict MIME allowlist (never trust the file extension alone)
// - file size cap
// - single file only, single field name
const multer = require('multer');
const ApiError = require('../utils/apiError');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPEG, PNG, or WEBP images are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

module.exports = { uploadSingleImage: upload.single('image') };
