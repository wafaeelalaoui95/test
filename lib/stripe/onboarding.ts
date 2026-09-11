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
  personIdentityVerified,
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
 * This used to refuse anyone without identity_verified_at, because identity
 * came first and payouts second. That order is now REVERSED, and deliberately:
 * a Stripe Identity check can only satisfy the connected account's KYC if the
 * account and its Person already exist when the verification is created
 * (related_person is set at creation and can never be added afterwards). So
 * the account is opened first and the identity check runs inside the payout
 * flow, against it — one document upload instead of two.
 *
 * Nothing is weakened by dropping the check here. Opening an account moves no
 * money: Stripe will not enable payouts until its own KYC passes, and
 * transferToTraveler reads stripe_payouts_enabled, which only
 * syncConnectAccount sets. The trust gate on publishing a trip is unchanged
 * and still reads identity_verified_at.
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
        // Replacing the account throws away whatever KYC it carries. That was
        // only a completed onboarding before; now it can also be an identity
        // document the traveler has already uploaded, because the Identity
        // check is bound to THIS account's Person and cannot be moved to
        // another one. Refuse rather than quietly ask them to upload again —
        // a wrong country after verifying needs a human, not a silent redo.
        if (isAccountPayable(existing) || personIdentityVerified(existing)) {
          console.warn(
            `[connect] user ${user.id} asked for ${country} but ${existing.id} (${existing.country}) is already verified — refusing`
          );
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
      // The stored account doesn't exist for this key — deleted, or created
      // under the test key and now read with the live one. Clearing it is the
      // whole point of catching this: getOrCreateConnectAccount below reads
      // the column first and returns whatever it finds, so leaving the dead id
      // in place made it hand back the same unusable account forever. The
      // traveler saw payout setup restart from the beginning and end in the
      // same place, with no error to explain it.
      console.warn(
        `[connect] stored account ${existingId} is not reachable for user ${user.id} — clearing and recreating`
      );
      await clearConnectAccount(user.id);
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
 * Everything here is a plain value we can ask for in a text field. A proof of
 * address, a national ID number, the politically-exposed-person question are
 * deliberately NOT handled: id_number is data we would rather never hold, and
 * the PEP question has legally specific wording. Those travelers get the
 * hosted form instead. Better a few people meet Stripe's screen than everyone.
 *
 * The identity DOCUMENT is no longer in that list — see
 * IDENTITY_REQUIREMENT_SUFFIXES below.
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
 * Requirements a Stripe Identity session settles on the traveler's behalf.
 *
 * Matched by suffix, not by exact string: the same requirement is named
 * `individual.verification.document` on an account whose holder IS the
 * business, and `person_1MK...verification.document` when Stripe indexes it by
 * Person. Both mean the same upload.
 *
 * `proof_of_liveness` belongs here because our sessions run with
 * require_matching_selfie — a face matched to the photo on the ID is exactly
 * what that requirement asks for.
 *
 * Not here, and deliberately: `additional_document`. That one is usually a
 * proof of ADDRESS (a utility bill, a bank statement), which an identity
 * document check does not produce. Claiming it would loop the traveler through
 * a verification that can never clear it.
 */
const IDENTITY_REQUIREMENT_SUFFIXES = [
  '.verification.document',
  '.verification.proof_of_liveness',
];

function isIdentityRequirement(requirement: string): boolean {
  return IDENTITY_REQUIREMENT_SUFFIXES.some((s) => requirement.endsWith(s));
}

/** Everything Stripe is waiting on, deduplicated. past_due is a subset of
 *  currently_due rather than a separate list, so the union is what matters. */
export function dueRequirements(account: Stripe.Account): string[] {
  return [
    ...new Set([
      ...(account.requirements?.currently_due ?? []),
      ...(account.requirements?.past_due ?? []),
    ]),
  ];
}

/**
 * Is Stripe waiting on an identity document for this account?
 *
 * When it is, the answer is a linked Stripe Identity session — NOT the hosted
 * form, and not a second upload. See /api/identity/create-session.
 */
export function identityRequirements(account: Stripe.Account): string[] {
  return dueRequirements(account).filter(isIdentityRequirement);
}

/**
 * Has a document been handed over and not yet judged?
 *
 * Stripe moves a requirement into pending_verification while it reviews, and
 * during that window it is neither due nor met. Without this the payouts
 * screen sees an unmet requirement, asks for the document again, and the
 * traveler uploads the same passport twice in five minutes — the exact
 * failure this whole change exists to remove.
 */
export function identityVerificationPending(account: Stripe.Account): boolean {
  return (account.requirements?.pending_verification ?? []).some(
    isIdentityRequirement
  );
}

/**
 * Anything Stripe wants that neither our own screens nor a Stripe Identity
 * session can collect. Empty means the traveler can finish on Jibly; non-empty
 * means hand them the hosted link.
 */
export function unsupportedRequirements(account: Stripe.Account): string[] {
  return dueRequirements(account).filter(
    (r) => !SELF_SERVE_REQUIREMENTS.has(r) && !isIdentityRequirement(r)
  );
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
