import { Schema, model, type Document, type Types } from 'mongoose';

export interface ITicket extends Document {
  ticketRef: string;
  bookingId: Types.ObjectId;
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  eventSnapshot: {
    title: string;
    slug: string;
    startAt: Date;
    venueName: string;
    city: string;
    bannerUrl: string;
  };
  seatLabel?: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: string;
  status: 'valid' | 'used' | 'cancelled';
  qrVersion: number;
  qrExpEpoch: number;
  checkedInAt?: Date;
  reminderSentAt?: Date;
  issuedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketRef: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    eventSnapshot: {
      title: { type: String, required: true },
      slug: { type: String, required: true },
      startAt: { type: Date, required: true },
      venueName: { type: String, default: '' },
      city: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
    },
    seatLabel: { type: String },
    tierId: { type: String, required: true },
    tierName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid', index: true },
    qrVersion: { type: Number, default: 1 },
    qrExpEpoch: { type: Number, required: true },
    checkedInAt: { type: Date },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

ticketSchema.index({ eventId: 1, status: 1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);
