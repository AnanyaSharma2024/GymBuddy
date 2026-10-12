const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    type: {
      type: String,
      enum: ['buddy_request', 'buddy_request_accepted', 'new_message', 'workout_reminder', 'check_in'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }, // e.g. { requestId, conversationId }
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
