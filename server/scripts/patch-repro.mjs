import { io } from 'socket.io-client';

const BASE = 'http://localhost:5000';
const eventId = '6a8bd786824d6c252f2741e1';

async function main() {
  const login = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'org@bookit.dev', password: 'password123' }),
  });
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

  const ev = (await (await fetch(`${BASE}/api/v1/events/${eventId}`, { headers: { cookie } })).json()).data.event;

  const base = {
    title: ev.title,
    category: ev.category,
    description: ev.description,
    bannerUrl: ev.banner.url,
    startAt: ev.startAt,
    status: 'published',
    address: ev.address,
    city: ev.city,
    latitude: ev.coordinates[1],
    longitude: ev.coordinates[0],
    venueId: ev.venueId._id ?? ev.venueId,
  };

  const cases = {
    'base (no tiers/endAt)': { ...base },
    'tier capacity 0': { ...base, tiers: [{ name: 'Fewzi Neja', price: 5, capacity: 0, currency: 'USD' }] },
    'tier price null': { ...base, tiers: [{ name: 'Fewzi Neja', price: null, capacity: 50, currency: 'USD' }] },
    'tier activeUntil ""': { ...base, tiers: [{ name: 'Fewzi Neja', price: 5, capacity: 50, currency: 'USD', activeUntil: '' }] },
    'no venueId': { ...base, tiers: [{ name: 'Fewzi Neja', price: 5, capacity: 50, currency: 'USD' }], venueId: undefined },
    'endAt past + before start': { ...base, endAt: '2026-08-10T10:00:00.000Z', tiers: [{ name: 'Fewzi Neja', price: 5, capacity: 50, currency: 'USD' }] },
  };

  for (const [name, payload] of Object.entries(cases)) {
    const r = await fetch(`${BASE}/api/v1/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(payload),
    });
    const body = await r.json();
    const err = body.errors ?? body.message;
    console.log(`[${r.status}] ${name} -> ${JSON.stringify(err).slice(0, 220)}`);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
