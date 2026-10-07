const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    gym: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    visibleToBuddiesOnly: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true }, // check-in auto-expires (e.g. 3 hours later)
  },
  { timestamps: true },
);

// Auto-expire stale check-ins so "I'm at the gym now" doesn't linger forever.
checkInSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
checkInSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
