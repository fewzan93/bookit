import { Router } from 'express';
import { z } from 'zod';
import {
  cancelBooking,
  checkout,
  createBooking,
  devConfirm,
  getByRef,
  listMine,
  refundBooking,
  validatePromo,
} from '../controllers/booking.controller.js';
import { authRequired } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const bookingCreateSchema = z.object({
  eventId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid event id'),
  seatIds: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid seat id'))
    .min(1)
    .max(10),
  promoCode: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .transform((v) => v.toUpperCase())
    .optional(),
});

export const promoValidateSchema = z.object({
  code: z.string().trim().min(3).max(24).transform((v) => v.toUpperCase()),
  quantity: z.number().int().min(1).max(10),
});

export const bookingRoutes = Router();

bookingRoutes.use(authRequired);
bookingRoutes.get('/mine', listMine);
bookingRoutes.post('/', validate(bookingCreateSchema), createBooking);
bookingRoutes.post('/promos/validate', validate(promoValidateSchema), validatePromo);
bookingRoutes.get('/:ref', getByRef);
bookingRoutes.post('/:ref/checkout', checkout);
bookingRoutes.post('/:ref/dev-confirm', devConfirm);
bookingRoutes.post('/:ref/cancel', cancelBooking);
bookingRoutes.post('/:ref/refund', refundBooking);
