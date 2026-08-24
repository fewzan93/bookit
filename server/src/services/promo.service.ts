import type { ClientSession } from 'mongoose';
import { PromoCode, type IPromoCode } from '../models/promo.model.js';
import { ApiError } from '../middlewares/errorHandler.js';
import type { AppliedPromo } from './pricing.js';

export class PromoService {
  async findValid(
    code: string,
    quantity: number,
    session?: ClientSession | null,
  ): Promise<IPromoCode> {
    const promo = await PromoCode.findOne({ code: code.toUpperCase() }).session(session ?? null).exec();

    if (!promo || !promo.active) throw new ApiError(400, 'Promo code is not valid');
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new ApiError(400, 'Promo code has expired');
    }
    if (promo.maxUses !== undefined && promo.usedCount >= promo.maxUses) {
      throw new ApiError(400, 'Promo code has reached its usage limit');
    }
    if (quantity < promo.minQuantity) {
      throw new ApiError(400, `Promo code requires at least ${promo.minQuantity} ticket(s)`);
    }

    return promo;
  }

  async validateForCheckout(code: string, quantity: number): Promise<AppliedPromo> {
    const promo = await this.findValid(code, quantity);
    return { code: promo.code, type: promo.type, value: promo.value };
  }

  async consume(promo: IPromoCode, session?: ClientSession | null): Promise<void> {
    await PromoCode.updateOne({ _id: promo.id }, { $inc: { usedCount: 1 } }).session(session ?? null).exec();
  }

  async release(promo: IPromoCode, session?: ClientSession | null): Promise<void> {
    await PromoCode.updateOne({ _id: promo.id }, { $inc: { usedCount: -1 } }).session(session ?? null).exec();
  }
}

export function toAppliedPromo(promo: IPromoCode): AppliedPromo {
  return { code: promo.code, type: promo.type, value: promo.value };
}
