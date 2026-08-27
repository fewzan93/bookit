import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { generalLimiter, authLimiter } from './middlewares/rateLimiter.js';
import { authRoutes } from './routes/auth.routes.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { eventRoutes } from './routes/event.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { venueRoutes } from './routes/venue.routes.js';
import { waitlistRoutes } from './routes/waitlist.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { stripeWebhook } from './controllers/webhook.controller.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());

  // Stripe webhook must receive the raw body for signature verification
  app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use('/uploads', express.static(path.resolve('uploads')));

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() },
    });
  });

  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/auth/register', authLimiter);
  app.use(generalLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/venues', venueRoutes);
  app.use('/api/v1/events', eventRoutes);
  app.use('/api/v1/upload', uploadRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/waitlists', waitlistRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
