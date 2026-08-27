import { Router } from 'express';
import { z } from 'zod';
import { createVenue, getVenue, listVenues } from '../controllers/venue.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';

export const venueSectionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tierId: z.string().trim().min(1).max(40),
  rows: z.number().int().min(1).max(50),
  cols: z.number().int().min(1).max(50),
  startNumber: z.number().int().min(1).max(1000).default(1),
});

export const venueSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['hall', 'stadium', 'conference', 'outdoor', 'classroom']).default('hall'),
  address: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
  image: z.string().url().optional(),
  config: z
    .object({
      sections: z.array(venueSectionSchema).max(12).default([]),
    })
    .optional(),
});

export type VenueCreateInput = z.infer<typeof venueSchema>;

export const venueRoutes = Router();

venueRoutes.use(authRequired, requireRoles('organizer', 'admin'));
venueRoutes.get('/', listVenues);
venueRoutes.post('/', validate(venueSchema), createVenue);
venueRoutes.get('/:id', getVenue);
