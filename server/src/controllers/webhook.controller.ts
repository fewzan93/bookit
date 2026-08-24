import type { Request, Response } from 'express';
import { BookingService } from '../services/booking.service.js';
import { stripeConfigured } from '../config/stripe.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middlewares/errorHandler.js';

const bookingService = new BookingService();

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;

  let event: { type?: string; data?: { object?: { id?: string } } };
  if (stripeConfigured() && env.STRIPE_WEBHOOK_SECRET && sig) {
    const { stripe } = await import('../config/stripe.js');
    event = stripe().webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET) as never;
  } else {
    if (!sig) throw new ApiError(400, 'Missing stripe-signature header');
    event = JSON.parse(req.body.toString());
  }

  if (event.type === 'checkout.session.completed') {
    const sessionId = event.data?.object?.id as string | undefined;
    if (sessionId) {
      await bookingService.confirmFromStripe(sessionId, event);
    }
  }

  res.json({ success: true, received: true });
});
