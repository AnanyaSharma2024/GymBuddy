const { z } = require('zod');

const recommendationsQuerySchema = z.object({
  radius: z.coerce.number().min(1).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const nearbyQuerySchema = z.object({
  radius: z.coerce.number().min(1).max(50).default(5),
});

const listRequestsQuerySchema = z.object({
  direction: z.enum(['incoming', 'outgoing']).default('incoming'),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const objectIdParam = (name) => z.object({ [name]: z.string().length(24) });

module.exports = {
  recommendationsQuerySchema, nearbyQuerySchema, listRequestsQuerySchema, objectIdParam,
};
