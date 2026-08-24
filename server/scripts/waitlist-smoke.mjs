import { io } from 'socket.io-client';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:5000';

async function login(email, password) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email} failed`);
  return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

async function api(cookie, path, method = 'GET', body, expect = 200) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if ([200, 201].includes(expect) && [200, 201].includes(r.status)) return j;
  if (r.status !== expect) throw new Error(`${method} ${path} -> ${r.status}: ${j.message}`);
  return j;
}

async function ensureUser(email, password) {
  try {
    return await login(email, password);
  } catch {
    const r = await fetch(`${BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke User', email, password, role: 'user' }),
    });
    if (!r.ok) throw new Error(`register ${email} failed: ${r.status}`);
    return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
}

async function main() {
  const org = await ensureUser('org@bookit.dev', 'password123');
  const a = await ensureUser('test@bookit.dev', 'password123');
  const b = await ensureUser('waitb@bookit.dev', 'password123');

  let ev;
  try {
    const venue = (await api(org, '/api/v1/venues', 'POST', {
      name: `OneSeat ${Date.now().toString().slice(-5)}`,
      type: 'concert',
      address: '1 Spot Ave',
      city: 'Addis Ababa',
      latitude: 9.02,
      longitude: 38.76,
      config: { sections: [{ name: 'Solo Block', tierId: 'tier-1', rows: 1, cols: 1, startNumber: 1 }] },
    }, 201)).data.venue;
    ev = (await api(org, '/api/v1/events', 'POST', {
      title: `One Seat Night ${Date.now().toString().slice(-5)}`,
      description: 'Waitlist FIFO verification event with a single seat.',
      category: 'conference',
      bannerUrl: 'http://localhost:5000/uploads/banner-demo.png',
      venueId: venue._id,
      startAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      status: 'published',
      latitude: 9.02,
      longitude: 38.76,
      tiers: [{ name: 'Only Seat', price: 25, capacity: 1 }],
    }, 201)).data.event;
  } catch (err) {
    console.log('EVENT REUSE:', err.message);
  }
  const eventId = ev._id;

  const map = await api(a, `/api/v1/events/${eventId}/seats`);
  const seat = map.data.sections.flatMap((s) => s.seats)[0];
  if (!seat) throw new Error('seat plan missing');

  const socket = await new Promise((resolve, reject) => {
    const s = io(BASE, { extraHeaders: { cookie: a }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(new Error(e.message)));
    setTimeout(() => reject(new Error('socket timeout')), 8000);
  });
  await new Promise((r) => socket.emit('seatmap:join', { eventId }, () => r()));
  const lockAck = await new Promise((r) => socket.emit('seat:lock', { eventId, seatIds: [seat.id] }, r));
  if (!lockAck.ok) throw new Error('lock failed');

  const booking = (await api(a, '/api/v1/bookings', 'POST', { eventId, seatIds: [seat.id] }, 201)).data.booking;
  await api(a, `/api/v1/bookings/${booking.bookingRef}/dev-confirm`, 'POST');

  const joinRes = await api(b, '/api/v1/waitlists', 'POST', { eventId, tierId: 'tier-1' }, 201);
  const entryId = joinRes.data.entry._id;
  if (joinRes.data.entry.status !== 'queued') throw new Error('waitlist not queued');

  const before = (await api(b, '/api/v1/waitlists')).data.entries[0];
  console.log('waitlist entry:', before.tierId, before.status);

  await api(a, `/api/v1/bookings/${booking.bookingRef}/refund`, 'POST');

  const after = (await api(b, '/api/v1/waitlists')).data.entries.find((e) => e._id === entryId);
  if (after?.status !== 'notified') throw new Error(`expected notified, got ${after?.status}`);
  console.log('FIFO notify OK:', after.status, '- email log should show "A seat opened for…" above');

  const ics = await fetch(`${BASE}/api/v1/events/${eventId}/ics`, { headers: { cookie: a } });
  const icsText = await ics.text();
  if (!icsText.includes('BEGIN:VCALENDAR') || !icsText.includes('UID:')) throw new Error('ics malformed');
  console.log('ICS OK:', ics.headers.get('content-type'), '-', icsText.split('\r\n')[6]);

  socket.close();
  console.log('waitlist smoke OK: sold-out -> join -> refund -> drain notify -> ics');
  process.exit(0);
}

main().catch((e) => {
  console.error('WAITLIST SMOKE FAILED:', e.message ?? e);
  process.exit(1);
});
