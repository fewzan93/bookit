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
  if (r.status !== expect) throw new Error(`${method} ${path} -> ${r.status}: ${j.message}`);
  return r.status === 200 ? j : { status: r.status, ...j };
}

async function main() {
  const attendee = await login('test@bookit.dev', 'password123');
  const organizer = await login('org@bookit.dev', 'password123');

  const list = await api(attendee, '/api/v1/events?query=Seat%20Test&limit=5');
  const ev = list.data.events[0];
  if (!ev) throw new Error('no Seat Test event');
  const eventId = ev._id;

  const map = await api(attendee, `/api/v1/events/${eventId}/seats`);
  const picks = map.data.sections.flatMap((s) => s.seats.filter((x) => x.status === 'available')).slice(0, 2);
  if (picks.length < 2) throw new Error('need 2 available seats');

  const socket = await new Promise((resolve, reject) => {
    const s = io(BASE, { extraHeaders: { cookie: attendee }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', (e) => reject(new Error(e.message)));
    setTimeout(() => reject(new Error('socket timeout')), 8000);
  });
  await new Promise((r) => socket.emit('seatmap:join', { eventId }, () => r()));
  const lockAck = await new Promise((r) => socket.emit('seat:lock', { eventId, seatIds: picks.map((p) => p.id) }, r));
  if (!lockAck.ok) throw new Error('lock failed');

  const created = (await api(attendee, '/api/v1/bookings', 'POST', { eventId, seatIds: picks.map((p) => p.id) }, 201)).data.booking;
  const confirmed = (await api(attendee, `/api/v1/bookings/${created.bookingRef}/dev-confirm`, 'POST')).data.booking;
  if (confirmed.status !== 'confirmed') throw new Error('confirm failed');

  const mine = (await api(attendee, '/api/v1/tickets')).data.tickets;
  const mineFiltered = mine.filter((t) => t.bookingId === created._id);
  if (mineFiltered.length !== 2) throw new Error(`expected 2 tickets, got ${mineFiltered.length}`);
  console.log('tickets issued:', mineFiltered.map((t) => t.ticketRef).join(', '));

  const tk = mineFiltered[0];
  const qr = (await api(attendee, `/api/v1/tickets/${tk.ticketRef}`)).data;
  if (!qr.qrRaw.startsWith('BOOKIT1|')) throw new Error('bad qr payload');

  const scan1 = (await api(organizer, '/api/v1/tickets/scan', 'POST', { payload: qr.qrRaw })).data;
  if (scan1.status !== 'valid') throw new Error(`first scan expected valid, got ${scan1.status}`);
  console.log('scan 1:', scan1.message);

  const scan2 = (await api(organizer, '/api/v1/tickets/scan', 'POST', { payload: qr.qrRaw }, 200)).data;
  if (scan2.status !== 'used') throw new Error(`second scan expected used, got ${scan2.status}`);
  console.log('scan 2:', scan2.message);

  const rotated = (await api(attendee, `/api/v1/tickets/${tk.ticketRef}/rotate`, 'POST')).data;
  if (rotated.ticket.qrVersion !== 2) throw new Error('rotate failed');
  const scanOld = (await api(organizer, '/api/v1/tickets/scan', 'POST', { payload: qr.qrRaw }, 200)).data;
  if (scanOld.status !== 'expired') throw new Error(`old qr expected expired, got ${scanOld.status}`);
  console.log('rotate + stale QR rejected:', scanOld.message);

  const pdf = await fetch(`${BASE}/api/v1/tickets/${tk.ticketRef}/pdf`, { headers: { cookie: attendee } });
  if (pdf.status !== 200 || (pdf.headers.get('content-type') ?? '').includes('pdf')) {
    if (pdf.status !== 200) throw new Error(`pdf status ${pdf.status}`);
  }
  const pdfBuf = Buffer.from(await pdf.arrayBuffer());
  if (!pdfBuf.subarray(0, 4).toString()?.startsWith('%PDF')) throw new Error('pdf signature missing');
  console.log(`pdf OK: ${pdfBuf.length} bytes`);

  socket.close();
  console.log('tickets smoke OK: issue -> qr -> scan -> used -> rotate -> stale -> pdf, all verified');
  process.exit(0);
}

main().catch((e) => {
  console.error('TICKETS SMOKE FAILED:', e.message ?? e);
  process.exit(1);
});
