import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './config';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, { withCredentials: true });
  }
  return socket;
}

export type SeatStateEvent = {
  eventId: string;
  changes: { seatId: string; status: string; lockedBy?: string }[];
};
