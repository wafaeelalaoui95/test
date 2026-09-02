import type Stripe from 'stripe';
import { getStripe } from './server';
import { getAdminClient } from '@/lib/supabase/server';
import { PAYOUT_COUNTRIES } from './payout-countries';
import { getSiteUrl } from '@/lib/site-url';

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
  country: string,
  locale: string,
  // Set when deliberately replacing an account we've just discovered is dead.
  // See the idempotency note in createRecipientAccount.
  recreate = false
): Promise<string> {
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.stripe_account_id) return profile.stripe_account_id;

  const accountId = await createRecipientAccount(
    userId,
    email,
    country,
    locale,
    recreate
  );

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
 * The Connect account id on file, if any. Read separately from
 * getOrCreateConnectAccount so a caller can inspect the existing account —
 * notably its country, which is immutable — before deciding to reuse it.
 */
export async function getStoredConnectAccountId(
  userId: string
): Promise<string | null> {
  const { data } = await getAdminClient()
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.stripe_account_id ?? null;
}

/**
 * Forget the Connect account we have on file for this user, so the next
 * onboarding attempt creates a fresh one.
 *
 * The case this exists for: switching Stripe from test keys to live. Account
 * ids are per-mode, so every stripe_account_id captured in a sandbox is a
 * dangling reference the moment live keys are deployed — and the failure
 * surfaces confusingly, as an invalid request when creating the account link
 * rather than anything mentioning modes.
 */
export async function clearConnectAccount(userId: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('profiles')
    .update({
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
      stripe_onboarded_at: null,
    })
    .eq('id', userId);
  if (error) console.error('[connect] clearConnectAccount failed:', error);
}

/**
 * Does this Stripe error mean "the account you named doesn't exist here"?
 * Covers both the typed code and the message, since the SDK isn't consistent
 * about which it populates for cross-mode id lookups.
 */
export function isMissingAccountError(e: any): boolean {
  const code = e?.code ?? e?.raw?.code ?? '';
  const message = e?.message ?? e?.raw?.message ?? '';
  return (
    code === 'resource_missing' ||
    code === 'account_invalid' ||
    // Stripe populates no code for this one and phrases it several ways.
    // accountLinks.create on a foreign/dead id says "You requested an account
    // link for an account that is not connected to your platform or does not
    // exist"; accounts.retrieve says "No such account".
    /no such account/i.test(message) ||
    /not connected to your platform/i.test(message)
  );
}

/**
 * Is paying this country a cross-border payout for us?
 *
 * Our platform is UK-registered, so anywhere in the UK/EEA/Switzerland transfer
 * zone is ordinary. Everything else — Morocco, the countries Custom accounts
 * reach beyond Europe — goes through Stripe's cross-border payouts, which is
 * where the recipient service agreement applies.
 */
function isCrossBorder(country: string): boolean {
  return !(PAYOUT_COUNTRIES as readonly string[]).includes(
    country.toUpperCase()
  );
}

/**
 * What a traveler's Stripe account says the traveler does.
 *
 * Prefilled so Stripe's hosted onboarding stops asking a private individual to
 * describe a business. Stripe confirmed the "Business details" step is shown
 * regardless of collection_options.fields — it is not driven by the
 * requirements hash, so 'currently_due' cannot suppress it. Prefilling is the
 * documented alternative: "If the business doesn't have a URL, you can prefill
 * its business_profile.product_description instead."
 *
 * What goes in matters. An earlier attempt put JIBLY's website and trade code
 * here, which was wrong — this is the traveler's account, and it would have
 * described them as a logistics company they are not. What is below describes
 * what the traveler actually does: carry a parcel, get paid on delivery. That
 * is true of every one of them, and it is what Stripe's reviewers need.
 *
 * The `url` is the traveler's OWN page on Jibly — /u/<their id>, the public
 * profile listing their trips — not Jibly's corporate site. Stripe's docs ask
 * for exactly this: "If you onboard an account and your platform provides it
 * with a URL, prefill the account's business_profile.url." Jibly does provide
 * one. Leaving it empty left the Business details section incomplete, which is
 * the likeliest reason Stripe kept presenting the step at all.
 */
function travelerBusinessProfile(userId: string | null) {
  return {
    // 4215 — Courier Services, Air and Ground, Freight Forwarders.
    mcc: '4215',
    product_description:
      'Receives payment for hand-carrying a parcel on a trip they were already taking, on behalf of a private individual. Paid once the recipient confirms delivery. Not a business; no goods are sold.',
    ...(userId ? { url: `${getSiteUrl()}/u/${userId}` } : {}),
  };
}

/**
 * Backfill the business profile on an account that predates the prefill.
 *
 * business_profile is only set at creation, so every account opened before it
 * would still face the Business details step. This closes that gap on the way
 * into onboarding.
 *
 * Fills FIELD BY FIELD, and only what is empty. If the traveler already
 * answered one of these themselves, their answer stands — overwriting what
 * someone told Stripe about themselves is not ours to do, and it would rewrite
 * KYC data behind their back. Per-field rather than all-or-nothing so accounts
 * created after the first prefill (mcc + description, no url) still pick up
 * the url they are missing.
 *
 * Never throws: this is a nicety on the way to onboarding, and failing it must
 * not stop a traveler from being paid.
 */
