import { Schema, model, type Document, type Types } from 'mongoose';

export type VenueType = 'hall' | 'stadium' | 'conference' | 'outdoor' | 'classroom';

export interface VenueSectionConfig {
  id: string;
  name: string;
  tierId: string;
  rows: number;
  cols: number;
  startNumber: number;
}

export interface IVenue extends Document {
  name: string;
  type: VenueType;
  address: string;
  city: string;
  coordinates: [number, number];
  image?: string;
  config: { sections: VenueSectionConfig[] };
  ownerId: Types.ObjectId;
}

const sectionSchema = new Schema<VenueSectionConfig>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    tierId: { type: String, required: true },
    rows: { type: Number, required: true, min: 1, max: 200 },
    cols: { type: Number, required: true, min: 1, max: 200 },
    startNumber: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const venueSchema = new Schema<IVenue>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    type: { type: String, enum: ['hall', 'stadium', 'conference', 'outdoor', 'classroom'], required: true, index: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 80, index: true },
    coordinates: { type: [Number], required: true, index: '2dsphere', default: [0, 0] },
    image: { type: String },
    config: {
      sections: {
        type: [sectionSchema],
        default: [],
      },
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true },
);

export const Venue = model<IVenue>('Venue', venueSchema);
