import type { Response } from 'express';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'bookit_token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    // Cross-site deployments (Vercel frontend ≠ API origin) require SameSite=None.
    // Vercel's CORS proxy keeps the browser origin-free, but keep it safe anyway.
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
}
