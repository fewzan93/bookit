import { Schema, model, type Document, type Types } from 'mongoose';

export type WaitlistStatus = 'queued' | 'notified' | 'fulfilled' | 'removed';

export interface IWaitlist extends Document {
  eventId: Types.ObjectId;
  tierId: string;
  userId: Types.ObjectId;
  status: WaitlistStatus;
  notifiedAt?: Date;
  eventSnapshot: {
    title: string;
    slug: string;
    startAt: Date;
    venueName: string;
    bannerUrl: string;
  };
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    tierId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'notified', 'fulfilled', 'removed'],
      default: 'queued',
      index: true,
    },
    notifiedAt: { type: Date },
    eventSnapshot: {
      title: { type: String, required: true },
      slug: { type: String, required: true },
      startAt: { type: Date, required: true },
      venueName: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

waitlistSchema.index({ eventId: 1, tierId: 1, createdAt: 1 });
waitlistSchema.index({ eventId: 1, tierId: 1, userId: 1 }, { unique: true });

export const Waitlist = model<IWaitlist>('Waitlist', waitlistSchema);
