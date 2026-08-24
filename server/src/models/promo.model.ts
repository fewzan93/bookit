import { Schema, model, type Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minQuantity: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  expiresAt?: Date;
  ownerId?: string;
}

const promoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minQuantity: { type: Number, default: 1, min: 1 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date },
    ownerId: { type: String, index: true },
  },
  { timestamps: true },
);

export const PromoCode = model<IPromoCode>('PromoCode', promoCodeSchema);
