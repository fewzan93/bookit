import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/bookit');

const seed = [
  { code: 'EARLY10', type: 'percent', value: 10, minQuantity: 1, maxUses: 100, active: true },
  { code: 'GROUP5', type: 'percent', value: 10, minQuantity: 5, maxUses: 50, active: true },
];

for (const promo of seed) {
  await mongoose.connection.collection('promocodes').updateOne(
    { code: promo.code },
    { $setOnInsert: { ...promo, usedCount: 0 } },
    { upsert: true },
  );
  console.log('[seed] promo ready:', promo.code);
}

await mongoose.disconnect();
