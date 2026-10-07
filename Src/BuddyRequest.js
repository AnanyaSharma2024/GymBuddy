const mongoose = require('mongoose');

const buddyRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    compatibilityScoreAtRequest: { type: Number, min: 0, max: 100 },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

// Prevent duplicate pending/accepted requests between the same pair in the
// same direction. Combined with app-level logic this also blocks
// "duplicate request" abuse.
buddyRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('BuddyRequest', buddyRequestSchema);
