export interface PricingSeat {
  price: number;
  currency: string;
}

export interface AppliedPromo {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
}

export interface PriceTotals {
  subtotal: number;
  promoDiscount: number;
  groupDiscount: number;
  total: number;
  currency: string;
  groupThresholdMet: boolean;
}

const GROUP_SIZE_THRESHOLD = 5;
const GROUP_DISCOUNT_RATE = 0.1;

export function computeTotals(seats: PricingSeat[], promo?: AppliedPromo | null): PriceTotals {
  const currency = seats[0]?.currency ?? 'USD';
  const subtotal = round2(seats.reduce((sum, s) => sum + s.price, 0));
  const groupThresholdMet = seats.length >= GROUP_SIZE_THRESHOLD;
  const groupDiscount = groupThresholdMet ? round2(subtotal * GROUP_DISCOUNT_RATE) : 0;

  let promoDiscount = 0;
  if (promo) {
    promoDiscount =
      promo.type === 'percent'
        ? round2(subtotal * (promo.value / 100))
        : Math.min(round2(promo.value), subtotal);
    promoDiscount = Math.min(promoDiscount, subtotal - groupDiscount);
  }

  const total = round2(Math.max(subtotal - groupDiscount - promoDiscount, 0));

  return {
    subtotal,
    promoDiscount,
    groupDiscount,
    total,
    currency,
    groupThresholdMet,
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatUsdCents(amount: number): number {
  return Math.round(amount * 100);
}
