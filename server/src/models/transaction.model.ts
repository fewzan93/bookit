import { Schema, model, type Document, type Types } from 'mongoose';

export interface ITransaction extends Document {
  bookingId: Types.ObjectId;
  ref: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  provider: 'stripe' | 'dev';
  raw?: unknown;
}

const transactionSchema = new Schema<ITransaction>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    ref: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    provider: { type: String, enum: ['stripe', 'dev'], required: true },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
