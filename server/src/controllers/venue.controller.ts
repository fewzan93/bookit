import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { VenueService } from '../services/venue.service.js';

const venueService = new VenueService();

export const createVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await venueService.create(req.body, req.user!.id);
  res.status(201).json({ success: true, message: 'Venue created', data: { venue } });
});

export const listVenues = asyncHandler(async (req: Request, res: Response) => {
  const venues = await venueService.listByOrganizer(req.user!.id);
  res.json({ success: true, data: { venues } });
});

export const getVenue = asyncHandler(async (req: Request, res: Response) => {
  const venue = await venueService.getById(req.params.id);
  if (req.user!.role !== 'admin' && venue.ownerId.toString() !== req.user!.id) {
    throw new ApiError(403, 'You can only view your own venues');
  }
  res.json({ success: true, data: { venue } });
});
