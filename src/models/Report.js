const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    reason: {
      type: String,
      enum: ['harassment', 'spam', 'fake_profile', 'inappropriate_behavior', 'other'],
      required: true,
    },
    details: { type: String, maxlength: 1000, default: '' },
    status: {
      type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNotes: { type: String, maxlength: 1000 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Report', reportSchema);
