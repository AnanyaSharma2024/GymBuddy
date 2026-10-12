const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 1000, default: '' },
    category: {
      type: String,
      enum: ['strength', 'cardio', 'flexibility', 'mixed'],
      default: 'mixed',
    },
    exercises: [{
      name: { type: String, required: true, trim: true },
      sets: { type: Number, min: 0 },
      reps: { type: Number, min: 0 },
      durationMinutes: { type: Number, min: 0 },
      notes: { type: String, maxlength: 200 },
    }],
  },
  { timestamps: true },
);

module.exports = mongoose.model('Workout', workoutSchema);
