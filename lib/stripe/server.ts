import Stripe from 'stripe';

/**
 * Singleton Stripe server-side client. Lives only on the server (route handlers
 * and server components) — never imported from a client component because the
 * secret key would leak.
 *
 * The secret key comes from STRIPE_SECRET_KEY in Vercel env vars. In test mode
 * it's a key starting with `sk_test_`. Pinning the API version avoids surprise
 * behaviour changes when Stripe ships a new release.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to your Vercel environment variables.'
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  return _stripe;
}
