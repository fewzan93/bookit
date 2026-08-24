export interface ClientPromo {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
}

export interface CheckoutTotals {
  subtotal: number;
  promoDiscount: number;
  groupDiscount: number;
  total: number;
  groupThresholdMet: boolean;
}

const GROUP_SIZE = 5;
const GROUP_RATE = 0.1;

export function computeCheckoutTotals(prices: number[], promo?: ClientPromo | null): CheckoutTotals {
  const subtotal = round2(prices.reduce((sum, p) => sum + p, 0));
  const groupThresholdMet = prices.length >= GROUP_SIZE;
  const groupDiscount = groupThresholdMet ? round2(subtotal * GROUP_RATE) : 0;

  let promoDiscount = 0;
  if (promo) {
    promoDiscount =
      promo.type === 'percent' ? round2(subtotal * (promo.value / 100)) : Math.min(round2(promo.value), subtotal);
    promoDiscount = Math.min(promoDiscount, subtotal - groupDiscount);
  }

  return {
    subtotal,
    promoDiscount,
    groupDiscount,
    total: round2(Math.max(subtotal - groupDiscount - promoDiscount, 0)),
    groupThresholdMet,
  };
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