export async function ensureBusinessProfile(
  account: Stripe.Account
): Promise<void> {
  const bp = account.business_profile;
  // metadata.userId is set at creation; without it we can't name the
  // traveler's profile page, so the url is simply left out.
  const wanted = travelerBusinessProfile(
    typeof account.metadata?.userId === 'string' ? account.metadata.userId : null
  );

  const patch: Record<string, string> = {};
  if (!bp?.mcc && wanted.mcc) patch.mcc = wanted.mcc;
  if (!bp?.product_description && wanted.product_description) {
    patch.product_description = wanted.product_description;
  }
  if (!bp?.url && wanted.url) patch.url = wanted.url;
  if (!Object.keys(patch).length) return;

  try {
    await getStripe().accounts.update(account.id, {
      business_profile: patch,
    });
  } catch (e: any) {
    console.warn(
      `[connect] could not backfill business_profile on ${account.id}:`,
      e?.message
    );
  }
}

/**
 * Create a connected account for a traveler.
 *
 * Accounts v1, `type: 'custom'`. Custom means no Stripe dashboard and no direct
 * contact between Stripe and the traveler — their relationship is with Jibly
 * alone. The cost is that we own communication: when Stripe later needs a
 * document, Jibly must ask for it. The account.updated webhook carries that
 * signal.
 *
 * v1 rather than /v2/core/accounts because the service agreement below has no
 * v2 expression, and because v1 is what Stripe support directed us to for a
 * payouts-only account.
 */
async function createRecipientAccount(
  userId: string,
  email: string | undefined,
  country: string,
  // Unused: v1 accounts have no locale field. Stripe's hosted onboarding picks
  // the language from the traveler's browser instead. Kept in the signature so
  // callers don't have to care which API version is underneath.
  _locale: string,
  recreate = false
): Promise<string> {
  // Stripe caches a response against an idempotency key for 24 hours and
  // replays it even if the account has since been deleted — so a key that is
  // stable per user makes a genuine retry impossible for a whole day.
  //
  // Bucketing by the minute gets both properties: rapid double-clicks share a
  // key and produce one account, while a deliberate retry a minute later is a
  // fresh request. `recreate` forces uniqueness for the known-dead case.
  const bucket = recreate ? Date.now() : Math.floor(Date.now() / 60_000);

  try {
    const account = await getStripe().accounts.create(
      {
        type: 'custom',
        // Immutable after creation. The traveler picks it from a dropdown for
        // exactly that reason — see /api/connect/onboard.
        country: country.toUpperCase(),
        email,
        business_type: 'individual',
        // The only capability a traveler needs: money arriving from us.
        capabilities: { transfers: { requested: true } },
        // The recipient agreement is CROSS-BORDER ONLY. Stripe refuses it for
        // a GB platform creating an FR account: "The recipient ToS agreement is
        // not supported for platforms in GB creating accounts in FR."
        //
        // So it is not the lighter-onboarding lever we hoped for inside
        // Europe — it is the mechanism for paying travelers OUTSIDE the
        // transfer zone, Morocco above all. Applied only there.
        ...(isCrossBorder(country)
          ? { tos_acceptance: { service_agreement: 'recipient' as const } }
          : {}),
        // See travelerBusinessProfile — this is what stops hosted onboarding
        // asking a private individual to describe a business.
        business_profile: travelerBusinessProfile(userId),
        metadata: { userId },
      },
      { idempotencyKey: `connect_account_${userId}_${bucket}` }
    );

    return account.id;
  } catch (e: any) {
    console.error(
      '[connect] account creation failed:',
      e?.type,
      e?.code,
      e?.message
    );
    const err: any = new Error(e?.message ?? 'Stripe account creation failed');
    err.stripeCode = e?.code ?? e?.raw?.code ?? e?.type ?? 'unknown';
    throw err;
  }
}

/**
 * Can this account actually be paid, with nothing left for the traveler to do?
 *
 * payouts_enabled ALONE is not that answer. Stripe turns it on optimistically
 * while requirements are still outstanding, giving the account a deadline
 * rather than blocking it — so a traveler who abandons onboarding halfway is
 * reported as payouts-enabled and shown "Paiements activés". They then believe
 * they are done, never finish, and the transfer is skipped at delivery.
 *
 * So we also require: the form was actually submitted, nothing is currently or
 * past due, and Stripe hasn't disabled the account for any reason.
 */
export function isAccountPayable(account: Stripe.Account): boolean {
  if (account.payouts_enabled !== true) return false;
  if (account.details_submitted !== true) return false;

  const req = account.requirements;
  if (!req) return true;
  if (req.disabled_reason) return false;
  if (req.currently_due?.length) return false;
  if (req.past_due?.length) return false;
  return true;
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

  const payable = isAccountPayable(account);

  const { error } = await getAdminClient()
    .from('profiles')
    .update({
      stripe_charges_enabled: account.charges_enabled === true,
      stripe_payouts_enabled: payable,
      stripe_onboarded_at: payable ? new Date().toISOString() : null,
    })
    .eq('id', userId);

  if (error) console.error('[connect] syncConnectAccount failed:', error);
}
