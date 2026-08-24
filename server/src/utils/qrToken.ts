import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface QrPayload {
  ticketRef: string;
  version: number;
  eventId: string;
  expEpoch: number;
}

const PREFIX = 'BOOKIT1';

function signatureOf(body: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(body).digest('base64url');
}

export function encodeQrPayload(payload: QrPayload): string {
  const body = `${payload.ticketRef}.${payload.version}.${payload.eventId}.${payload.expEpoch}`;
  return `${PREFIX}|${body}|${signatureOf(body)}`;
}

export type QrDecodeResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: 'malformed' | 'tampered' | 'expired' };

export function decodeQrPayload(raw: string, nowEpoch?: number): QrDecodeResult {
  const parts = raw.split('|');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, reason: 'malformed' };

  const body = parts[1];
  const signature = parts[2];
  const expected = signatureOf(body);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'tampered' };

  const [ticketRef, versionStr, eventId, expEpochStr] = body.split('.');
  const version = Number(versionStr);
  const expEpoch = Number(expEpochStr);
  if (!ticketRef || !eventId || !Number.isInteger(version) || !Number.isFinite(expEpoch)) {
    return { ok: false, reason: 'malformed' };
  }

  const now = nowEpoch ?? Date.now() / 1000;
  if (expEpoch < now) return { ok: false, reason: 'expired' };

  return { ok: true, payload: { ticketRef, version, eventId, expEpoch } };
}

export function ticketRefOf(): string {
  return `TK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
