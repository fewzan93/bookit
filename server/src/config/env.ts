import { z } from 'zod';

const cleaned: Record<string, string | undefined> = {};
for (const [k, v] of Object.entries(process.env)) {
  cleaned[k] = typeof v === 'string' && v.trim() === '' ? undefined : v;
}
if (cleaned.CLIENT_ORIGIN) cleaned.CLIENT_ORIGIN = cleaned.CLIENT_ORIGIN.replace(/\/+$/, '');
if (cleaned.PUBLIC_URL) cleaned.PUBLIC_URL = cleaned.PUBLIC_URL.replace(/\/+$/, '');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/bookit'),
  JWT_SECRET: z.string().min(16).default('insecure-dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STATIC_URL: z.string().default('http://localhost:5000'),
  PUBLIC_URL: z.string().default('http://localhost:5173'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('Bookit <noreply@bookit.local>'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(cleaned);

if (!parsed.success) {
  console.error('[env] validation errors:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
