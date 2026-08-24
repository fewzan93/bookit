import type { ClientSession } from 'mongoose';
import { Ticket, type ITicket } from '../models/ticket.model.js';
import type { IBooking } from '../models/booking.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import { decodeQrPayload, encodeQrPayload, ticketRefOf } from '../utils/qrToken.js';

const QR_GRACE_HOURS = 12;

export class TicketService {
  async issueForBooking(booking: IBooking, session?: ClientSession | null): Promise<ITicket[]> {
    const startAt = booking.eventSnapshot.startAt instanceof Date ? booking.eventSnapshot.startAt : new Date(booking.eventSnapshot.startAt);
    // Grace window ends 12h after the event starts — but never sooner than 6h from
    // now, so tickets issued just before/after a (demo) start are still scannable.
    const expEpoch = Math.max(
      Math.floor(startAt.getTime() / 1000) + QR_GRACE_HOURS * 3600,
      Math.floor(Date.now() / 1000) + 6 * 3600,
    );

    const docs = booking.items.map((item) => ({
      ticketRef: ticketRefOf(),
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      eventSnapshot: booking.eventSnapshot,
      seatLabel: item.seatLabel,
      tierId: item.tierId,
      tierName: item.tierName,
      price: item.price,
      currency: item.currency,
      status: 'valid' as const,
      qrVersion: 1,
      qrExpEpoch: expEpoch,
      issuedAt: new Date(),
    }));

    return Ticket.insertMany(docs, { session: session ?? undefined });
  }

  async listMine(userId: string): Promise<ITicket[]> {
    return Ticket.find({ userId }).sort({ issuedAt: -1 }).exec();
  }

  private async getOwned(ticketRef: string, userId: string): Promise<ITicket> {
    const ticket = await Ticket.findOne({ ticketRef }).exec();
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    if (ticket.userId.toString() !== userId) throw new ApiError(403, 'This ticket belongs to another user');
    return ticket;
  }

  async getQr(ticketRef: string, userId: string): Promise<{ ticket: ITicket; qrRaw: string }> {
    const ticket = await this.getOwned(ticketRef, userId);
    return { ticket, qrRaw: this.qrFor(ticket) };
  }

  async rotate(ticketRef: string, userId: string): Promise<{ ticket: ITicket; qrRaw: string }> {
    const ticket = await this.getOwned(ticketRef, userId);
    ticket.qrVersion += 1;
    await ticket.save();
    return { ticket, qrRaw: this.qrFor(ticket) };
  }

  async scan(raw: string): Promise<{ status: 'valid' | 'used' | 'cancelled' | 'expired' | 'invalid'; ticket?: ITicket; message: string }> {
    const decoded = decodeQrPayload(raw);
    if (!decoded.ok) {
      if (decoded.reason === 'expired') {
        return { status: 'expired', message: 'Ticket expired — this check-in window has closed' };
      }
      return { status: 'invalid', message: 'QR code is not recognized by Bookit' };
    }
    const { ticketRef, version } = decoded.payload;

    const ticket = await Ticket.findOne({ ticketRef }).exec();
    if (!ticket) return { status: 'invalid', message: 'Ticket not found' };
    if (ticket.qrVersion !== version) {
      return { status: 'expired', message: 'This QR is out of date — ask the attendee to refresh it' };
    }
    if (ticket.status === 'cancelled') return { status: 'cancelled', message: 'Ticket has been cancelled / refunded' };
    if (ticket.status === 'used') return { status: 'used', message: 'Ticket was already checked in' };

    ticket.status = 'used';
    ticket.checkedInAt = new Date();
    await ticket.save();
    return { status: 'valid', ticket, message: 'Check-in approved' };
  }

  qrFor(ticket: ITicket): string {
    return encodeQrPayload({
      ticketRef: ticket.ticketRef,
      version: ticket.qrVersion,
      eventId: ticket.eventId.toString(),
      expEpoch: ticket.qrExpEpoch,
    });
  }

  async cancelForBooking(bookingId: string, session?: ClientSession | null): Promise<void> {
    await Ticket.updateMany({ bookingId }, { $set: { status: 'cancelled' } }).session(session ?? null).exec();
  }
}
