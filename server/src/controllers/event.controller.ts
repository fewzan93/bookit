import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { EventService } from '../services/event.service.js';
import { SeatService } from '../services/seat.service.js';
import type { ListEventsQuery } from '../routes/event.routes.js';

const eventService = new EventService();
const seatService = new SeatService();

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.create(req.body, req.user!.id);
  res.status(201).json({ success: true, message: 'Event created', data: { event } });
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.update(req.params.id, req.body, req.user!.id, req.user!.role);
  res.json({ success: true, message: 'Event updated', data: { event } });
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  await eventService.delete(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, message: 'Event deleted' });
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const events = await eventService.listMine(req.user!.id);
  res.json({ success: true, data: { events } });
});

export const listPublic = asyncHandler(async (req: Request, res: Response) => {
  const result = await eventService.listPublic(req.query as unknown as ListEventsQuery);
  res.json({ success: true, data: result });
});

export const getEventByKey = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getByKey(req.params.key, req.user);
  res.json({ success: true, data: { event } });
});

export const getRelated = asyncHandler(async (req: Request, res: Response) => {
  const events = await eventService.getRelated(req.params.id);
  res.json({ success: true, data: { events } });
});

export const getEventSeatMap = asyncHandler(async (req: Request, res: Response) => {
  const map = await seatService.getMap(req.params.id, req.user);
  res.json({ success: true, data: map });
});
