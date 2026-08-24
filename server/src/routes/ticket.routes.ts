import { Router } from 'express';
import { z } from 'zod';
import { downloadPdf, getQr, listMine, rotate, scan } from '../controllers/ticket.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';

export const scanSchema = z.object({
  payload: z.string().min(10).max(600),
});

export const ticketRoutes = Router();

ticketRoutes.use(authRequired);
ticketRoutes.get('/', listMine);
ticketRoutes.post('/scan', requireRoles('organizer', 'admin'), validate(scanSchema), scan);
ticketRoutes.get('/:ref/pdf', downloadPdf);
ticketRoutes.get('/:ref', getQr);
ticketRoutes.post('/:ref/rotate', rotate);
