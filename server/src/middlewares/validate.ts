import type { RequestHandler } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { ApiError } from './errorHandler.js';

export const validate = (schema: ZodTypeAny): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ApiError(400, 'Validation failed', result.error.issues));
      return;
    }
    req.body = result.data;
    next();
  };
};

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  role: z.enum(['user', 'organizer']).default('user'),
  phone: z.string().trim().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
