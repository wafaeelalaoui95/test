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
  // Basil, not Acacia. The version matters for one feature in particular:
  // `related_person` on an Identity VerificationSession — the parameter that
  // ties a verification to a connected account's Person — was introduced in
  // 2025-06-30.basil. On Acacia there is no way to make one document upload
  // satisfy both Stripe Identity and Connect KYC, which is what this app now
  // relies on (see /api/identity/create-session).
  //
  // Nothing else here moved: Basil's breaking changes are confined to
  // Invoices, Subscriptions and Checkout, none of which this app uses.
  _stripe = new Stripe(key, {
    apiVersion: '2025-08-27.basil',
    typescript: true,
  });
  return _stripe;
}
