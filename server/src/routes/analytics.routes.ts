import { Router } from 'express';
import { eventAnalytics, exportAttendees, exportOrders, summary } from '../controllers/analytics.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';

export const analyticsRoutes = Router();

analyticsRoutes.use(authRequired, requireRoles('organizer', 'admin'));
analyticsRoutes.get('/summary', summary);
analyticsRoutes.get('/events/:id', eventAnalytics);
analyticsRoutes.get('/events/:id/export/orders', exportOrders);
analyticsRoutes.get('/events/:id/export/attendees', exportAttendees);
