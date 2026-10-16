const { z } = require('zod');

const listQuerySchema = z.object({
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const nearbyQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radius: z.coerce.number().min(0.1).max(50).default(5),
});

const createGymSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(250).optional(),
  city: z.string().trim().min(1).max(100),
  location: z.object({
    lng: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
  }),
  metadata: z.record(z.any()).optional(),
});

module.exports = { listQuerySchema, nearbyQuerySchema, createGymSchema };
