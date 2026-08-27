import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AnalyticsService } from '../services/analytics.service.js';

const analyticsService = new AnalyticsService();

export const summary = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.summary(req.user!.id);
  res.json({ success: true, data });
});

export const eventAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.eventAnalytics(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, data });
});

export const exportOrders = asyncHandler(async (req: Request, res: Response) => {
  const csv = await analyticsService.ordersCsv(req.params.id, req.user!.id, req.user!.role);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${req.params.id}.csv"`);
  res.send(csv);
});

export const exportAttendees = asyncHandler(async (req: Request, res: Response) => {
  const csv = await analyticsService.attendeesCsv(req.params.id, req.user!.id, req.user!.role);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="attendees-${req.params.id}.csv"`);
  res.send(csv);
});
