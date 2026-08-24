import { Router } from 'express';
import { z } from 'zod';
import {
  createEvent,
  deleteEvent,
  getEventByKey,
  getEventSeatMap,
  getRelated,
  listMine,
  listPublic,
  updateEvent,
} from '../controllers/event.controller.js';
import { eventIcs } from '../controllers/waitlist.controller.js';
import { authOptional, authRequired } from '../middlewares/auth.js';
import { requireRoles } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';

export const tierSchema = z.object({
  name: z.string().trim().min(1).max(40),
  price: z.number().min(0),
  afterPrice: z.number().min(0).optional(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()).optional(),
  capacity: z.number().int().min(1).max(100000),
  activeUntil: z.coerce.date().optional(),
});

export const eventCreateSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(['music', 'theater', 'sports', 'conference', 'festival', 'comedy', 'other']),
  bannerUrl: z.string().min(1),
  bannerPublicId: z.string().optional(),
  venueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid venue id'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
  tiers: z.array(tierSchema).min(1).max(6),
});

export const eventUpdateSchema = eventCreateSchema.partial();

export const listQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  category: z.enum(['music', 'theater', 'sports', 'conference', 'festival', 'comedy', 'other']).optional(),
  city: z.string().trim().max(80).optional(),
  startFrom: z.coerce.date().optional(),
  startTo: z.coerce.date().optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['date', 'price', 'name']).default('date'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type ListEventsQuery = z.infer<typeof listQuerySchema>;

export const eventRoutes = Router();

eventRoutes.get('/', authOptional, async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid query', errors: parsed.error.issues });
  }
  req.query = parsed.data as unknown as typeof req.query;
  next();
}, listPublic);

eventRoutes.get('/mine', authRequired, requireRoles('organizer', 'admin'), listMine);
eventRoutes.post('/', authRequired, requireRoles('organizer', 'admin'), validate(eventCreateSchema), createEvent);
eventRoutes.get('/:id/related', getRelated);
eventRoutes.get('/:id/seats', authOptional, getEventSeatMap);
eventRoutes.get('/:id/ics', authOptional, eventIcs);
eventRoutes.get('/:key', authOptional, getEventByKey);
eventRoutes.patch('/:id', authRequired, requireRoles('organizer', 'admin'), validate(eventUpdateSchema), updateEvent);
eventRoutes.delete('/:id', authRequired, requireRoles('organizer', 'admin'), deleteEvent);
