import { Router } from 'express';
import { z } from 'zod';
import { joinWaitlist, leaveWaitlist, listWaitlists } from '../controllers/waitlist.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const joinSchema = z.object({
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event id'),
  tierId: z.string().trim().min(1).max(40),
});

export const waitlistRoutes = Router();

waitlistRoutes.use(authRequired);
waitlistRoutes.get('/', listWaitlists);
waitlistRoutes.post('/', validate(joinSchema), joinWaitlist);
waitlistRoutes.delete('/:id', leaveWaitlist);
