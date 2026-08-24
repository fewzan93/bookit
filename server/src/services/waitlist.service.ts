import { Waitlist, type IWaitlist } from '../models/waitlist.model.js';
import { Event } from '../models/event.model.js';
import { Seat } from '../models/seat.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { tierSaleStopped } from './tierPricing.js';
import { notifyWaitlistSlot } from './mailer.service.js';

export class WaitlistService {
  async join(userId: string, eventId: string, tierId: string): Promise<IWaitlist> {
    const event = await Event.findById(eventId).exec();
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status !== 'published') throw new ApiError(409, 'This event is not accepting waitlist entries');

    const tier = event.tiers.find((t) => t.tierId === tierId);
    if (!tier) throw new ApiError(400, 'Unknown ticket tier');

    // "Sold out" = tier capacity reached OR the live seat plan has no free seats left.
    const availablePlanSeats = await Seat.countDocuments({ eventId, tierId, status: 'available' }).exec();
    if (!tierSaleStopped(tier) && availablePlanSeats > 0) {
      throw new ApiError(409, 'Seats are still available — just book now');
    }

    const existing = await Waitlist.findOne({ eventId, tierId, userId }).exec();
    if (existing && existing.status === 'queued') {
      throw new ApiError(409, 'You are already on this waitlist');
    }
    if (existing) existing.deleteOne().exec();

    return Waitlist.create({
      eventId,
      tierId,
      userId,
      status: 'queued',
      eventSnapshot: {
        title: event.title,
        slug: event.slug,
        startAt: event.startAt,
        venueName: (event.venueId as unknown as { name?: string })?.name ?? '',
        bannerUrl: event.banner.url,
      },
    });
  }

  async leave(userId: string, entryId: string): Promise<void> {
    const entry = await Waitlist.findOne({ _id: entryId, userId }).exec();
    if (!entry) throw new ApiError(404, 'Waitlist entry not found');
    await entry.deleteOne().exec();
  }

  async listMine(userId: string): Promise<IWaitlist[]> {
    return Waitlist.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async listQueued(eventId: string, tierId: string, count: number): Promise<IWaitlist[]> {
    return Waitlist.find({ eventId, tierId, status: 'queued' })
      .sort({ createdAt: 1 })
      .limit(count)
      .exec();
  }

  /**
   * FIFO drain: after seats free up (cancel / refund / unpaid expiry), notify the
   * oldest queued attendees in sequence. Order matters only for humans, but we
   * cap notifications at the freed slot count so demand pressure is fair.
   */
  async drain(eventId: string, freed: { tierId: string; count: number }[]): Promise<number> {
    let total = 0;
    for (const { tierId, count } of freed) {
      if (count <= 0) continue;
      const next = await this.listQueued(eventId, tierId, count);
      for (const entry of next) {
        const user = await User.findById(entry.userId).select('email name').exec();
        if (!user) continue;
        entry.status = 'notified';
        entry.notifiedAt = new Date();
        await entry.save();
        total += 1;
        await notifyWaitlistSlot(
          user.email,
          entry,
          `A ${tierId} seat opened up for “${entry.eventSnapshot.title}”. You have 24h to book.`,
        ).catch((err) => console.error('[waitlist] notify failed:', err));
      }
    }
    return total;
  }
}
