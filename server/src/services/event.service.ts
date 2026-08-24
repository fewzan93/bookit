import mongoose, { type PipelineStage } from 'mongoose';
import { Event, type IEvent } from '../models/event.model.js';
import { Venue } from '../models/venue.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { uniqueSlug } from '../utils/slug.js';
import type { EventCreateInput, EventUpdateInput, ListEventsQuery } from '../routes/event.routes.js';

const TIER_PREFIX = 'tier';

export interface PublicEventSummary {
  _id: string;
  title: string;
  slug: string;
  category: string;
  banner: { url: string };
  startAt: Date;
  city: string;
  address: string;
  currency: string;
  priceFrom: number;
  venue: { name: string; type: string; id: string } | null;
  organizer: { name: string } | null;
}

export class EventService {
  private tierId(index: number): string {
    return `${TIER_PREFIX}-${index + 1}`;
  }

  async create(input: EventCreateInput, organizerId: string): Promise<IEvent> {
    const venue = await Venue.findById(input.venueId).exec();
    if (!venue) throw new ApiError(404, 'Selected venue not found');

    const tiers = input.tiers.map((t, i) => ({
      ...t,
      tierId: this.tierId(i),
      currency: t.currency ?? 'USD',
      sold: 0,
    }));

    const event = await Event.create({
      title: input.title,
      slug: uniqueSlug(input.title),
      description: input.description,
      category: input.category,
      banner: { url: input.bannerUrl, publicId: input.bannerPublicId },
      venueId: venue.id,
      organizerId,
      startAt: input.startAt,
      endAt: input.endAt,
      status: input.status ?? 'draft',
      tiers,
      address: input.address ?? venue.address,
      city: input.city ?? venue.city,
      coordinates: [input.longitude, input.latitude],
      tags: input.tags ?? [],
    });

    return event;
  }

  async update(id: string, input: EventUpdateInput, organizerId: string): Promise<IEvent> {
    await this.assertOwner(id, organizerId);

    const patch: Record<string, unknown> = { ...input };
    if (input.bannerUrl !== undefined) {
      patch.banner = { url: input.bannerUrl, publicId: input.bannerPublicId };
      delete patch.bannerUrl;
      delete patch.bannerPublicId;
    }
    if (input.tiers !== undefined) {
      patch.tiers = input.tiers.map((t, i) => ({
        ...t,
        tierId: this.tierId(i),
        currency: t.currency ?? 'USD',
        sold: 0,
      }));
    }
    if (input.longitude !== undefined || input.latitude !== undefined) {
      const current = await Event.findById(id).select('coordinates').exec();
      patch.coordinates = [input.longitude ?? current!.coordinates[0], input.latitude ?? current!.coordinates[1]];
      delete patch.longitude;
      delete patch.latitude;
    }
    delete input.tiers;

    const event = await Event.findByIdAndUpdate(id, patch, { new: true, runValidators: true }).exec();
    if (!event) throw new ApiError(404, 'Event not found');
    return event;
  }

  async delete(id: string, organizerId: string): Promise<void> {
    await this.assertOwner(id, organizerId);
    await Event.findByIdAndDelete(id).exec();
  }

  async listMine(organizerId: string): Promise<IEvent[]> {
    return Event.find({ organizerId }).sort({ createdAt: -1 }).populate('venueId', 'name type').exec();
  }

  async getByKey(key: string, user?: { id: string; role: string }): Promise<IEvent> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(key);
    const query = isObjectId ? (mongoose.isValidObjectId(key) ? { _id: key } : { slug: key }) : { slug: key };

    const event = await Event.findOne(query)
      .populate('venueId', 'name type address city image')
      .populate('organizerId', 'name email')
      .exec();

    if (!event) throw new ApiError(404, 'Event not found');

    const isOwner = user && (user.role === 'admin' || event.organizerId.toString() === user.id);
    const isHidden = (event.status === 'draft' || event.status === 'cancelled') && !isOwner;
    if (isHidden) throw new ApiError(404, 'Event not found');

    return event;
  }

  async getRelated(id: string, limit = 4): Promise<IEvent[]> {
    const event = await Event.findById(id).exec();
    if (!event) throw new ApiError(404, 'Event not found');

    return Event.find({
      _id: { $ne: event.id },
      status: 'published',
      $or: [{ category: event.category }, { venueId: event.venueId }],
    })
      .sort({ startAt: 1 })
      .limit(limit)
      .select('title slug category banner startAt city tiers')
      .exec();
  }

  async listPublic(query: ListEventsQuery): Promise<{ events: PublicEventSummary[]; page: number; pages: number; total: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);

    const match: Record<string, unknown> = { status: 'published' };
    if (query.category) match.category = query.category;
    if (query.city) match.city = query.city;
    if (query.startFrom || query.startTo) {
      const range: Record<string, Date> = {};
      if (query.startFrom) range.$gte = query.startFrom;
      if (query.startTo) range.$lte = query.startTo;
      match.startAt = range;
    }
    if (query.query) {
      match.$or = [
        { title: { $regex: query.query, $options: 'i' } },
        { description: { $regex: query.query, $options: 'i' } },
        { tags: { $regex: query.query, $options: 'i' } },
      ];
    }

    const pipeline: PipelineStage[] = [{ $match: match }];
    pipeline.push({ $addFields: { priceFrom: { $min: '$tiers.price' } } });

    if (query.maxPrice !== undefined) {
      pipeline.push({ $match: { priceFrom: { $lte: query.maxPrice } } });
    }
    if (query.lng !== undefined && query.lat !== undefined) {
      pipeline.unshift({
        $geoNear: {
          near: { type: 'Point', coordinates: [query.lng, query.lat] },
          distanceField: 'distanceKm',
          maxDistance: (query.radiusKm ?? 50) * 1000,
          spherical: true,
          key: 'coordinates',
        },
      });
    }

    const sort: Record<string, 1 | -1> = {};
    if (query.sort === 'price') sort.priceFrom = 1;
    else if (query.sort === 'name') sort.title = 1;
    else sort.startAt = 1;

    const countPipeline: PipelineStage[] = structuredClone(pipeline);
    countPipeline.push({ $count: 'total' });
    const [countResult] = await Event.aggregate(countPipeline).exec();
    const total = (countResult as { total?: number })?.total ?? 0;

    pipeline.push(
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'venues',
          localField: 'venueId',
          foreignField: '_id',
          as: 'venue',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'organizerId',
          foreignField: '_id',
          as: 'organizer',
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          slug: 1,
          category: 1,
          banner: 1,
          startAt: 1,
          endAt: 1,
          city: 1,
          address: 1,
          currency: { $ifNull: [{ $first: '$tiers.currency' }, 'USD'] },
          priceFrom: 1,
          venue: {
            $cond: [
              { $gt: [{ $size: '$venue' }, 0] },
              { name: { $first: '$venue.name' }, type: { $first: '$venue.type' }, id: { $toString: { $first: '$venue._id' } } },
              null,
            ],
          },
          organizer: {
            $cond: [
              { $gt: [{ $size: '$organizer' }, 0] },
              { name: { $first: '$organizer.name' } },
              null,
            ],
          },
        },
      },
    );

    const events = await Event.aggregate(pipeline).exec();

    return {
      events: events as unknown as PublicEventSummary[],
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      total,
    };
  }

  private async assertOwner(id: string, organizerId: string): Promise<void> {
    const event = await Event.findById(id).select('organizerId').exec();
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizerId.toString() !== organizerId) {
      throw new ApiError(403, 'You can only manage your own events');
    }
  }
}
