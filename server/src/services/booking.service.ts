import mongoose, { type ClientSession } from 'mongoose';
import { Booking, type IBooking } from '../models/booking.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Event } from '../models/event.model.js';
import { Seat } from '../models/seat.model.js';
import type { IPromoCode } from '../models/promo.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { stripe, stripeConfigured } from '../config/stripe.js';
import { env } from '../config/env.js';
import { PromoService, toAppliedPromo } from './promo.service.js';
import { computeTotals, formatUsdCents } from './pricing.js';
import { TicketService } from './ticket.service.js';
import { effectiveTierPrice } from './tierPricing.js';
import { WaitlistService } from './waitlist.service.js';
import { notifyBookingConfirmed } from './mailer.service.js';

const PAYMENT_HOLD_MINUTES = 40;
const PAYMENT_HOLD_SESSION_MINUTES = 35;

export interface CreateBookingInput {
  eventId: string;
  seatIds: string[];
  promoCode?: string;
}

export const bookingRefOf = (): string =>
  `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export class BookingService {
  private readonly promos = new PromoService();

  /**
   * Runs work inside a Mongo session transaction when the environment supports
   * it (replica set / mongos). On a standalone dev database Mongo refuses
   * transactions with "Transaction numbers are only allowed on a replica set
   * member" — we re-run the same operations sequentially in that case.
   */
  private async inTransaction(fn: (session: ClientSession | null) => Promise<void>): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => fn(session));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/replica set|transaction numbers are only allowed/i.test(message)) {
        await fn(null);
        return;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async create(userId: string, input: CreateBookingInput): Promise<IBooking> {
    let created: IBooking | null = null;
    await this.inTransaction(async (session) => {
        const event = await Event.findById(input.eventId)
          .populate('venueId', 'name')
          .session(session)
          .exec();
        if (!event) throw new ApiError(404, 'Event not found');
        if (event.status !== 'published') throw new ApiError(409, 'This event is not open for bookings');
        if (event.startAt.getTime() < Date.now()) {
          throw new ApiError(409, 'This event has already started — seat sales are closed');
        }

        const seats = await Seat.find({ _id: { $in: input.seatIds }, eventId: event.id })
          .session(session)
          .exec();
        if (seats.length !== input.seatIds.length) {
          throw new ApiError(409, 'Some selected seats no longer exist');
        }
        const conflicts = seats.filter((s) => s.status !== 'locked' || s.lockedBy?.toString() !== userId);
        if (conflicts.length > 0) {
          throw new ApiError(409, 'Seats are no longer held by you — pick them again');
        }

        const currency = event.tiers[0]?.currency ?? 'USD';
        const tiersById = new Map(event.tiers.map((t) => [t.tierId, t]));
        const items = seats.map((s) => {
          const tier = tiersById.get(s.tierId);
          return {
            seatId: s.id,
            seatLabel: `${s.row}-${s.number}`,
            tierId: s.tierId,
            tierName: tier?.name ?? s.tierId,
            price: tier ? effectiveTierPrice(tier) : 0,
            currency,
          };
        });

        let promo = null;
        let promoDoc: IPromoCode | null = null;
        if (input.promoCode) {
          promoDoc = await this.promos.findValid(input.promoCode, seats.length, session);
          promo = toAppliedPromo(promoDoc);
        }

        const totals = computeTotals(
          items.map((i) => ({ price: i.price, currency: i.currency })),
          promo,
        );

        const holdUntil = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000);
        await Seat.updateMany(
          { _id: { $in: seats.map((s) => s.id) }, eventId: event.id },
          { $set: { lockedUntil: holdUntil } },
        ).session(session);

        const venue = event.venueId as unknown as { name?: string };
        const [booking] = await Booking.create(
          [
            {
              bookingRef: bookingRefOf(),
              userId,
              eventId: event.id,
              eventSnapshot: {
                title: event.title,
                slug: event.slug,
                startAt: event.startAt,
                venueName: venue?.name ?? '',
                city: event.city,
                bannerUrl: event.banner.url,
              },
              items,
              promoCode: promo?.code,
              promoDiscount: totals.promoDiscount,
              groupDiscount: totals.groupDiscount,
              subtotal: totals.subtotal,
              total: totals.total,
              currency: totals.currency,
              status: 'pending',
              expiresAt: new Date(Date.now() + PAYMENT_HOLD_SESSION_MINUTES * 60_000),
            },
          ],
          { session },
        );
        created = booking;

        if (promoDoc) await this.promos.consume(promoDoc, session);
    });

    return created!;
  }

  async createCheckout(bookingRef: string, userId: string): Promise<{ mode: 'stripe' | 'dev'; url: string | null }> {
    const booking = await this.getForUser(bookingRef, userId);

    if (!stripeConfigured()) {
      return { mode: 'dev', url: null };
    }

    const holder = stripe();
    const session = await holder.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: booking.id,
      line_items: [
        {
          price_data: {
            currency: (booking.currency || 'USD').toLowerCase(),
            unit_amount: formatUsdCents(booking.total),
            product_data: {
              name: `${booking.eventSnapshot.title} — ${booking.items.length} seat(s)`,
              description: `${booking.eventSnapshot.venueName} · ${booking.eventSnapshot.city}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.PUBLIC_URL}/booking/complete/${booking.bookingRef}`,
      cancel_url: `${env.PUBLIC_URL}/events/${booking.eventSnapshot.slug}/checkout?seats=${booking.items
        .map((i) => i.seatId)
        .join(',')}`,
      metadata: { bookingId: booking.id, bookingRef: booking.bookingRef },
      expires_at: Math.floor(Date.now() / 1000) + PAYMENT_HOLD_SESSION_MINUTES * 60,
      billing_address_collection: 'auto',
    });

    booking.stripeSessionId = session.id;
    await booking.save();
    return { mode: 'stripe', url: session.url };
  }

  async confirmFromStripe(sessionId: string, raw?: unknown): Promise<IBooking> {
    const booking = await Booking.findOne({ stripeSessionId: sessionId }).exec();
    if (!booking) throw new ApiError(404, 'Booking not found for session');
    if (booking.status === 'confirmed') return booking;
    return this.confirm(booking.id, sessionId, 'stripe', raw);
  }

  async devConfirm(bookingRef: string, userId: string): Promise<IBooking> {
    if (stripeConfigured()) {
      throw new ApiError(403, 'Dev payments are disabled in this environment');
    }
    const booking = await this.getForUser(bookingRef, userId);
    return this.confirm(booking.id, `dev_${booking.bookingRef}`, 'dev');
  }

  async confirm(
    bookingId: string,
    providerRef: string,
    provider: 'stripe' | 'dev' = 'dev',
    raw?: unknown,
  ): Promise<IBooking> {
    let confirmed: IBooking | null = null;
    await this.inTransaction(async (session) => {
      const booking = await Booking.findById(bookingId).session(session).exec();
      if (!booking) throw new ApiError(404, 'Booking not found');
      if (booking.status === 'confirmed') {
        confirmed = booking;
        return;
      }
      if (booking.status === 'cancelled' || booking.status === 'expired') {
        throw new ApiError(409, 'Booking is no longer payable');
      }

      await Seat.updateMany(
        { _id: { $in: booking.items.map((i) => i.seatId as unknown as string) }, eventId: booking.eventId },
        { $set: { status: 'booked' }, $unset: { lockedBy: true, lockedUntil: true } },
      ).session(session);

      const counts = new Map<string, number>();
      for (const item of booking.items) {
        counts.set(item.tierId, (counts.get(item.tierId) ?? 0) + 1);
      }
      for (const [tierId, count] of counts) {
        await Event.updateOne(
          { _id: booking.eventId, 'tiers.tierId': tierId },
          { $inc: { 'tiers.$.sold': count } },
        ).session(session);
      }

      booking.status = 'confirmed';
      booking.paidAt = new Date();
      await booking.save({ session });

      await new TicketService().issueForBooking(booking, session);

      await Transaction.create(
        [
          {
            bookingId: booking.id,
            ref: providerRef,
            amount: booking.total,
            currency: booking.currency,
            status: 'succeeded',
            provider,
            raw,
          },
        ],
        { session },
      );

      confirmed = booking;
    });

    if (confirmed) {
      const { User } = await import('../models/user.model.js');
      const confirmedBooking = confirmed as unknown as { userId: string };
      if (confirmedBooking.userId) {
        const user = await User.findById(confirmedBooking.userId).select('email').exec();
        if (user) {
          void notifyBookingConfirmed(user.email, confirmed).catch((err) => console.error('[mail] confirm failed:', err));
        }
      }
    }
    return confirmed!;
  }

  async cancel(bookingRef: string, userId: string): Promise<IBooking> {
    const booking = await this.getForUser(bookingRef, userId);
    if (booking.status !== 'pending') {
      throw new ApiError(409, 'Only unpaid bookings can be cancelled');
    }

    await this.inTransaction(async (session) => {
      await Seat.updateMany(
        {
          _id: { $in: booking.items.map((i) => i.seatId as unknown as string) },
          eventId: booking.eventId,
          lockedBy: userId,
        },
        { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
      ).session(session);
      booking.status = 'cancelled';
      await booking.save({ session });
    });
    await this.drainWaitlistFor(booking);
    return booking;
  }

  async refund(bookingRef: string, userId: string): Promise<IBooking> {
    const booking = await this.getForUser(bookingRef, userId);
    if (booking.status !== 'confirmed') throw new ApiError(409, 'Only confirmed bookings can be refunded');

    await this.inTransaction(async (session) => {
      if (stripeConfigured() && booking.stripeSessionId) {
        const striker = stripe();
        const stripeSession = await striker.checkout.sessions.retrieve(booking.stripeSessionId);
        if (stripeSession.payment_intent) {
          try {
            await striker.refunds.create({ payment_intent: stripeSession.payment_intent as string });
          } catch (err) {
            const code = (err as { code?: string })?.code;
            // Stripe dashboard refunds don't reach our DB — treat as already-done
            if (code !== 'charge_already_refunded') throw err;
          }
        }
      }

      await Seat.updateMany(
        { _id: { $in: booking.items.map((i) => i.seatId as unknown as string) }, eventId: booking.eventId },
        { $set: { status: 'available' }, $unset: { lockedBy: true, lockedUntil: true } },
      ).session(session);

      const counts = new Map<string, number>();
      for (const item of booking.items) counts.set(item.tierId, (counts.get(item.tierId) ?? 0) + 1);
      for (const [tierId, count] of counts) {
        await Event.updateOne(
          { _id: booking.eventId, 'tiers.tierId': tierId, 'tiers.sold': { $gte: count } },
          { $inc: { 'tiers.$.sold': -count } },
        ).session(session);
      }

      booking.status = 'refunded';
      await booking.save({ session });

      await new TicketService().cancelForBooking(booking.id, session);
    });

    await this.drainWaitlistFor(booking);
    return booking;
  }

  private async drainWaitlistFor(booking: IBooking): Promise<void> {
    const freed = new Map<string, number>();
    for (const item of booking.items) freed.set(item.tierId, (freed.get(item.tierId) ?? 0) + 1);
    await new WaitlistService()
      .drain(booking.eventId.toString(), [...freed.entries()].map(([tierId, count]) => ({ tierId, count })))
      .catch((err) => console.error('[waitlist] drain failed:', err));
  }

  async listMine(userId: string): Promise<IBooking[]> {
    return Booking.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getForUser(bookingRef: string, userId: string): Promise<IBooking> {
    const booking = await Booking.findOne({ bookingRef }).exec();
    if (!booking) throw new ApiError(404, 'Booking not found');
    if (booking.userId.toString() !== userId) throw new ApiError(403, 'This booking belongs to another user');
    return booking;
  }
}
