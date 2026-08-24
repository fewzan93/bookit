import { Schema, model, type Document, type Types } from 'mongoose';

export type SeatStatus = 'available' | 'locked' | 'booked' | 'disabled';

export interface ISeat extends Document {
  eventId: Types.ObjectId;
  venueId: Types.ObjectId;
  sectionId: string;
  row: string;
  number: number;
  tierId: string;
  status: SeatStatus;
  lockedBy?: Types.ObjectId;
  lockedUntil?: Date;
  sortKey: number;
}

const seatSchema = new Schema<ISeat>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    sectionId: { type: String, required: true },
    row: { type: String, required: true },
    number: { type: Number, required: true },
    tierId: { type: String, required: true },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked', 'disabled'],
      default: 'available',
      index: true,
    },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockedUntil: { type: Date, index: true },
    sortKey: { type: Number, required: true },
  },
  { timestamps: false },
);

seatSchema.index({ eventId: 1, sectionId: 1, sortKey: 1 });
seatSchema.index({ eventId: 1, sectionId: 1, row: 1, number: 1 }, { unique: true });

export const Seat = model<ISeat>('Seat', seatSchema);
