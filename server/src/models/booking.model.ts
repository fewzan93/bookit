import { Schema, model, type Document, type Types } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'refunded';

export interface BookingItem {
  seatId: Types.ObjectId;
  seatLabel: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: string;
}

export interface IBooking extends Document {
  bookingRef: string;
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
  items: BookingItem[];
  promoCode?: string;
  promoDiscount: number;
  groupDiscount: number;
  subtotal: number;
  total: number;
  currency: string;
  status: BookingStatus;
  stripeSessionId?: string;
  paidAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<BookingItem>(
  {
    seatId: { type: Schema.Types.ObjectId, ref: 'Seat', required: true },
    seatLabel: { type: String, required: true },
    tierId: { type: String, required: true },
    tierName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    bookingRef: { type: String, required: true, unique: true, index: true },
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
    items: { type: [itemSchema], required: true },
    promoCode: { type: String },
    promoDiscount: { type: Number, default: 0, min: 0 },
    groupDiscount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired', 'refunded'],
      default: 'pending',
      index: true,
    },
    stripeSessionId: { type: String, index: true },
    paidAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Booking = model<IBooking>('Booking', bookingSchema);
