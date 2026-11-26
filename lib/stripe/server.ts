import Stripe from 'stripe';

/**
 * Server-side Stripe clients. Live only on the server (route handlers and
 * server components) — never imported from a client component because the
 * secret keys would leak.
 *
 * TWO PLATFORMS. Jibly runs two Stripe accounts in one Stripe organisation:
 *   - 'gb' — Jibly Limited (UK). Everything, by default. STRIPE_SECRET_KEY.
 *   - 'ae' — WEF Technologies FZE LLC (UAE). Only travellers paid out to a UAE
 *     bank account, because a UK platform cannot transfer to the UAE and a UAE
 *     platform can transfer nowhere else. STRIPE_UAE_SECRET_KEY.
 *
 * A booking's money lives entirely on ONE platform: it is authorised, captured,
 * refunded and transferred there, and nowhere else. Which one is recorded on
 * the booking (booking_intents.stripe_platform) when the payment is attached —
 * see lib/stripe/platform.ts and 2026-11-26-two-stripe-platforms.sql. Asking
 * the wrong platform about an id is not a harmless miss: several callers treat
 * "no such account" as "the account is dead, recreate it".
 *
 * Identity verification (Stripe Identity) is not money and stays on 'gb'.
 *
 * UAE env vars (Vercel, Production): STRIPE_UAE_SECRET_KEY,
 * NEXT_PUBLIC_STRIPE_UAE_PUBLISHABLE_KEY, STRIPE_UAE_WEBHOOK_SECRET,
 * STRIPE_UAE_CONNECT_WEBHOOK_SECRET, NEXT_PUBLIC_UAE_PAYOUTS=1. Changing any of
 * them needs a fresh build (see lib/stripe/payout-countries.ts).
 *
 * Pinning the API version avoids surprise behaviour changes when Stripe ships
 * a new release.
 */
export type StripePlatform = 'gb' | 'ae';

/** Anything read from the database or metadata → a platform. Unknown is 'gb'. */
export function asPlatform(value: unknown): StripePlatform {
  return value === 'ae' ? 'ae' : 'gb';
}

/**
 * Is the UAE platform switched on? Both the key and the switch: the key alone
 * must not expose the option to travellers before it has been tested.
 */
export function uaeEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_UAE_PAYOUTS === '1' && !!process.env.STRIPE_UAE_SECRET_KEY
  );
}

/**
 * The platforms with keys configured — for jobs that sweep every payment
 * (unfinished-payment reminders). A UAE key with the switch off still counts:
 * money already taken there must keep being looked after.
 */
export function configuredPlatforms(): StripePlatform[] {
  return process.env.STRIPE_UAE_SECRET_KEY ? ['gb', 'ae'] : ['gb'];
}

const clients: Partial<Record<StripePlatform, Stripe>> = {};

export function getStripe(platform: StripePlatform = 'gb'): Stripe {
  const cached = clients[platform];
  if (cached) return cached;
  const envName = platform === 'ae' ? 'STRIPE_UAE_SECRET_KEY' : 'STRIPE_SECRET_KEY';
  const key = process.env[envName];
  if (!key) {
    throw new Error(`${envName} is not set. Add it to your Vercel environment variables.`);
  }
  const client = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    typescript: true,
  });
  clients[platform] = client;
  return client;
}
