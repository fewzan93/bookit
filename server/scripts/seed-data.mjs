import mongoose from 'mongoose';
import { User } from '../dist/models/user.model.js';
import { Venue } from '../dist/models/venue.model.js';
import { Event } from '../dist/models/event.model.js';
import { SeatService } from '../dist/services/seat.service.js';

const MONGO = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bookit';

/* ── Demo accounts ───────────────────────────────────────────── */
const USERS = [
  { name: 'Admin', email: 'admin@bookit.dev', password: 'admin123', role: 'admin' },
  { name: 'Omar Al-Hassan', email: 'omar@bookit.dev', password: 'password123', role: 'organizer' },
  { name: 'Fatima Zahra', email: 'fatima@bookit.dev', password: 'password123', role: 'organizer' },
  { name: 'Yusuf Kareem', email: 'yusuf@bookit.dev', password: 'password123', role: 'organizer' },
  { name: 'Demo User', email: 'demo@bookit.dev', password: 'demo123', role: 'user' },
];

/* ── Banner images (Unsplash, non-music) ────────────────────── */
const BANNERS = {
  sports: [
    'https://images.unsplash.com/photo-1461896836934-bd45ba8a0b91?w=1200',   // football
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200',   // soccer ball
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1200',     // running
    'https://images.unsplash.com/photo-1461896836934-bd45ba8a0b91?w=1200',   // basketball
  ],
  education: [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200',   // lecture
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200',   // learning
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200',   // students
  ],
  tech: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',   // tech conf
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200',   // coding
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',   // laptops
  ],
  gaming: [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200',     // gaming
    'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1200',   // esports
  ],
  community: [
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200',     // community
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200',   // charity
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200',   // charity/volunteers
  ],
  other: [
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',   // generic event
  ],
};

