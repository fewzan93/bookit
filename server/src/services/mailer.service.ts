import type { IBooking } from '../models/booking.model.js';
import type { ITicket } from '../models/ticket.model.js';
import type { IWaitlist } from '../models/waitlist.model.js';
import { sendMail } from '../config/mail.js';

function shell(inner: string): string {
  return `<div style="background:#0a080f;color:#f4f3f8;font-family:Inter,Arial,sans-serif;padding:24px;border-radius:12px">
    <div style="max-width:520px;margin:0 auto;border:1px solid #262133;border-radius:10px;padding:24px">
      <p style="font-size:12px;letter-spacing:4px;color:#f6c453;margin:0 0 12px">BOOKIT</p>
      ${inner}
      <p style="margin-top:20px;font-size:11px;color:#a1a2b8">Bookit · Addis Ababa · Your seat, your night.</p>
    </div>
  </div>`;
}

export async function notifyBookingConfirmed(email: string, booking: IBooking): Promise<void> {
  await sendMail({
    to: email,
    subject: `Your tickets for ${booking.eventSnapshot.title}`,
    html: shell(`
      <h2 style="margin:0 0 8px">Booking confirmed</h2>
      <p style="color:#a1a2b8;font-size:14px">Ref <b style="color:#f4f3f8">${booking.bookingRef}</b> — ${booking.items.length} seat(s).</p>
      <p style="font-size:13px;color:#a1a2b8">Open &quot;My tickets&quot; for your QR codes. ${booking.eventSnapshot.venueName ? `Venue: ${booking.eventSnapshot.venueName}` : ''}</p>
    `),
  });
}

export async function notifyWaitlistSlot(email: string, entry: IWaitlist, message: string): Promise<void> {
  await sendMail({
    to: email,
    subject: `A seat opened for ${entry.eventSnapshot.title}`,
    html: shell(`
      <h2 style="margin:0 0 8px">You're up</h2>
      <p style="font-size:14px;color:#a1a2b8">${message}</p>
      <p style="font-size:13px;color:#a1a2b8">Grab your seat within 24 hours — the spot goes to the next person afterwards.</p>
    `),
  });
}

export async function notifyReminder(email: string, ticket: ITicket, count: number): Promise<void> {
  await sendMail({
    to: email,
    subject: `Tomorrow: ${ticket.eventSnapshot.title}`,
    html: shell(`
      <h2 style="margin:0 0 8px">Happening tomorrow</h2>
      <p style="font-size:14px;color:#a1a2b8">${count} ticket(s) for <b style="color:#f4f3f8">${ticket.eventSnapshot.title}</b>.</p>
      <p style="font-size:13px;color:#a1a2b8">Show your QR at the door — it refreshes, so the first scan at the gate counts.</p>
    `),
  });
}
