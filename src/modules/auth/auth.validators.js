const { z } = require('zod');

const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State is required'),
  codeVerifier: z.string().min(43).max(128), // PKCE verifier, sent by the frontend that initiated the flow
});

const googleInitSchema = z.object({
  redirectAfterLogin: z.string().url().optional(),
});

module.exports = { googleCallbackSchema, googleInitSchema };