function bannerFor(cat) {
  const pool = BANNERS[cat] ?? BANNERS.other;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ── Venue definitions ──────────────────────────────────────── */
const VENUE_DEFS = [
  {
    name: 'Istanbul Convention Center',
    type: 'conference',
    address: 'Bakırköy, Istanbul',
    city: 'Istanbul',
    coordinates: [28.97, 41.00],
    sections: [
      { name: 'Main Hall', tierId: 'tier-1', rows: 8, cols: 16, startNumber: 1 },
      { name: 'VIP Section', tierId: 'tier-2', rows: 3, cols: 10, startNumber: 1 },
    ],
  },
  {
    name: 'Dubai Sports City Stadium',
    type: 'stadium',
    address: 'Sports City, Dubai',
    city: 'Dubai',
    coordinates: [55.27, 25.04],
    sections: [
      { name: 'East Stand', tierId: 'tier-1', rows: 10, cols: 20, startNumber: 1 },
      { name: 'West Stand', tierId: 'tier-1', rows: 10, cols: 20, startNumber: 1 },
      { name: 'VIP Box', tierId: 'tier-2', rows: 2, cols: 12, startNumber: 1 },
    ],
  },
  {
    name: 'Kuala Lumpur Tech Hub',
    type: 'conference',
    address: 'KLCC, Kuala Lumpur',
    city: 'Kuala Lumpur',
    coordinates: [101.71, 3.14],
    sections: [
      { name: 'Auditorium', tierId: 'tier-1', rows: 12, cols: 15, startNumber: 1 },
      { name: 'Workshop Room', tierId: 'tier-2', rows: 4, cols: 8, startNumber: 1 },
    ],
  },
  {
    name: 'Cairo Community Hall',
    type: 'hall',
    address: 'Nasr City, Cairo',
    city: 'Cairo',
    coordinates: [31.34, 30.06],
    sections: [
      { name: 'Main Floor', tierId: 'tier-1', rows: 8, cols: 12, startNumber: 1 },
      { name: 'Balcony', tierId: 'tier-2', rows: 3, cols: 10, startNumber: 1 },
    ],
  },
  {
    name: 'Riyadh Arena',
    type: 'stadium',
    address: 'Al Malaz, Riyadh',
    city: 'Riyadh',
    coordinates: [46.72, 24.69],
    sections: [
      { name: 'North End', tierId: 'tier-1', rows: 12, cols: 18, startNumber: 1 },
      { name: 'South End', tierId: 'tier-1', rows: 12, cols: 18, startNumber: 1 },
      { name: 'VIP Lounge', tierId: 'tier-2', rows: 2, cols: 8, startNumber: 1 },
    ],
  },
  {
    name: 'Jakarta Learning Center',
    type: 'classroom',
    address: 'Menteng, Jakarta',
    city: 'Jakarta',
    coordinates: [106.83, -6.19],
    sections: [
      { name: 'Training Room A', tierId: 'tier-1', rows: 5, cols: 8, startNumber: 1 },
    ],
  },
  {
    name: 'Amman Outdoor Fields',
    type: 'outdoor',
    address: 'Abdali, Amman',
    city: 'Amman',
    coordinates: [35.93, 31.95],
    sections: [
      { name: 'Pitch A', tierId: 'tier-1', rows: 4, cols: 12, startNumber: 1 },
      { name: 'Pitch B', tierId: 'tier-2', rows: 3, cols: 10, startNumber: 1 },
    ],
  },
  {
    name: 'Lahore Gaming Arena',
    type: 'hall',
    address: 'DHA, Lahore',
    city: 'Lahore',
    coordinates: [74.35, 31.52],
    sections: [
      { name: 'Main Arena', tierId: 'tier-1', rows: 6, cols: 12, startNumber: 1 },
      { name: 'VIP Booth', tierId: 'tier-2', rows: 2, cols: 6, startNumber: 1 },
    ],
  },
];

/* ── Event definitions ──────────────────────────────────────── */
const DAY = 86400000;
const base = Date.now() + 7 * DAY;

const EVENTS = [
  // ─── Education ──────────────────────────────────────────────
  {
    title: 'Quran Recitation Workshop',
    category: 'education',
    city: 'Istanbul',
    startAt: new Date(base),
    tiers: [
      { name: 'General Admission', price: 0, capacity: 240 },
      { name: 'VIP Front Row', price: 15, capacity: 30 },
    ],
    tags: ['quran', 'recitation', 'tajweed'],
    description: 'A beautiful evening of Quran recitation led by world-renowned Qaris. Learn tajweed techniques and listen to melodious recitations. Open to all ages.',
  },
  {
    title: 'Islamic Finance Masterclass',
    category: 'education',
    city: 'Dubai',
    startAt: new Date(base + 3 * DAY),
    tiers: [
      { name: 'Standard', price: 50, afterPrice: 75, capacity: 200, activeUntil: new Date(base + 1 * DAY) },
      { name: 'Premium (Certificate)', price: 150, capacity: 50 },
    ],
    tags: ['finance', 'halal', 'investment'],
    description: 'Learn the principles of Sharia-compliant investing, Islamic banking, and modern fintech applications. Includes certificate of completion.',
  },
  {
    title: 'Arabic Calligraphy for Beginners',
    category: 'education',
    city: 'Cairo',
    startAt: new Date(base + 10 * DAY),
    tiers: [
      { name: 'Student', price: 10, capacity: 40 },
      { name: 'Adult', price: 25, capacity: 20 },
    ],
    tags: ['calligraphy', 'art', 'arabic'],
    description: 'Discover the art of Arabic calligraphy with master calligrapher Ahmad al-Din. All materials provided. Suitable for complete beginners.',
  },
  {
    title: 'Seerah of the Prophet ﷺ — Lecture Series',
    category: 'education',
    city: 'Riyadh',
    startAt: new Date(base + 14 * DAY),
    tiers: [
      { name: 'Free Entry', price: 0, capacity: 500 },
      { name: 'Sponsor a Seat', price: 25, capacity: 100 },
    ],
    tags: ['seerah', 'lecture', 'prophet'],
    description: 'A deeply inspiring 3-part lecture series exploring the life and legacy of Prophet Muhammad ﷺ. Learn from renowned scholars.',
  },
  {
    title: 'Youth Hifz Program — Registration Day',
    category: 'education',
    city: 'Jakarta',
    startAt: new Date(base + 18 * DAY),
    tiers: [
      { name: 'Registration Fee', price: 5, capacity: 100 },
    ],
    tags: ['hifz', 'youth', 'quran'],
    description: 'Register for the annual Hifz program. Young students will memorize the Quran with experienced teachers. Limited spots available.',
  },
  {
    title: 'STEM Workshop for Muslim Youth',
    category: 'education',
    city: 'Kuala Lumpur',
    startAt: new Date(base + 22 * DAY),
    tiers: [
      { name: 'Student', price: 20, afterPrice: 30, capacity: 120, activeUntil: new Date(base + 15 * DAY) },
      { name: 'Professional', price: 50, capacity: 40 },
    ],
    tags: ['stem', 'youth', 'science'],
    description: 'Hands-on workshops in robotics, coding, and engineering designed for Muslim youth. Build real projects and learn how science and faith complement each other.',
  },

  // ─── Sports ─────────────────────────────────────────────────
  {
    title: 'Community Football Cup 2026',
    category: 'sports',
    city: 'Dubai',
    startAt: new Date(base + 5 * DAY),
    tiers: [
      { name: 'Spectator', price: 20, capacity: 400 },
      { name: 'VIP Seating', price: 60, afterPrice: 80, capacity: 60, activeUntil: new Date(base + 2 * DAY) },
    ],
    tags: ['football', 'tournament', 'community'],
    description: 'The biggest community football tournament in the region! 16 teams competing for the championship. Food courts, kids zone, and family-friendly atmosphere.',
  },
  {
    title: 'Swimming Championship — Masters',
    category: 'sports',
    city: 'Riyadh',
    startAt: new Date(base + 8 * DAY),
    tiers: [
      { name: 'General', price: 15, capacity: 300 },
      { name: 'Competitor Pass', price: 35, capacity: 100 },
    ],
    tags: ['swimming', 'championship', 'fitness'],
    description: 'Annual masters swimming championship. Compete or cheer from the stands. All categories: freestyle, breaststroke, butterfly, and relay.',
  },
  {
    title: 'Karate & Taekwondo Open Day',
    category: 'sports',
    city: 'Amman',
    startAt: new Date(base + 12 * DAY),
    tiers: [
      { name: 'Free Spectator', price: 0, capacity: 200 },
      { name: 'Participant Registration', price: 10, capacity: 80 },
    ],
    tags: ['martial-arts', 'karate', 'taekwondo'],
    description: 'Try martial arts for free! Professional instructors offering introductory sessions in karate and taekwondo. All ages and skill levels welcome.',
  },
  {
    title: '5K Charity Fun Run',
    category: 'sports',
    city: 'Cairo',
    startAt: new Date(base + 16 * DAY),
    tiers: [
      { name: 'Runner', price: 12, capacity: 500 },
      { name: 'Family Pack (4 runners)', price: 40, capacity: 100 },
    ],
    tags: ['running', 'charity', 'fitness'],
    description: 'Run for a cause! All proceeds go to orphan education programs. Route through Cairo\'s scenic Corniche. Finishers medal for all participants.',
  },
  {
    title: 'Basketball League — Season Opener',
    category: 'sports',
    city: 'Lahore',
    startAt: new Date(base + 20 * DAY),
    tiers: [
      { name: 'Standing', price: 8, capacity: 300 },
      { name: 'Seated', price: 20, capacity: 120 },
    ],
    tags: ['basketball', 'league', 'indoor'],
    description: 'The Lahore Basketball League kicks off its new season! Watch 8 top local teams battle it out in an action-packed opening weekend.',
  },

  // ─── Gaming ─────────────────────────────────────────────────
  {
    title: 'Halal Gaming Convention 2026',
    category: 'gaming',
    city: 'Kuala Lumpur',
    startAt: new Date(base + 6 * DAY),
    tiers: [
      { name: 'Day Pass', price: 25, afterPrice: 40, capacity: 500, activeUntil: new Date(base + 3 * DAY) },
      { name: 'VIP Weekend', price: 80, capacity: 100 },
    ],
    tags: ['gaming', 'convention', 'halal'],
    description: 'The largest halal gaming event in Southeast Asia! Explore game demos, compete in tournaments, meet content creators, and discover family-friendly titles.',
  },
  {
    title: 'FIFA Tournament — City Championship',
    category: 'gaming',
    city: 'Istanbul',
    startAt: new Date(base + 11 * DAY),
    tiers: [
      { name: 'Spectator', price: 10, capacity: 150 },
      { name: 'Player Entry', price: 30, capacity: 64 },
    ],
    tags: ['fifa', 'esports', 'tournament'],
    description: 'Compete in the Istanbul FIFA Championship! 64 players battling for the title. Live commentary, big screens, and exciting prizes.',
  },
  {
    title: 'Mobile Gaming Masters',
    category: 'gaming',
    city: 'Jakarta',
    startAt: new Date(base + 25 * DAY),
    tiers: [
      { name: 'General', price: 5, capacity: 200 },
      { name: 'VIP Gaming Lounge', price: 25, capacity: 30 },
    ],
    tags: ['mobile', 'gaming', 'esports'],
    description: 'Top mobile gamers compete in a day-long tournament featuring the most popular titles. Free play stations for spectators!',
  },

  // ─── Tech ───────────────────────────────────────────────────
  {
    title: 'Halal Tech Summit 2026',
    category: 'tech',
    city: 'Dubai',
    startAt: new Date(base + 4 * DAY),
    tiers: [
      { name: 'Standard', price: 100, afterPrice: 150, capacity: 300, activeUntil: new Date(base + 1 * DAY) },
      { name: 'All-Access', price: 300, capacity: 50 },
    ],
    tags: ['tech', 'startup', 'halal-economy'],
    description: 'The premier technology summit for the Muslim world. 30+ speakers from leading tech companies, startup pitch competition, and networking dinner.',
  },
  {
    title: 'AI & Machine Learning Bootcamp',
    category: 'tech',
    city: 'Kuala Lumpur',
    startAt: new Date(base + 9 * DAY),
    tiers: [
      { name: 'Online Pass', price: 45, capacity: 200 },
      { name: 'In-Person + Workshop', price: 120, capacity: 60 },
    ],
    tags: ['ai', 'machine-learning', 'bootcamp'],
    description: '3-day intensive bootcamp covering neural networks, NLP, and computer vision. Build real projects with expert mentors from Google and Microsoft.',
  },
  {
    title: 'Hackathon for Good',
    category: 'tech',
    city: 'Cairo',
    startAt: new Date(base + 15 * DAY),
    tiers: [
      { name: 'Participant', price: 0, capacity: 150 },
      { name: 'Mentor Pass', price: 0, capacity: 30 },
    ],
    tags: ['hackathon', 'social-impact', 'coding'],
    description: '48-hour hackathon building solutions for education, healthcare, and sustainability in Muslim communities. Prizes worth $10,000+.',
  },
  {
    title: 'Cybersecurity Workshop',
    category: 'tech',
    city: 'Riyadh',
    startAt: new Date(base + 19 * DAY),
    tiers: [
      { name: 'Student', price: 30, capacity: 80 },
      { name: 'Professional', price: 75, capacity: 40 },
    ],
    tags: ['cybersecurity', 'workshop', 'it'],
    description: 'Hands-on cybersecurity training covering ethical hacking, network defense, and secure coding. Lab environment included.',
  },

  // ─── Community ──────────────────────────────────────────────
  {
    title: 'Eid Community Celebration',
    category: 'community',
    city: 'Istanbul',
    startAt: new Date(base + 2 * DAY),
    tiers: [
      { name: 'Free Entry', price: 0, capacity: 1000 },
      { name: 'Family VIP Tent', price: 40, capacity: 100 },
    ],
    tags: ['eid', 'celebration', 'family'],
    description: 'Join us for a grand Eid celebration! Activities for children, cultural performances, delicious food, and community bonding. All families welcome.',
  },
  {
    title: 'Charity Gala Dinner',
    category: 'community',
    city: 'Dubai',
    startAt: new Date(base + 13 * DAY),
    tiers: [
      { name: 'Individual', price: 200, capacity: 200 },
      { name: 'Corporate Table (10)', price: 1800, capacity: 20 },
    ],
    tags: ['charity', 'gala', 'fundraiser'],
    description: 'Annual charity gala supporting orphan education across 12 countries. Elegant dinner, live auction, and inspiring stories of impact.',
  },
  {
    title: 'Interfaith Dialogue & Peace Conference',
    category: 'community',
    city: 'Amman',
    startAt: new Date(base + 17 * DAY),
    tiers: [
      { name: 'General', price: 0, capacity: 300 },
      { name: 'Sponsor', price: 50, capacity: 50 },
    ],
    tags: ['interfaith', 'dialogue', 'peace'],
    description: 'Building bridges through understanding. Scholars and community leaders from various faiths come together for meaningful dialogue and mutual respect.',
  },
  {
    title: 'Community Garden Launch',
    category: 'community',
    city: 'Lahore',
    startAt: new Date(base + 23 * DAY),
    tiers: [
      { name: 'Free Entry', price: 0, capacity: 200 },
    ],
    tags: ['garden', 'environment', 'volunteer'],
    description: 'Be part of Lahore\'s first community garden! Help us plant, build raised beds, and create a green space for the neighborhood. Lunch provided.',
  },
  {
    title: 'Orphan Sponsorship Drive',
    category: 'community',
    city: 'Jakarta',
    startAt: new Date(base + 26 * DAY),
    tiers: [
      { name: 'Attendee', price: 0, capacity: 300 },
      { name: 'Sponsor Registration', price: 25, capacity: 200 },
    ],
    tags: ['orphan', 'sponsorship', 'charity'],
    description: 'Sponsor an orphan\'s education for a year. Meet the children, learn about their stories, and make a lasting impact on a young life.',
  },
  {
    title: 'Women\'s Empowerment Summit',
    category: 'community',
    city: 'Kuala Lumpur',
    startAt: new Date(base + 28 * DAY),
    tiers: [
      { name: 'Standard', price: 30, capacity: 250 },
      { name: 'VIP (Lunch + Networking)', price: 80, capacity: 50 },
    ],
    tags: ['women', 'empowerment', 'leadership'],
    description: 'Celebrating Muslim women leaders in business, science, and community service. Inspiring talks, workshops, and networking opportunities.',
  },
];

/* ── Main seed logic ────────────────────────────────────────── */
await mongoose.connect(MONGO);
console.log('[seed] connected to', MONGO);

// 1. Users
for (const u of USERS) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(u.password, 10);
  await User.updateOne(
    { email: u.email },
    { $set: { name: u.name, role: u.role, passwordHash: hash } },
    { upsert: true },
  );
  console.log(`[seed] user: ${u.email} (${u.role})`);
}

