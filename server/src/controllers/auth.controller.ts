import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthService } from '../services/auth.service.js';
import type { RegisterInput, LoginInput } from '../middlewares/validate.js';
import { serializeUser, setSession, signSession } from '../middlewares/auth.js';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body as RegisterInput);
  signSession(res, user);
  res.status(201).json({ success: true, message: 'Account created', data: { user: serializeUser(user) } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.login(req.body as LoginInput);
  signSession(res, user);
  res.json({ success: true, message: 'Welcome back', data: { user: serializeUser(user) } });
});

export const me = setSession;
