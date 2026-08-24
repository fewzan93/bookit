import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/bookit');
const db = mongoose.connection.db;

const tickets = await db.collection('tickets').find({}).sort({ issuedAt: -1 }).limit(10).toArray();
console.log('tickets sample:');
for (const t of tickets) {
  console.log(' ', t.ticketRef, String(t.bookingId), t.status, String(t.eventId), new Date(t.issuedAt).toISOString());
}

const dup = await db.collection('tickets').aggregate([{ $group: { _id: '$ticketRef', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }]).toArray();
console.log('dup refs:', dup.length);

const idx = await db.collection('tickets').indexes();
console.log('ticket indexes:', JSON.stringify(idx.map((i) => i.key)));

const bookings = await db.collection('bookings').find({}).sort({ createdAt: -1 }).limit(6).toArray();
console.log('recent bookings:');
for (const b of bookings) console.log(' ', b.bookingRef, b.status, String(b._id));

await mongoose.disconnect();
