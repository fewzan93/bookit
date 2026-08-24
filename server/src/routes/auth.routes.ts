import { Router } from 'express';
import { type Request, type Response } from 'express';
import { login, me, register } from '../controllers/auth.controller.js';
import { authRequired, destroySession } from '../middlewares/auth.js';
import { validate, loginSchema, registerSchema } from '../middlewares/validate.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(registerSchema), register);
authRoutes.post('/login', validate(loginSchema), login);
authRoutes.post('/logout', (req: Request, res: Response) => destroySession(req, res, () => undefined));
authRoutes.get('/me', authRequired, me);
