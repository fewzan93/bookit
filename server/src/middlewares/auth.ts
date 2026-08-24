import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { User, type IUser } from '../models/user.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { AUTH_COOKIE, clearAuthCookie, setAuthCookie } from '../utils/cookies.js';
import { signToken, verifyToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function serializeUser(user: IUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authRequired: RequestHandler = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const user = await resolveUserFromRequest(req);
  if (!user) throw new ApiError(401, 'Not authenticated');
  req.user = user;
  next();
});

export const authOptional: RequestHandler = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const user = await resolveUserFromRequest(req);
  if (user) req.user = user;
  next();
});

async function resolveUserFromRequest(req: Request): Promise<{ id: string; email: string; role: string } | null> {
  const cookieToken = req.cookies?.[AUTH_COOKIE] as string | undefined;
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : undefined;
  const token = cookieToken ?? headerToken;
  if (!token) return null;

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).exec();
    if (!user) return null;
    return { id: user.id, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export const setSession = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const user = await User.findById(req.user!.id).exec();
  if (!user) throw new ApiError(404, `User ${req.user!.id} not found`);
  res.json({ success: true, message: 'Session restored', data: { user: serializeUser(user) } });
});

export const signSession = (res: Response, user: IUser) => {
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  setAuthCookie(res, token);
};

export const destroySession = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out' });
});
