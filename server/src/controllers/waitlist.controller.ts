import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { WaitlistService } from '../services/waitlist.service.js';
import { EventService } from '../services/event.service.js';
import { buildIcs } from '../utils/ics.js';

const waitlistService = new WaitlistService();
const eventService = new EventService();

export const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const { eventId, tierId } = req.body as { eventId: string; tierId: string };
  const entry = await waitlistService.join(req.user!.id, eventId, tierId);
  res.status(201).json({ success: true, message: 'You are on the waitlist — you will be notified when a seat opens', data: { entry } });
});

export const leaveWaitlist = asyncHandler(async (req: Request, res: Response) => {
  await waitlistService.leave(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Removed from the waitlist' });
});

export const listWaitlists = asyncHandler(async (req: Request, res: Response) => {
  const entries = await waitlistService.listMine(req.user!.id);
  res.json({ success: true, data: { entries } });
});

export const eventIcs = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getByKey(req.params.id, req.user);
  const ics = buildIcs({
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    description: event.description.slice(0, 400),
    venueName: (event.venueId as unknown as { name?: string })?.name,
    city: event.city,
    uid: event.slug,
  });
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${event.slug}.ics"`);
  res.send(ics);
});
