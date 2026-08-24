import type { RequestHandler } from 'express';
import { ApiError } from './errorHandler.js';

export const requireRoles = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, 'Not authenticated'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'You do not have permission to perform this action'));
      return;
    }
    next();
  };
};
