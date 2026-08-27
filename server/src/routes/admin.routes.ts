import { Router } from 'express';
import { seedDatabase } from '../controllers/seed.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';

export const adminRoutes = Router();

// All admin routes require auth + admin role
adminRoutes.use(authRequired, requireRoles('admin'));

adminRoutes.post('/seed', seedDatabase);
