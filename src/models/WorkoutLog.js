const mongoose = require('mongoose');

const workoutLogSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    workout: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout', required: true },
    completedAt: { type: Date, default: Date.now },
    durationMinutes: { type: Number, min: 0 },
    notes: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);

workoutLogSchema.index({ owner: 1, completedAt: -1 });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
