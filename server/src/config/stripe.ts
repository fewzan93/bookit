import Stripe from 'stripe';
import { env } from './env.js';

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
