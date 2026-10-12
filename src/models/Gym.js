const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 250 },
    city: { type: String, required: true, trim: true, index: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    // Free-form metadata bucket so we can attach amenities/hours later
    // without a schema migration (e.g. { hasParking: true, "24x7": false })
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who first added it, optional
    verified: { type: Boolean, default: false }, // admin can verify legitimacy later
  },
  { timestamps: true },
);

gymSchema.index({ location: '2dsphere' });
gymSchema.index({ name: 'text', city: 'text' });

module.exports = mongoose.model('Gym', gymSchema);
