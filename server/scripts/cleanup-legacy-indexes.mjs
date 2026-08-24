import mongoose from 'mongoose';

// Stale dev collections from earlier sessions with totally different schemas
// (their legacy unique indexes collide with current models).
const STALE_COLLECTIONS = ['seats', 'tickets'];

await mongoose.connect('mongodb://localhost:27017/bookit');
const db = mongoose.connection.db;

for (const collection of STALE_COLLECTIONS) {
  try {
    await db.collection(collection).drop();
    console.log(`[cleanup] dropped stale collection: ${collection}`);
  } catch (err) {
    console.log(`[cleanup] ${collection}: ${err.message}`);
  }
}

await mongoose.disconnect();
