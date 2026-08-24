import type Stripe from 'stripe';
import { getStripe } from './server';
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
 * have one yet. Express accounts: Stripe hosts the onboarding and the payout
 * dashboard, and owns KYC — which is what we want, since we are not equipped
 * to collect identity documents for payouts ourselves.
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

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    // Two-letter ISO country of the traveler's *bank account*. Stripe cannot
    // change this after creation, so getting it wrong means deleting the
    // account and starting over.
    country,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { userId },
  });

  const { error } = await admin
    .from('profiles')
    .update({ stripe_account_id: account.id })
    .eq('id', userId);

  if (error) {
    // We created a Stripe account we then failed to record. Log loudly: the
    // next call would create a SECOND account for this user. The metadata
    // userId makes the orphan findable in the dashboard.
    console.error(
      `[connect] orphaned Stripe account ${account.id} for user ${userId}:`,
      error
    );
    throw new Error('Could not save your payout account. Please try again.');
  }

  return account.id;
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
