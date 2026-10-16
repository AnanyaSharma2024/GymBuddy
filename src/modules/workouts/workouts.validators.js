const { z } = require('zod');

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sets: z.number().int().min(0).optional(),
  reps: z.number().int().min(0).optional(),
  durationMinutes: z.number().min(0).optional(),
  notes: z.string().max(200).optional(),
});

const createWorkoutSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(['strength', 'cardio', 'flexibility', 'mixed']).optional(),
  exercises: z.array(exerciseSchema).max(50).optional(),
});

const updateWorkoutSchema = createWorkoutSchema.partial();

const createLogSchema = z.object({
  workout: z.string().length(24),
  completedAt: z.coerce.date().optional(),
  durationMinutes: z.number().min(0).optional(),
  notes: z.string().max(300).optional(),
});

module.exports = { createWorkoutSchema, updateWorkoutSchema, createLogSchema };
