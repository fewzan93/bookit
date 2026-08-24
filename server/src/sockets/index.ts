import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { env } from '../config/env.js';
import { SeatService } from '../services/seat.service.js';
import { resolveSocketUser } from './auth.js';
import { SeatLockEngine } from './seatLockEngine.js';

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    const user = resolveSocketUser(socket);
    if (!user) {
      next(new Error('Unauthorized'));
      return;
    }
    socket.data.user = user;
    next();
  });

  const engine = new SeatLockEngine(io, new SeatService());

  void seatRecoverySweep();

  io.on('connection', (socket) => {
    engine.registerHandlers(socket);
  });

  return io;
}

/** Server restarts lose in-memory lock timers — release anything already expired. */
async function seatRecoverySweep(): Promise<void> {
  try {
    const count = await new SeatService().expireStale();
    if (count > 0) console.log(`[seat] recovery: released ${count} expired seat lock(s)`);
  } catch (err) {
    console.warn('[seat] recovery sweep skipped:', err instanceof Error ? err.message : err);
  }
}
