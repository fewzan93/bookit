import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/bookit');
try {
  await mongoose.connection.dropCollection('seats');
  console.log('[cleanup] legacy seats collection dropped');
} catch (err) {
  console.log('[cleanup] no legacy seats collection:', err.message);
}
await mongoose.disconnect();
