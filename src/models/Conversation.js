const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

// A conversation is uniquely identified by its two participants (sorted).
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
