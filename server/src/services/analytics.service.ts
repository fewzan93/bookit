import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { Ticket } from '../models/ticket.model.js';
import { ApiError } from '../middlewares/errorHandler.js';

interface DayBucket {
  date: string;
  label: string;
  count: number;
  revenue: number;
}

export class AnalyticsService {
  private async assertOwnerEvent(eventId: string, organizerId: string, role?: string): Promise<void> {
    const event = await Event.findById(eventId).select('organizerId').exec();
    if (!event) throw new ApiError(404, 'Event not found');
    if (role === 'admin') return;
    if (event.organizerId.toString() !== organizerId) throw new ApiError(403, 'Not your event');
  }

  async summary(organizerId: string): Promise<{
    revenue: number;
    ticketsSold: number;
    capacity: number;
    usedTickets: number;
    issuedTickets: number;
    events: { _id: string; title: string; slug: string; status: string; sold: number; capacity: number; revenue: number; startAt: Date }[];
  }> {
    const events = await Event.find({ organizerId }).select('title slug status startAt tiers').exec();
    const eventIds = events.map((e) => e.id);

    const confirmed: { total: number; eventId: string; paidAt?: Date }[] = await Booking.find({
      eventId: { $in: eventIds },
      status: 'confirmed',
    })
      .select('total eventId paidAt')
      .exec()
      .then((docs) => docs.map((d) => ({ total: d.total, eventId: d.eventId.toString(), paidAt: d.paidAt })));

    const revenueByEvent = new Map<string, number>();
    let revenue = 0;
    for (const b of confirmed) {
      revenue += b.total;
      revenueByEvent.set(b.eventId, (revenueByEvent.get(b.eventId) ?? 0) + b.total);
    }

    const tickets = await Ticket.find({ eventId: { $in: eventIds } }).select('eventId status').exec();
    const issued = tickets.length;
    const used = tickets.filter((t) => t.status === 'used').length;

    let ticketsSold = 0;
    let capacity = 0;

    const rows = events.map((e) => {
      const sold = e.tiers.reduce((s, t) => s + t.sold, 0);
      const cap = e.tiers.reduce((s, t) => s + t.capacity, 0);
      ticketsSold += sold;
      capacity += cap;
      return {
        _id: e.id,
        title: e.title,
        slug: e.slug,
        status: e.status,
        sold,
        capacity: cap,
        revenue: revenueByEvent.get(e.id) ?? 0,
        startAt: e.startAt,
      };
    });

    return {
      revenue,
      ticketsSold,
      capacity,
      usedTickets: used,
      issuedTickets: issued,
      events: rows,
    };
  }

  async eventAnalytics(eventId: string, organizerId: string, role?: string): Promise<{
    overview: { sold: number; capacity: number; revenue: number; bookings: number; attendance: number; attendanceRate: number };
    daily: DayBucket[];
    peakHours: { hour: number; count: number }[];
    tiers: { tierId: string; name: string; sold: number; capacity: number; revenue: number }[];
    recentBookings: { bookingRef: string; total: number; status: string; paidAt?: Date }[];
  }> {
    await this.assertOwnerEvent(eventId, organizerId, role);

    const event = await Event.findById(eventId).exec();
    if (!event) throw new ApiError(404, 'Event not found');

    const bookings = await Booking.find({ eventId, status: 'confirmed' }).exec();
    const revenue = bookings.reduce((s, b) => s + b.total, 0);

    const dailyMap = new Map<string, DayBucket>();
    const peaks = new Array(24).fill(0) as number[];
    for (const b of bookings) {
      const paid = b.paidAt ?? b.createdAt;
      if (!paid) continue;
      const key = paid.toISOString().slice(0, 10);
      const bucket = dailyMap.get(key) ?? { date: key, label: key, count: 0, revenue: 0 };
      bucket.count += 1;
      bucket.revenue += b.total;
      dailyMap.set(key, bucket);
      peaks[paid.getHours()] += 1;
    }
    const daily = [...dailyMap.values()]
      .map((d) => ({ ...d, label: d.date.slice(5) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const tickets = await Ticket.find({ eventId }).exec();
    const attendanceRate = tickets.length > 0 ? tickets.filter((t) => t.status === 'used').length / tickets.length : 0;

    const tiers = event.tiers.map((t) => ({
      tierId: t.tierId,
      name: t.name,
      sold: t.sold,
      capacity: t.capacity,
      revenue: bookings.reduce((sum, b) => sum + b.items.filter((i) => i.tierId === t.tierId).reduce((s, i) => s + i.price, 0), 0),
    }));

    return {
      overview: {
        sold: event.tiers.reduce((s, t) => s + t.sold, 0),
        capacity: event.tiers.reduce((s, t) => s + t.capacity, 0),
        revenue,
        bookings: bookings.length,
        attendance: tickets.filter((t) => t.status === 'used').length,
        attendanceRate,
      },
      daily,
      peakHours: peaks.map((count, hour) => ({ hour, count })).filter((p) => p.count > 0),
      tiers,
      recentBookings: bookings
        .slice(-8)
        .reverse()
        .map((b) => ({ bookingRef: b.bookingRef, total: b.total, status: b.status, paidAt: b.paidAt })),
    };
  }

  async ordersCsv(eventId: string, organizerId: string, role?: string): Promise<string> {
    await this.assertOwnerEvent(eventId, organizerId, role);
    const bookings = await Booking.find({ eventId }).populate('userId', 'email name').exec();

    const rows = [['bookingRef', 'userEmail', 'holderName', 'seats', 'total', 'currency', 'status', 'paidAt']];
    for (const b of bookings) {
      const user = b.userId as unknown as { email?: string; name?: string };
      rows.push([
        b.bookingRef,
        user?.email ?? '',
        user?.name ?? '',
        b.items.map((i) => i.seatLabel).join('|'),
        String(b.total),
        b.currency,
        b.status,
        b.paidAt?.toISOString() ?? '',
      ]);
    }
    return toCsv(rows);
  }

  async attendeesCsv(eventId: string, organizerId: string, role?: string): Promise<string> {
    await this.assertOwnerEvent(eventId, organizerId, role);
    const tickets = await Ticket.find({ eventId }).populate('userId', 'email name').exec();

    const rows = [['ticketRef', 'userEmail', 'holderName', 'seat', 'tier', 'status', 'checkedInAt']];
    for (const t of tickets) {
      const user = t.userId as unknown as { email?: string; name?: string };
      rows.push([
        t.ticketRef,
        user?.email ?? '',
        user?.name ?? '',
        t.seatLabel ?? 'GA',
        t.tierName,
        t.status,
        t.checkedInAt?.toISOString() ?? '',
      ]);
    }
    return toCsv(rows);
  }
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(','),
    )
    .join('\r\n');
}
