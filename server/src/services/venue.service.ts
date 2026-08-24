import { Venue, type IVenue, type VenueSectionConfig } from '../models/venue.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { randomId } from '../utils/slug.js';
import type { VenueCreateInput } from '../routes/venue.routes.js';

export class VenueService {
  async create(input: VenueCreateInput, ownerId: string): Promise<IVenue> {
    const existing = await Venue.findOne({ name: input.name, ownerId }).exec();
    if (existing) throw new ApiError(409, 'You already have a venue with this name');

    const sections: VenueSectionConfig[] = (input.config?.sections ?? []).map((s) => ({
      ...s,
      id: `sec-${randomId(8)}`,
    }));

    return Venue.create({
      ...input,
      config: { sections },
      coordinates: [input.longitude, input.latitude],
      ownerId,
    });
  }

  async listByOrganizer(ownerId: string): Promise<IVenue[]> {
    return Venue.find({ ownerId }).sort({ createdAt: -1 }).exec();
  }

  async getById(id: string): Promise<IVenue> {
    const venue = await Venue.findById(id).exec();
    if (!venue) throw new ApiError(404, 'Venue not found');
    return venue;
  }
}
