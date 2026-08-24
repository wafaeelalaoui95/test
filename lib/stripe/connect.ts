import type Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/server';

/**
 * Stripe Connect helpers — the traveler payout side of the money flow.
 *
 * Model: SEPARATE CHARGES AND TRANSFERS.
 *   1. Sender is charged to the Jibly platform balance (manual capture =
 *      escrow). Unchanged from before Connect existed.
 *   2. On capture, we create a Transfer to the traveler's connected account
 *      for the amount minus our commission.
 *
 * Why not destination charges: the sender pays before a traveler is chosen in
 * the /envoyer broadcast flow, so there is no destination account to name at
 * PaymentIntent-creation time. Separate transfers also let us refund part of a
 * booking without unwinding the whole thing.
 */

/**
 * Jibly's commission, in basis points (1 bp = 0.01%). 1500 = 15%.
 * Single source of truth — change this one number to reprice the marketplace.
 */
export const PLATFORM_FEE_BPS = 1500;

/**
 * Fallback country for a Connect account when we can't determine the
 * traveler's own — ISO-3166 alpha-2. Set STRIPE_CONNECT_DEFAULT_COUNTRY to
 * match wherever your Stripe platform account is registered.
 *
 * This matters more than it looks: a platform can only open connected accounts
 * in another country if cross-border payouts are enabled on it, and the country
 * is IMMUTABLE once the account exists. Defaulting to the platform's own
 * country is the option that always works.
 */
export const DEFAULT_ACCOUNT_COUNTRY = (
  process.env.STRIPE_CONNECT_DEFAULT_COUNTRY ?? 'FR'
).toUpperCase();

/**
 * Split a captured amount into what Jibly keeps and what the traveler gets.
 * Both in cents. We round the fee DOWN so rounding dust always lands in the
 * traveler's favour rather than ours — cheaper than explaining a missing cent.
 */
export function splitAmount(amountCents: number): {
  feeCents: number;
  travelerCents: number;
} {
  const feeCents = Math.floor((amountCents * PLATFORM_FEE_BPS) / 10000);
  return { feeCents, travelerCents: amountCents - feeCents };
}

/**
 * Return the user's Connect account id, creating the account if they don't
 * have one yet. Stripe hosts the onboarding and the payout dashboard and owns
 * KYC — which is what we want, since we are not equipped to collect identity
 * documents for payouts ourselves.
 *
 * Writes with the service-role client because stripe_account_id is revoked
 * from the client role (see 2026-08-24-stripe-connect.sql).
 */
export async function getOrCreateConnectAccount(
  userId: string,
  email: string | undefined,
  country: string
): Promise<string> {
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_account_id) return profile.stripe_account_id;

  const accountId = await createRecipientAccount(userId, email, country);

  const { error } = await admin
    .from('profiles')
    .update({ stripe_account_id: accountId })
    .eq('id', userId);

  if (error) {
    // We created a Stripe account we then failed to record. Log loudly: the
    // next call would create a SECOND account for this user. The metadata
    // userId makes the orphan findable in the dashboard.
    console.error(
      `[connect] orphaned Stripe account ${accountId} for user ${userId}:`,
      error
    );
    throw new Error('Could not save your payout account. Please try again.');
  }

  return accountId;
}

/**
 * API version for the /v2 endpoints. Overridable without a deploy because
 * Stripe ships these often and the value that works is account-specific —
 * check Developers → API versions in the Dashboard if creation starts failing.
 */
const V2_API_VERSION = process.env.STRIPE_V2_API_VERSION ?? '2026-07-29.dahlia';

/**
 * Create a v2 connected account for a traveler.
 *
 * Called over raw fetch rather than the SDK: stripe@17.3.1 predates the
 * /v2/core/accounts surface, and this avoids an SDK bump we cannot test
 * locally. Everything AFTER creation still goes through the SDK — v2 account
 * ids are accepted by the v1 endpoints, so accountLinks.create and
 * accounts.retrieve work unchanged and return v1-shaped objects.
 *
 * Configuration is `recipient`, which carries stripe_balance.stripe_transfers
 * — the capability Stripe requires for indirect charges, i.e. the separate
 * charges and transfers model this integration uses.
 *
 * Note on liability: dashboard 'express' requires fees_collector and
 * losses_collector to both be 'application'. That means JIBLY absorbs
 * chargebacks and negative balances on these accounts, not Stripe. It is the
 * normal arrangement for a marketplace that adjudicates its own deliveries,
 * but it is real exposure.
 */
async function createRecipientAccount(
  userId: string,
  email: string | undefined,
  country: string
): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  const res = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Stripe-Version': V2_API_VERSION,
      // Two travelers double-clicking the button would otherwise get two
      // accounts; the DB check above is not a lock.
      'Idempotency-Key': `connect_account_${userId}`,
    },
    body: JSON.stringify({
      contact_email: email,
      identity: {
        // Immutable after creation — a wrong value means deleting the account
        // and starting over, which is why the caller maps it carefully.
        country: country.toLowerCase(),
        entity_type: 'individual',
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
              payouts: { requested: true },
            },
          },
        },
      },
      defaults: {
        // Deliberately no `currency`: it must be valid for the account's
        // country, and Stripe picks correctly from it. Setting it ourselves
        // only creates a way to fail (account_country_unsupported_currency).
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      dashboard: 'express',
      metadata: { userId },
      include: ['configuration.recipient', 'requirements'],
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Surface the version too — a version mismatch and a genuine rejection look
    // nothing alike once you can see both.
    console.error(
      `[connect] v2 account creation failed (HTTP ${res.status}, version ${V2_API_VERSION}):`,
      JSON.stringify(body?.error ?? body)
    );
    throw new Error(body?.error?.message ?? 'Stripe account creation failed');
  }

  if (!body?.id) {
    console.error('[connect] v2 account creation returned no id:', JSON.stringify(body));
    throw new Error('Stripe account creation returned no id');
  }

  return body.id as string;
}

/**
 * Mirror a Stripe Account's capability flags into profiles. Called from the
 * account.updated webhook and after the user returns from onboarding (so the
 * UI updates immediately instead of waiting on the webhook).
 */
export async function syncConnectAccount(account: Stripe.Account): Promise<void> {
  const userId = account.metadata?.userId;
  if (!userId) {
    console.warn(`[connect] account ${account.id} has no userId metadata`);
    return;
  }

  const chargesEnabled = account.charges_enabled === true;
  const payoutsEnabled = account.payouts_enabled === true;
  // "Onboarded" means Stripe has everything it needs — details_submitted alone
  // is not enough, since a submitted account can still be blocked on review.
  const onboarded = payoutsEnabled && account.details_submitted === true;

  const { error } = await getAdminClient()
    .from('profiles')
    .update({
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
      stripe_onboarded_at: onboarded ? new Date().toISOString() : null,
    })
    .eq('id', userId);

  if (error) console.error('[connect] syncConnectAccount failed:', error);
}
