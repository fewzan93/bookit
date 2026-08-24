import { Event, type IEvent } from '../models/event.model.js';
import { Seat, type ISeat } from '../models/seat.model.js';
import { Venue } from '../models/venue.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { randomId } from '../utils/slug.js';

export interface SeatSectionDTO {
  sectionId: string;
  name: string;
  tierId: string;
  rows: number;
  cols: number;
  startNumber: number;
  seats: { id: string; row: string; number: number; status: string; tierId: string }[];
}

export class SeatService {
  async expireStale(): Promise<number> {
    const result = await Seat.updateMany(
      { status: 'locked', lockedUntil: { $lte: new Date() } },
      { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
    ).exec();
    return result.modifiedCount;
  }

  async generatePlan(eventId: string): Promise<number> {
    const event = await Event.findById(eventId).exec();
    if (!event) throw new ApiError(404, 'Event not found');
    const venue = await Venue.findById(event.venueId).exec();
    if (!venue || venue.config.sections.length === 0) return 0;

    const tierIds = new Set(event.tiers.map((t) => t.tierId));
    const rows: ISeat[] = [];

    for (const section of venue.config.sections) {
      const tierId = tierIds.has(section.tierId) ? section.tierId : event.tiers[0]?.tierId ?? '';
      for (let r = 0; r < section.rows; r += 1) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 0; c < section.cols; c += 1) {
          rows.push({
            eventId: event.id,
            venueId: venue.id,
            sectionId: section.id,
            row: rowLabel,
            number: section.startNumber + c,
            tierId,
            status: 'available',
            sortKey: r * 1000 + c,
          } as unknown as ISeat);
        }
      }
    }

    if (rows.length === 0) return 0;
    await Seat.insertMany(rows);
    return rows.length;
  }

  async ensurePlan(eventId: string, force = false): Promise<number> {
    const count = await Seat.countDocuments({ eventId }).exec();
    if (count > 0 && !force) return count;
    await Seat.deleteMany({ eventId }).exec();
    return this.generatePlan(eventId);
  }

  async getMap(eventId: string, user?: { id: string; role: string }): Promise<{
    sections: SeatSectionDTO[];
    tiers: IEvent['tiers'];
    soldOutTierIds: string[];
  }> {
    const event = await Event.findById(eventId).exec();
    if (!event) throw new ApiError(404, 'Event not found');

    const isOwner = user && (user.role === 'admin' || event.organizerId.toString() === user.id);
    if (!isOwner && event.status !== 'published') {
      throw new ApiError(404, 'Event not found');
    }

    await this.ensurePlan(eventId);

    const venue = await Venue.findById(event.venueId).exec();
    const seats = await Seat.find({ eventId }).sort({ sectionId: 1, sortKey: 1 }).exec();

    const bySection = new Map<string, SeatSectionDTO>();
    for (const section of venue?.config.sections ?? []) {
      bySection.set(section.id, {
        sectionId: section.id,
        name: section.name,
        tierId: section.tierId,
        rows: section.rows,
        cols: section.cols,
        startNumber: section.startNumber,
        seats: [],
      });
    }

    for (const seat of seats) {
      const section = bySection.get(seat.sectionId) ?? {
        sectionId: seat.sectionId,
        name: seat.sectionId,
        tierId: seat.tierId,
        rows: 0,
        cols: 0,
        startNumber: 1,
        seats: [],
      };
      bySection.set(seat.sectionId, section);
      section.seats.push({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status: seat.status,
        tierId: seat.tierId,
      });
    }

    return {
      sections: [...bySection.values()],
      tiers: event.tiers,
      soldOutTierIds: event.tiers.filter((t) => t.sold >= t.capacity).map((t) => t.tierId),
    };
  }

  async expireLock(seatId: string, eventId: string): Promise<boolean> {
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, eventId, status: 'locked', lockedUntil: { $lte: new Date() } },
      { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
      { new: true },
    ).exec();
    return Boolean(seat);
  }

  async releaseLock(seatId: string, eventId: string, userId: string): Promise<boolean> {
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, eventId, status: 'locked', lockedBy: userId },
      { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
      { new: true },
    ).exec();
    return Boolean(seat);
  }

  async lockSeat(seatId: string, eventId: string, userId: string, until: Date): Promise<ISeat | null> {
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, eventId, status: 'available' },
      { $set: { status: 'locked', lockedBy: userId, lockedUntil: until } },
      { new: true },
    ).exec();
    return seat;
  }

  async extendMyLock(seatId: string, eventId: string, userId: string, until: Date): Promise<ISeat | null> {
    const seat = await Seat.findOneAndUpdate(
      { _id: seatId, eventId, status: 'locked', lockedBy: userId },
      { $set: { lockedUntil: until } },
      { new: true },
    ).exec();
    return seat;
  }

  newTimerId(): string {
    return randomId(10);
  }
}
