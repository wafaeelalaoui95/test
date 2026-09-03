import type Stripe from 'stripe';
import { getStripe } from './server';
import { getServerClient } from '@/lib/supabase/server';
import {
  getOrCreateConnectAccount,
  getStoredConnectAccountId,
  clearConnectAccount,
  isMissingAccountError,
  isAccountPayable,
  ensureBusinessProfile,
} from './connect';
import { isPayoutCountry } from './payout-countries';

/**
 * Shared plumbing for payout onboarding, whether it happens on OUR pages
 * (api/connect/details, /bank, /accept-terms) or on Stripe's hosted form
 * (api/connect/onboard, kept as the fallback for requirements our own screens
 * don't cover — identity documents above all).
 *
 * Both paths need the same two things first: the caller must be a verified
 * user, and there must be an account in the right country to write to.
 */

/** A refusal a route can return verbatim. `code` is opaque and safe to show. */
export type OnboardingError = { code: string; status: number };

export type OnboardingActor = {
  userId: string;
  email: string | undefined;
  accountId: string;
};

/**
 * Who is calling, and which account are we allowed to touch?
 *
 * Payouts require a verified identity: money leaving to someone we never
 * checked is not a risk worth taking, and Stripe would block it at KYC anyway
 * with a worse error.
 *
 * Pass a country to create or replace the account (the first step of
 * onboarding). Omit it to operate on the account already on file — every step
 * after the first, which must never quietly create a second account.
 */
export async function resolveOnboardingActor(
  country?: string
): Promise<{ actor: OnboardingActor } | { error: OnboardingError }> {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: { code: 'unauthorized', status: 401 } };

  const { data: profile } = await supabase
    .from('profiles')
    .select('identity_verified_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.identity_verified_at) {
    return { error: { code: 'identity_required', status: 403 } };
  }

  if (!country) {
    const existing = await getStoredConnectAccountId(user.id);
    if (!existing) return { error: { code: 'no_account', status: 409 } };
    return {
      actor: { userId: user.id, email: user.email, accountId: existing },
    };
  }

  if (!isPayoutCountry(country)) {
    return { error: { code: 'country_required', status: 400 } };
  }

  const stripe = getStripe();

  // The country is immutable on a Stripe account, so an account already on
  // file in the WRONG country cannot be reused — the traveler's choice would
  // be silently ignored. Unfinished → replace. Finished → refuse, because
  // recreating throws away completed KYC.
  const existingId = await getStoredConnectAccountId(user.id);
  if (existingId) {
    try {
      const existing = await stripe.accounts.retrieve(existingId);
      if (existing.country && existing.country.toUpperCase() !== country) {
        if (isAccountPayable(existing)) {
          return { error: { code: 'country_locked', status: 409 } };
        }
        console.warn(
          `[connect] replacing unfinished ${existing.country} account for user ${user.id} with ${country}`
        );
        await clearConnectAccount(user.id);
      } else {
        await ensureBusinessProfile(existing);
      }
    } catch (e: any) {
      if (!isMissingAccountError(e)) throw e;
    }
  }

  const accountId = await getOrCreateConnectAccount(
    user.id,
    user.email,
    country,
    'fr-FR',
    // A just-cleared account was created moments ago, so its idempotency key
    // would still be cached and replay the old country.
    true
  );

  return { actor: { userId: user.id, email: user.email, accountId } };
}

/**
 * Requirements a traveler can satisfy on OUR forms, versus ones that still
 * need Stripe's.
 *
 * Everything here is a plain value we can ask for in a text field. Anything
 * else — an identity document, a proof of address, a national ID number, the
 * politically-exposed-person question — is deliberately NOT handled: documents
 * need a whole capture UI, id_number is data we would rather never hold, and
 * the PEP question has legally specific wording. Those travelers get the
 * hosted form instead. Better a few people meet Stripe's screen than everyone.
 */
const SELF_SERVE_REQUIREMENTS = new Set([
  'external_account',
  'individual.first_name',
  'individual.last_name',
  'individual.dob.day',
  'individual.dob.month',
  'individual.dob.year',
  'individual.address.line1',
  'individual.address.line2',
  'individual.address.city',
  'individual.address.postal_code',
  'individual.address.state',
  'individual.email',
  'individual.phone',
  'tos_acceptance.date',
  'tos_acceptance.ip',
  // Present on some accounts and satisfied by account creation, not by the
  // traveler — listing them keeps them from tripping the fallback.
  'business_type',
  'business_profile.mcc',
  'business_profile.product_description',
  'business_profile.url',
]);

/**
 * Anything Stripe wants that our own screens can't collect. Empty means the
 * traveler can finish on Jibly; non-empty means hand them the hosted link.
 */
export function unsupportedRequirements(account: Stripe.Account): string[] {
  const due = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];
  return [...new Set(due)].filter((r) => !SELF_SERVE_REQUIREMENTS.has(r));
}

/**
 * The client's IP, for tos_acceptance. Stripe requires the address the person
 * actually accepted from, so this must be the forwarded client address and not
 * the server's — Vercel puts it first in x-forwarded-for.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip');
}
