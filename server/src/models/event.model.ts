import { Schema, model, type Document, type Types } from 'mongoose';

export type EventCategory = 'education' | 'sports' | 'gaming' | 'tech' | 'community' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'ended';

export interface EventTier {
  tierId: string;
  name: string;
  price: number;
  afterPrice?: number;
  currency: string;
  capacity: number;
  sold: number;
  activeUntil?: Date;
}

export interface IEvent extends Document {
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  banner: { url: string; publicId?: string };
  venueId: Types.ObjectId;
  organizerId: Types.ObjectId;
  startAt: Date;
  endAt?: Date;
  status: EventStatus;
  tiers: EventTier[];
  address: string;
  city: string;
  coordinates: [number, number];
  tags: string[];
}

const tierSchema = new Schema<EventTier>(
  {
    tierId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    price: { type: Number, required: true, min: 0 },
    afterPrice: { type: Number, min: 0 },
    currency: { type: String, required: true, default: 'USD', uppercase: true, maxlength: 3 },
    capacity: { type: Number, required: true, min: 1 },
    sold: { type: Number, required: true, default: 0, min: 0 },
    activeUntil: { type: Date },
  },
  { _id: false },
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, minlength: 10, maxlength: 5000 },
    category: {
      type: String,
      enum: ['education', 'sports', 'gaming', 'tech', 'community', 'other'],
      required: true,
      index: true,
    },
    banner: {
      url: { type: String, required: true },
      publicId: { type: String },
    },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date },
    status: { type: String, enum: ['draft', 'published', 'cancelled', 'ended'], default: 'draft', index: true },
    tiers: { type: [tierSchema], validate: [(v: EventTier[]) => v.length > 0, 'At least one ticket tier is required'] },
    address: { type: String, default: '' },
    city: { type: String, default: '', index: true },
    coordinates: { type: [Number], required: true, index: '2dsphere', default: [0, 0] },
    tags: { type: [String], default: [], maxlength: 12 },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startAt: 1 });

export const Event = model<IEvent>('Event', eventSchema);
