const mongoose = require('mongoose');

// Represents one logged-in device/session. We never store the raw refresh
// token/session id - only its SHA-256 hash - so a DB leak alone cannot be
// used to impersonate a user.
const refreshSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    revoked: { type: Boolean, default: false },
    replacedBy: { type: String, default: null }, // hash of the rotated successor, for reuse detection
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: MongoDB automatically deletes expired sessions.
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshSession', refreshSessionSchema);
