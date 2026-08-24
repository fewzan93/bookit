import type { Server, Socket } from 'socket.io';
import { Event } from '../models/event.model.js';
import { Seat } from '../models/seat.model.js';
import { SeatService } from '../services/seat.service.js';

const DEFAULT_LOCK_SECONDS = 8 * 60;
const MAX_SEATS_PER_LOCK = 10;

interface LockChange {
  seatId: string;
  status: string;
  lockedBy?: string;
  lockedUntil?: string;
}

export class SeatLockEngine {
  private readonly io: Server;
  private readonly seats: SeatService;
  private readonly timers = new Map<string, { timer: ReturnType<typeof setTimeout>; eventId: string }>();

  constructor(io: Server, seats: SeatService) {
    this.io = io;
    this.seats = seats;
  }

  registerHandlers(socket: Socket): void {
    socket.on('seatmap:join', (payload: { eventId?: string }, cb?: (r: unknown) => void) => {
      void this.handleJoin(socket, payload, cb);
    });

    socket.on('seatmap:leave', (payload: { eventId?: string }, cb?: (r: unknown) => void) => {
      const eventId = typeof payload?.eventId === 'string' ? payload.eventId : '';
      void socket.leave(`event:${eventId}`);
      cb?.({ ok: true });
    });

    socket.on('seat:lock', (payload: { eventId?: string; seatIds?: string[] }, cb?: (r: unknown) => void) => {
      void this.handleLock(socket, payload, cb);
    });

    socket.on('seat:release', (payload: { eventId?: string; seatIds?: string[] }, cb?: (r: unknown) => void) => {
      void this.handleRelease(socket, payload, cb);
    });

    socket.on('seat:heartbeat', (payload: { eventId?: string; seatIds?: string[] }, cb?: (r: unknown) => void) => {
      void this.handleHeartbeat(socket, payload, cb);
    });
  }

  private validateEventId(eventId?: string): string | null {
    return typeof eventId === 'string' && /^[0-9a-fA-F]{24}$/.test(eventId) ? eventId : null;
  }

  private async handleJoin(socket: Socket, payload: { eventId?: string }, cb?: (r: unknown) => void): Promise<void> {
    const eventId = this.validateEventId(payload?.eventId);
    if (!eventId) {
      cb?.({ ok: false, message: 'Invalid event' });
      return;
    }
    await socket.join(`event:${eventId}`);
    cb?.({ ok: true, eventId });
  }

  private async handleLock(
    socket: Socket,
    payload: { eventId?: string; seatIds?: string[] },
    cb?: (r: unknown) => void,
  ): Promise<void> {
    const user = socket.data.user as { id: string };
    const eventId = this.validateEventId(payload?.eventId);
    const seatIds = Array.isArray(payload?.seatIds) ? [...new Set(payload.seatIds)] : [];

    if (!eventId || seatIds.length === 0 || seatIds.length > MAX_SEATS_PER_LOCK) {
      cb?.({ ok: false, message: `Select between 1 and ${MAX_SEATS_PER_LOCK} seats` });
      return;
    }

    const until = new Date(Date.now() + DEFAULT_LOCK_SECONDS * 1000);
    const locked: LockChange[] = [];
    const conflicts: string[] = [];

    const event = await Event.findById(eventId).select('tiers').exec();
    if (!event) {
      cb?.({ ok: false, message: 'Event not found' });
      return;
    }
    const soldOutTierIds = new Set(event.tiers.filter((t) => t.sold >= t.capacity).map((t) => t.tierId));
    const seatDocs = await Seat.find({ _id: { $in: seatIds }, eventId }).select('tierId status').exec();
    const tierBySeat = new Map(seatDocs.map((s) => [s.id.toString(), s.tierId]));
    const soldOutSeats = seatIds.filter((id) => soldOutTierIds.has(tierBySeat.get(id) ?? ''));

    for (const seatId of seatIds) {
      if (soldOutSeats.includes(seatId)) {
        conflicts.push(seatId);
        continue;
      }
      const fresh = await this.seats.lockSeat(seatId, eventId, user.id, until);
      if (fresh) {
        locked.push({ seatId: fresh.id, status: 'locked', lockedBy: user.id, lockedUntil: until.toISOString() });
        this.setTimer(seatId, eventId, until);
        continue;
      }
      const mine = await this.seats.extendMyLock(seatId, eventId, user.id, until);
      if (mine) {
        locked.push({ seatId: mine.id, status: 'locked', lockedBy: user.id, lockedUntil: until.toISOString() });
        this.setTimer(seatId, eventId, until);
        continue;
      }
      conflicts.push(seatId);
    }

    if (locked.length > 0) this.broadcast(eventId, locked);

    cb?.({
      ok: conflicts.length === 0,
      message: conflicts.length === 0 ? 'Seats locked' : `${conflicts.length} seat(s) are no longer available`,
      timeoutSec: DEFAULT_LOCK_SECONDS,
      conflicts,
      seatIds: locked.map((s) => s.seatId),
    });
  }

