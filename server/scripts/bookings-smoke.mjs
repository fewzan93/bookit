import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000';
const email = 'test@bookit.dev';
const password = 'password123';

async function main() {
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

  async function api(path, method = 'GET', body) {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'content-type': 'application/json', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json();
    if (!j.success) throw new Error(`${method} ${path} failed: ${j.message}`);
    return j.data;
  }

  const list = await api(`/api/v1/events?query=Seat%20Test&limit=5`);
  const ev = list.events[0];
  if (!ev) throw new Error('no Seat Test event found');
  const eventId = ev._id;
  console.log(`event: ${ev.slug}`);

  const map = await api(`/api/v1/events/${eventId}/seats`);
  const available = map.sections.flatMap((s) => s.seats.filter((x) => x.status === 'available'));
  if (available.length < 6) throw new Error('need >= 6 available seats');
  const picks = available.slice(0, 3);

  const s = await new Promise((resolve, reject) => {
    const sock = io(BASE, { extraHeaders: { cookie }, transports: ['websocket'] });
    sock.on('connect', () => resolve(sock));
    sock.on('connect_error', (e) => reject(new Error(e.message)));
    setTimeout(() => reject(new Error('socket timeout')), 8000);
  });
  await new Promise((r) => s.emit('seatmap:join', { eventId }, () => r()));
  const lockAck = await new Promise((r) => s.emit('seat:lock', { eventId, seatIds: picks.map((p) => p.id) }, r));
  if (!lockAck.ok) throw new Error(`lock failed: ${JSON.stringify(lockAck)}`);

  const booking = (await api('/api/v1/bookings', 'POST', {
    eventId,
    seatIds: picks.map((p) => p.id),
    promoCode: 'EARLY10',
  })).booking;
  console.log(`booking: ${booking.bookingRef} total=${booking.total} (sub ${booking.subtotal}, promo ${booking.promoDiscount})`);
  const expectedTotal = Math.round((booking.subtotal - booking.promoDiscount) * 100) / 100;
  if (Math.abs(booking.total - expectedTotal) > 0.001) {
    throw new Error(`expected ${expectedTotal} total, got ${booking.total}`);
  }

  const checkout = await api(`/api/v1/bookings/${booking.bookingRef}/checkout`, 'POST');
  if (checkout.mode !== 'dev') throw new Error('expected dev mode without stripe keys');

  const confirmed = (await api(`/api/v1/bookings/${booking.bookingRef}/dev-confirm`, 'POST')).booking;
  if (confirmed.status !== 'confirmed') throw new Error('not confirmed');

  const after = await api(`/api/v1/events/${eventId}/seats`);
  const booked = after.sections.some((sec) => sec.seats.some((x) => picks.find((p) => p.id === x.id) && x.status === 'booked'));
  if (!booked) throw new Error('seats not booked in DB');

  const mine = await api('/api/v1/bookings/mine');
  if (!mine.bookings.some((b) => b.bookingRef === booking.bookingRef && b.status === 'confirmed')) {
    throw new Error('booking missing from history');
  }

  const refunded = (await api(`/api/v1/bookings/${booking.bookingRef}/refund`, 'POST')).booking;
  if (refunded.status !== 'refunded') throw new Error('refund failed');

  const released = await api(`/api/v1/events/${eventId}/seats`);
  const free = released.sections.some((sec) => sec.seats.some((x) => picks.find((p) => p.id === x.id) && x.status === 'available'));
  if (!free) throw new Error('seats not released after refund');

  const promoCheck = await api('/api/v1/bookings/promos/validate', 'POST', { code: 'EARLY10', quantity: 2 });
  if (promoCheck.promo.value !== 10) throw new Error('promo validate failed');

  s.close();
  console.log('booking smoke OK: lock -> create (promo) -> checkout dev -> confirm -> history -> refund -> release, all verified');
  process.exit(0);
}

main().catch((e) => {
  console.error('BOOKING SMOKE FAILED:', e.message ?? e);
  process.exit(1);
});
