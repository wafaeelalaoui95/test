import { loadStripe, type Stripe } from '@stripe/stripe-js';

/**
 * Browser-side Stripe client (used by Stripe Elements). The publishable key
 * is fine to expose — it can only initiate payments, not capture them.
 *
 * loadStripe() is called once and cached because it injects a <script> tag
 * for Stripe.js that we don't want repeated.
 */
let _stripePromise: Promise<Stripe | null> | null = null;

export function getStripeClient(): Promise<Stripe | null> {
  if (_stripePromise) return _stripePromise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    _stripePromise = Promise.resolve(null);
    return _stripePromise;
  }
  _stripePromise = loadStripe(key);
  return _stripePromise;
}
