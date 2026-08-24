import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
}
