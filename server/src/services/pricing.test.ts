import { describe, expect, it } from 'vitest';
import { computeTotals, round2 } from './pricing.js';

const seats = (prices: number[]) =>
  prices.map((price) => ({ price, currency: 'USD' }));

describe('computeTotals', () => {
  it('sums plain seats with no discounts', () => {
    const t = computeTotals(seats([45, 120]));
    expect(t.subtotal).toBe(165);
    expect(t.groupDiscount).toBe(0);
    expect(t.promoDiscount).toBe(0);
    expect(t.total).toBe(165);
  });

  it('applies automatic 10% group discount at 5+ seats', () => {
    const t = computeTotals(seats([40, 50, 60, 70, 80]));
    expect(t.subtotal).toBe(300);
    expect(t.groupThresholdMet).toBe(true);
    expect(t.groupDiscount).toBe(30);
    expect(t.total).toBe(270);
  });

  it('does not apply group discount below threshold', () => {
    const t = computeTotals(seats([40, 50, 60, 70]));
    expect(t.groupThresholdMet).toBe(false);
    expect(t.groupDiscount).toBe(0);
    expect(t.total).toBe(220);
  });

  it('applies percent promo on subtotal', () => {
    const t = computeTotals(seats([100, 100]), { code: 'EARLY10', type: 'percent', value: 10 });
    expect(t.promoDiscount).toBe(20);
    expect(t.total).toBe(180);
  });

  it('applies fixed promo capped at subtotal', () => {
    const t = computeTotals(seats([50]), { code: 'FREE5', type: 'fixed', value: 500 });
    expect(t.promoDiscount).toBe(50);
    expect(t.total).toBe(0);
  });

  it('promo cannot drive the total below zero with group discount', () => {
    const t = computeTotals(seats([10, 10, 10, 10, 10]), { code: 'BIG', type: 'percent', value: 99 });
    expect(t.groupDiscount).toBe(5);
    expect(t.promoDiscount).toBeLessThanOrEqual(45);
    expect(t.total).toBeGreaterThanOrEqual(0);
  });

  it('rounds to cents', () => {
    const t = computeTotals(seats([33.33, 33.33, 33.33]));
    expect(t.subtotal).toBe(99.99);
    expect(round2(t.subtotal + 0.001)).toBe(99.99);
  });
});
