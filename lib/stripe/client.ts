// '/pure' so importing this file never injects Stripe.js on its own — it only
// loads when getStripeClient() is called (payment / payout screens).
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';

/**
 * Browser-side Stripe client (used by Stripe Elements). The publishable key
 * is fine to expose — it can only initiate payments, not capture them.
 *
 * One per platform (see lib/stripe/server.ts): a PaymentIntent or a bank token
 * made with one platform's key does not exist on the other. The server tells
 * the payment form which platform its PaymentIntent is on.
 *
 * loadStripe() is called once per key and cached because it injects a <script>
 * tag for Stripe.js that we don't want repeated.
 */
type Platform = 'gb' | 'ae';
const promises: Partial<Record<Platform, Promise<Stripe | null>>> = {};

export function getStripeClient(platform: Platform = 'gb'): Promise<Stripe | null> {
  const cached = promises[platform];
  if (cached) return cached;
  const key =
    platform === 'ae'
      ? process.env.NEXT_PUBLIC_STRIPE_UAE_PUBLISHABLE_KEY
      : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  let promise: Promise<Stripe | null>;
  if (!key) {
    console.error(`Stripe publishable key for ${platform} is not set`);
    promise = Promise.resolve(null);
  } else {
    promise = loadStripe(key);
  }
  promises[platform] = promise;
  return promise;
}