// 2. Organizers
const organizers = await Promise.all(
  ['omar@bookit.dev', 'fatima@bookit.dev', 'yusuf@bookit.dev'].map((e) =>
    User.findOne({ email: e }).exec(),
  ),
);

// 3. Venues
const venueDocs = [];
for (const vDef of VENUE_DEFS) {
  const org = organizers[venueDocs.length % organizers.length];
  let venue = await Venue.findOne({ name: vDef.name }).exec();
  if (!venue) {
    venue = await Venue.create({
      name: vDef.name,
      type: vDef.type,
      address: vDef.address,
      city: vDef.city,
      coordinates: vDef.coordinates,
      ownerId: org.id,
      config: {
        sections: vDef.sections.map((s, i) => ({
          id: `sec-${vDef.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 12)}-${i}`,
          ...s,
        })),
      },
    });
    console.log(`[seed] venue: ${venue.name}`);
  }
  venueDocs.push({ venue, city: vDef.city });
}

// Map city -> venue
const cityVenueMap = new Map();
for (const { venue, city } of venueDocs) {
  if (!cityVenueMap.has(city)) cityVenueMap.set(city, venue);
}

// 4. Events
const seatService = new SeatService();
const cleanSlug = (title) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

for (let i = 0; i < EVENTS.length; i += 1) {
  const spec = EVENTS[i];
  const slug = cleanSlug(spec.title);
  const org = organizers[i % organizers.length];
  const venue = cityVenueMap.get(spec.city) ?? venueDocs[0].venue;

  // Delete existing to allow re-seeding
  await Event.deleteMany({ $or: [{ slug }, { title: spec.title }] }).exec();

  const tiers = spec.tiers.map((t, idx) => ({
    tierId: `tier-${idx + 1}`,
    name: t.name,
    price: t.price,
    afterPrice: t.afterPrice,
    capacity: t.capacity,
    sold: 0,
    activeUntil: t.activeUntil,
    currency: 'USD',
  }));

  const event = await Event.create({
    title: spec.title,
    slug,
    description: spec.description,
    category: spec.category,
    banner: { url: bannerFor(spec.category) },
    venueId: venue.id,
    organizerId: org.id,
    startAt: spec.startAt,
    status: 'published',
    tiers,
    address: venue.address,
    city: spec.city,
    coordinates: venue.coordinates,
    tags: spec.tags,
  });

  const count = await seatService.ensurePlan(event.id);
  console.log(`[seed] event: ${event.slug} (${spec.category}) — ${count} seats`);
}

await mongoose.disconnect();
console.log('\n[seed] ✅ All done!');
console.log('[seed] Accounts:');
console.log('  Admin:     admin@bookit.dev / admin123');
console.log('  Organizer: omar@bookit.dev  / password123');
console.log('  Organizer: fatima@bookit.dev / password123');
console.log('  Organizer: yusuf@bookit.dev / password123');
console.log('  User:      demo@bookit.dev  / demo123');
