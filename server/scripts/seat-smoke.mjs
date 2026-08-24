import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000';
const email = 'org@bookit.dev';
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

  const venue = await api('/api/v1/venues', 'POST', {
    name: `Seatland ${Date.now().toString().slice(-5)}`,
    type: 'concert',
    address: '1 Rhythm Ave',
    city: 'Addis Ababa',
    latitude: 9.02,
    longitude: 38.76,
    config: { sections: [{ name: 'VIP Block', tierId: 'tier-2', rows: 3, cols: 8, startNumber: 1 }] },
  });
  const eventId = (await api('/api/v1/events', 'POST', {
    title: `Seat Test ${Date.now().toString().slice(-5)}`,
    description: 'Real-time seat locking end-to-end verification event.',
    category: 'music',
    bannerUrl: 'http://localhost:5000/uploads/banner-demo.png',
    venueId: venue.venue._id,
    startAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'published',
    latitude: 9.02,
    longitude: 38.76,
    tiers: [
      { name: 'Regular', price: 30, capacity: 24 },
      { name: 'VIP', price: 90, capacity: 24 },
    ],
  })).event._id;

  const map1 = await api(`/api/v1/events/${eventId}/seats`);
  const section = map1.sections[0];
  const available = section.seats.filter((s) => s.status === 'available');
  if (available.length < 4) throw new Error('expected >= 4 available seats');
  console.log(`plan generated: ${section.seats.length} seats in "${section.name}"`);

  function connect() {
    return new Promise((resolve, reject) => {
      const s = io(BASE, { extraHeaders: { cookie }, transports: ['websocket'] });
      const t = setTimeout(() => reject(new Error('connect timeout')), 8000);
      s.on('connect', () => { clearTimeout(t); resolve(s); });
      s.on('connect_error', (e) => { clearTimeout(t); reject(new Error(`connect_error: ${e.message}`)); });
    });
  }

  const s1 = await connect();
  await new Promise((r) => s1.emit('seatmap:join', { eventId }, () => r()));
  const s2 = await connect();
  const broadcastSeen = new Promise((r) => s2.once('seats:state', (d) => r(d)));
  await new Promise((r) => s2.emit('seatmap:join', { eventId }, () => r()));

  const [seatA, seatB] = available.slice(0, 2);
  const lockAck = await new Promise((r) => s1.emit('seat:lock', { eventId, seatIds: [seatA.id, seatB.id] }, r));
  if (!lockAck.ok) throw new Error(`lock ack: ${JSON.stringify(lockAck)}`);
  console.log(`lock ack ok, timeoutSec=${lockAck.timeoutSec}`);
  setTimeout(() => { throw new Error('broadcast not received in 5s'); }, 5000);
  const bcast = await broadcastSeen;
  console.log(`broadcast received: ${bcast.changes.length} change(s) -> ${bcast.changes[0].status}`);

  const map2 = await api(`/api/v1/events/${eventId}/seats`);
  const locked1 = map2.sections[0].seats.filter((s) => s.status === 'locked');
  if (locked1.length !== 2) throw new Error(`expected 2 locked, got ${locked1.length}`);

  const relAck = await new Promise((r) => s1.emit('seat:release', { eventId, seatIds: [seatA.id, seatB.id] }, r));
  if (!relAck.ok) throw new Error('release ack failed');
  const map3 = await api(`/api/v1/events/${eventId}/seats`);
  const lockedAfter = map3.sections[0].seats.filter((s) => s.status === 'locked');
  if (lockedAfter.length !== 0) throw new Error('seats still locked after release');

  s1.close();
  s2.close();
  console.log('seat smoke OK: lock -> broadcast -> http state -> release all verified');
  process.exit(0);
}

main().catch((e) => {
  console.error('SEAT SMOKE FAILED:', e.message ?? e);
  process.exit(1);
});
