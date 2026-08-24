import mongoose from 'mongoose';
import { User } from '../dist/models/user.model.js';
import { Venue } from '../dist/models/venue.model.js';
import { Event } from '../dist/models/event.model.js';
import { SeatService } from '../dist/services/seat.service.js';

const MONGO = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bookit';

const USERS = [
  { name: 'Admin', email: 'admin@bookit.dev', password: 'admin123', role: 'admin' },
  { name: 'Demo Organizer', email: 'org@bookit.dev', password: 'password123', role: 'organizer' },
  { name: 'Demo Attendee', email: 'demo@bookit.dev', password: 'demo123', role: 'user' },
];

const BANNERS = [
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',
  'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200',
];

await mongoose.connect(MONGO);
console.log('[seed] connected');

for (const u of USERS) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(u.password, 10);
  await User.updateOne({ email: u.email }, { $set: { name: u.name, role: u.role, passwordHash: hash } }, { upsert: true });
  console.log(`[seed] user ready: ${u.email} / ${u.password}`);
}

const org = await User.findOne({ email: 'org@bookit.dev' }).exec();

let venue = await Venue.findOne({ name: 'Bookit Demo Hall' }).exec();
if (!venue) {
  venue = await Venue.create({
    name: 'Bookit Demo Hall',
    type: 'concert',
    address: 'Meskel Square, Addis Ababa',
    city: 'Addis Ababa',
    coordinates: [38.75, 9.01],
    ownerId: org.id,
    config: {
      sections: [
        { id: 'sec-demo-a', name: 'VIP Block', tierId: 'tier-2', rows: 4, cols: 12, startNumber: 1 },
        { id: 'sec-demo-b', name: 'Regular Block', tierId: 'tier-1', rows: 6, cols: 14, startNumber: 1 },
      ],
    },
  });
  console.log('[seed] venue created: Bookit Demo Hall');
} else {
  console.log('[seed] venue exists: Bookit Demo Hall');
}

const DAY = 86400000;
const base = Date.now() + 7 * DAY;
const events = [
  {
    title: 'Ethio Jazz Grand Night',
    category: 'music',
    startAt: new Date(base),
    tiers: [
      { name: 'Early Bird', price: 45, afterPrice: 65, capacity: 168, activeUntil: new Date(base - 3 * DAY) },
      { name: 'VIP', price: 120, capacity: 48 },
    ],
    tags: ['jazz', 'live'],
  },
  {
    title: 'Theatre Night: The Seed',
    category: 'theater',
    startAt: new Date(base + 7 * DAY),
    tiers: [
      { name: 'Regular', price: 25, capacity: 84 },
      { name: 'Front Row', price: 55, capacity: 48 },
    ],
    tags: ['theatre'],
  },
  {
    title: 'Addis Sounds Festival',
    category: 'festival',
    startAt: new Date(base + 21 * DAY),
    tiers: [
      { name: 'Early Bird', price: 30, afterPrice: 45, capacity: 168, activeUntil: new Date(base + 14 * DAY) },
      { name: 'VIP', price: 100, capacity: 48 },
    ],
    tags: ['festival'],
  },
];

const seatService = new SeatService();

const cleanSlug = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

for (let i = 0; i < events.length; i += 1) {
  const spec = events[i];
  const slug = cleanSlug(spec.title);
  await Event.deleteMany({ $or: [{ slug }, { title: spec.title }] });
  const tiers = spec.tiers.map((t, idx) => ({ ...t, tierId: `tier-${idx + 1}` }));
  const event = await Event.create({
    title: spec.title,
    slug,
    description: `Demo event seeded for Bookit — ${spec.title}. Pick a seat on the live map, pay, and show your QR ticket at the door.`,
    category: spec.category,
    banner: { url: BANNERS[i % BANNERS.length] },
    venueId: venue.id,
    organizerId: org.id,
    startAt: spec.startAt,
    status: 'published',
    tiers,
    address: venue.address,
    city: venue.city,
    coordinates: venue.coordinates,
    tags: spec.tags,
  });
  console.log(`[seed] event published: ${event.slug}`);
  const count = await seatService.ensurePlan(event.id);
  if (count > 0) console.log(`[seed] seat plan for ${event.slug}: ${count} seats`);
}

await mongoose.disconnect();
console.log('[seed] done — demo accounts: org@bookit.dev/password123 · demo@bookit.dev/demo123 · admin@bookit.dev/admin123');
