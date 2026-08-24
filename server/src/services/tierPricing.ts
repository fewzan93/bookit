export interface TierLike {
  price: number;
  afterPrice?: number;
  sold: number;
  capacity: number;
  activeUntil?: Date | string;
}

export function tierExpired(tier: TierLike, now: Date = new Date()): boolean {
  if (tier.sold >= tier.capacity) return true;
  if (!tier.activeUntil) return false;
  return new Date(tier.activeUntil).getTime() <= now.getTime();
}

/** Effective price after tier expiry / fill — falls back to the base price. */
export function effectiveTierPrice(tier: TierLike, now: Date = new Date()): number {
  return tierExpired(tier, now) ? (tier.afterPrice ?? tier.price) : tier.price;
}

export function tierSaleStopped(tier: TierLike): boolean {
  return tier.sold >= tier.capacity;
}