  private async handleRelease(
    socket: Socket,
    payload: { eventId?: string; seatIds?: string[] },
    cb?: (r: unknown) => void,
  ): Promise<void> {
    const user = socket.data.user as { id: string };
    const eventId = this.validateEventId(payload?.eventId);
    const seatIds = Array.isArray(payload?.seatIds) ? payload.seatIds : [];
    if (!eventId) {
      cb?.({ ok: false, message: 'Invalid event' });
      return;
    }
    const changed: LockChange[] = [];
    for (const seatId of seatIds) {
      const released = await this.seats.releaseLock(seatId, eventId, user.id);
      if (released) {
        this.clearTimer(seatId);
        changed.push({ seatId, status: 'available' });
      }
    }
    if (changed.length > 0) this.broadcast(eventId, changed);
    cb?.({ ok: true });
  }

  private async handleHeartbeat(
    socket: Socket,
    payload: { eventId?: string; seatIds?: string[] },
    cb?: (r: unknown) => void,
  ): Promise<void> {
    const user = socket.data.user as { id: string };
    const eventId = this.validateEventId(payload?.eventId);
    const seatIds = Array.isArray(payload?.seatIds) ? payload.seatIds : [];
    if (!eventId) {
      cb?.({ ok: false });
      return;
    }
    const until = new Date(Date.now() + DEFAULT_LOCK_SECONDS * 1000);
    let extended = 0;
    for (const seatId of seatIds) {
      const seat = await this.seats.extendMyLock(seatId, eventId, user.id, until);
      if (seat) {
        extended += 1;
        this.setTimer(seatId, eventId, until);
      }
    }
    cb?.({ ok: true, extended, timeoutSec: DEFAULT_LOCK_SECONDS });
  }

  private setTimer(seatId: string, eventId: string, until: Date): void {
    this.clearTimer(seatId);
    const delay = Math.max(until.getTime() - Date.now(), 1000);
    const timer = setTimeout(() => {
      void this.expire(seatId, eventId);
    }, delay);
    this.timers.set(seatId, { timer, eventId });
  }

  private clearTimer(seatId: string): void {
    const entry = this.timers.get(seatId);
    if (entry) {
      clearTimeout(entry.timer);
      this.timers.delete(seatId);
    }
  }

  private async expire(seatId: string, eventId: string): Promise<void> {
    this.timers.delete(seatId);
    try {
      const released = await this.seats.expireLock(seatId, eventId);
      if (released) this.broadcast(eventId, [{ seatId, status: 'available' }]);
    } catch {
      void 0;
    }
  }

  private broadcast(eventId: string, changes: LockChange[]): void {
    this.io.to(`event:${eventId}`).emit('seats:state', { eventId, changes });
  }
}
