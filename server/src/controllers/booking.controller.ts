import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BookingService } from '../services/booking.service.js';
import { PromoService } from '../services/promo.service.js';

const bookingService = new BookingService();
const promoService = new PromoService();

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.create(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Booking created — seats held', data: { booking } });
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookingService.createCheckout(req.params.ref, req.user!.id);
  res.json({ success: true, message: 'Checkout ready', data: result });
});

export const devConfirm = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.devConfirm(req.params.ref, req.user!.id);
  res.json({ success: true, message: 'Payment simulated & booking confirmed', data: { booking } });
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.cancel(req.params.ref, req.user!.id);
  res.json({ success: true, message: 'Booking cancelled — seats released', data: { booking } });
});

export const refundBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.refund(req.params.ref, req.user!.id);
  res.json({ success: true, message: 'Refund processed — seats released', data: { booking } });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listMine(req.user!.id);
  res.json({ success: true, data: { bookings } });
});

export const getByRef = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.getForUser(req.params.ref, req.user!.id);
  res.json({ success: true, data: { booking } });
});

export const validatePromo = asyncHandler(async (req: Request, res: Response) => {
  const { code, quantity } = req.body;
  const promo = await promoService.validateForCheckout(code, quantity);
  res.json({ success: true, data: { valid: true, promo } });
});
