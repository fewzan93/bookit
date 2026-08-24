import type { Socket } from 'socket.io';
import { AUTH_COOKIE } from '../utils/cookies.js';
import { verifyToken } from '../utils/jwt.js';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
}

export function resolveSocketUser(socket: Socket): SocketUser | null {
  const cookieHeader = socket.handshake.headers.cookie ?? '';
  const token = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${AUTH_COOKIE}=`))
    ?.slice(AUTH_COOKIE.length + 1);

  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
