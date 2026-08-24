import cron from 'node-cron';
import { Ticket } from '../models/ticket.model.js';
import { User } from '../models/user.model.js';
import { notifyReminder } from '../services/mailer.service.js';

/**
 * Hourly: find valid tickets whose event starts within the next 24h and that
 * haven't been reminded yet. One email per booking (counts all of its tickets).
 */
export async function runReminderScan(): Promise<void> {
  const now = Date.now();
  const soon = new Date(now + 24 * 3600 * 1000);

  const candidates = await Ticket.find({
    status: 'valid',
    reminderSentAt: { $exists: false },
    'eventSnapshot.startAt': { $gte: new Date(now), $lte: soon },
  })
    .sort({ 'eventSnapshot.startAt': 1 })
    .limit(300)
    .exec();

  const byBooking = new Map<string, typeof candidates>();
  for (const ticket of candidates) {
    const key = ticket.bookingId.toString();
    byBooking.set(key, [...(byBooking.get(key) ?? []), ticket]);
  }

  for (const tickets of byBooking.values()) {
    const ticket = tickets[0];
    const user = await User.findById(ticket.userId).select('email name').exec();
    if (!user) continue;
    try {
      await notifyReminder(user.email, ticket, tickets.length);
      await Ticket.updateMany(
        { bookingId: ticket.bookingId },
        { $set: { reminderSentAt: new Date() } },
      ).exec();
    } catch (err) {
      console.error('[reminders] failed:', err);
    }
  }
}

export function scheduleCronJobs(): void {
  cron.schedule('15 * * * *', () => {
    void runReminderScan().catch((err) => console.error('[reminders] scan error:', err));
  });
  cron.schedule('*/20 * * * *', () => {
    void runExpiryScan().catch((err) => console.error('[expiry] scan error:', err));
  });
  console.log('[cron] reminders (hourly) + unpaid expiry (20min) scheduled');
}

/**
 * Pending bookings whose payment hold expired: mark expired, free the seats,
 * roll back promo usage and drain the waitlist.
 */
async function runExpiryScan(): Promise<void> {
  const stale = await import('../models/booking.model.js').then((m) =>
    m.Booking.find({ status: 'pending', expiresAt: { $lte: new Date() } }).limit(100).exec(),
  );
  if (stale.length === 0) return;

  for (const booking of stale) {
    await import('../models/seat.model.js').then((m) =>
      m.Seat.updateMany(
        {
          _id: { $in: booking.items.map((i) => i.seatId as unknown as string) },
          eventId: booking.eventId,
          lockedBy: booking.userId,
        },
        { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
      ).exec(),
    );

    if (booking.promoCode) {
      await import('../models/promo.model.js').then((m) =>
        m.PromoCode.updateOne({ code: booking.promoCode! }, { $inc: { usedCount: -1 } }).exec(),
      );
    }

    booking.status = 'expired';
    await booking.save();

    const freed = new Map<string, number>();
    for (const item of booking.items) freed.set(item.tierId, (freed.get(item.tierId) ?? 0) + 1);
    const { WaitlistService } = await import('../services/waitlist.service.js');
    await new WaitlistService()
      .drain(booking.eventId.toString(), [...freed.entries()].map(([tierId, count]) => ({ tierId, count })))
      .catch((err) => console.error('[expiry] waitlist drain failed:', err));
  }
}
