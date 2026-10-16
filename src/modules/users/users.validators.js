const { z } = require('zod');

const coordinateSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  age: z.number().int().min(13).max(100).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  genderPreference: z.enum(['male', 'female', 'any']).optional(),
  fitnessGoal: z.enum(['weight_loss', 'muscle_gain', 'general_fitness', 'endurance', 'strength', 'flexibility']).optional(),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  preferredWorkoutTime: z.enum(['early_morning', 'morning', 'afternoon', 'evening', 'night', 'flexible']).optional(),
  gym: z.string().length(24).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  bio: z.string().max(300).optional(),
  ageRangePreference: z.object({
    min: z.number().int().min(13).max(100),
    max: z.number().int().min(13).max(100),
  }).refine((v) => v.min <= v.max, 'min must be <= max').optional(),
  location: coordinateSchema.optional(),
  privacy: z.object({
    showProfile: z.boolean().optional(),
    showGym: z.boolean().optional(),
    showApproxDistance: z.boolean().optional(),
    allowBuddyRequests: z.boolean().optional(),
    checkInVisible: z.boolean().optional(),
  }).partial().optional(),
  notificationPreferences: z.object({
    buddyRequests: z.boolean().optional(),
    chat: z.boolean().optional(),
    workoutReminders: z.boolean().optional(),
    checkIns: z.boolean().optional(),
  }).partial().optional(),
});

const registerDeviceTokenSchema = z.object({
  token: z.string().min(10),
});

module.exports = { updateMeSchema, registerDeviceTokenSchema };
