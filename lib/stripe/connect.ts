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
 * Pull the offending field paths out of a Stripe v2 error.
 *
 * "invalid_fields" on its own is unactionable — the whole question is which
 * ones. Stripe puts them under different keys depending on the error, so walk
 * the object and collect anything that looks like a field path rather than
 * relying on a single shape. Paths like "configuration.merchant.capabilities"
 * are structural, not user data.
 */
function extractFieldPaths(error: any): string[] {
  const found = new Set<string>();
  const visit = (node: any, depth: number) => {
    if (!node || depth > 4 || found.size >= 8) return;
    if (Array.isArray(node)) {
      node.forEach((n) => visit(n, depth + 1));
      return;
    }
    if (typeof node !== 'object') return;
    for (const key of ['path', 'field', 'param', 'parameter']) {
      const v = node[key];
      if (typeof v === 'string' && /^[a-z0-9_.\[\]]+$/i.test(v)) found.add(v);
    }
    for (const key of ['details', 'invalid_fields', 'fields', 'errors']) {
      if (node[key]) visit(node[key], depth + 1);
    }
  };
  visit(error, 0);
  return [...found];
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
 * Recipient configuration only, and no Stripe dashboard. Travelers are private
 * individuals carrying a parcel: they receive transfers and nothing else. The
 * merchant configuration would make them a merchant of record, and Stripe then
 * asks them for an industry, a website and a product description — questions
 * with no answer for a person with a suitcase.
 *
 * Note on liability: fees_collector and losses_collector are 'application'.
 * That means JIBLY absorbs
 * chargebacks and negative balances on these accounts, not Stripe. It is the
 * normal arrangement for a marketplace that adjudicates its own deliveries,
 * but it is real exposure.
 */
async function createRecipientAccount(
  userId: string,
  email: string | undefined,
  // Empty string means "we don't know" — Stripe then asks the traveler during
  // onboarding instead of us guessing wrong and locking it forever.
  country: string,
  locale: string,
  recreate = false
): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  // Stripe caches a response against an idempotency key for 24 hours and
  // replays it even if the account has since been deleted — so a key that is
  // stable per user makes a genuine retry impossible for a whole day, whether
  // the account was deleted in the Dashboard or the id was cleared from our
  // database.
  //
  // Bucketing by the minute gets both properties: rapid double-clicks share a
  // key and produce one account, while a deliberate retry a minute later is a
  // fresh request. `recreate` forces uniqueness for the known-dead case.
  const bucket = recreate ? Date.now() : Math.floor(Date.now() / 60_000);
  const idempotencyKey = `connect_account_${userId}_${bucket}`;

  const res = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Stripe-Version': V2_API_VERSION,
      // Two travelers double-clicking the button would otherwise get two
      // accounts; the DB check above is not a lock.
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      contact_email: email,
      identity: {
        // Country is set ONLY when we actually know the traveler's — it is
        // immutable after creation, and Stripe's hosted onboarding lets the
        // account owner pick from the countries enabled in the Dashboard when
        // we leave it out. Imposing the platform's own country here forced
        // every traveler into a UK account with a UK-only address field.
        ...(country ? { country: country.toLowerCase() } : {}),
        entity_type: 'individual',
      },
      // Both configurations are present, for different reasons.
      //
      // recipient carries stripe_balance.stripe_transfers — the only capability
      // it has, and the one indirect charges require: it lets money ARRIVE in
      // the traveler's Stripe balance.
      //
      // merchant is applied but requests nothing. Recipient alone is refused
      // with capability_not_available_without_other_capability — an account
      // that can receive funds but never release them isn't something Stripe
      // will create — and payouts to a bank hang off the merchant
      // configuration existing.
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
        // NO merchant configuration. Requesting card_payments here did satisfy
        // stripe_transfers' dependency, but at an unacceptable price: merchant
        // means "this account takes payments", so Stripe's onboarding then
        // asked travelers for an industry, a website and a product
        // description. They are private individuals carrying a parcel, not
        // businesses, and being asked to describe their company is the moment
        // they give up.
      },
      defaults: {
        // Deliberately no `currency`: it must be valid for the account's
        // country, and Stripe picks correctly from it. Setting it ourselves
        // only creates a way to fail (account_country_unsupported_currency).
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
        // Language of Stripe's hosted onboarding. Without this the form is
        // English regardless of who the traveler is — a poor first impression
        // on a French-first product, and a real obstacle for anyone who
        // doesn't read English while entering their bank details.
        locales: [locale],
      },
      // 'none', not 'express'. The Express dashboard is what appears to drag
      // the merchant configuration in — and it was buying us very little: the
      // one thing it offered, the "manage my bank details" login link, has
      // never worked on these accounts anyway. Stripe still hosts the
      // onboarding form; the traveler just doesn't get a Stripe dashboard.
      dashboard: 'none',
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
    // Carry Stripe's short error CODE (not its prose) so the UI can show a
    // reference the user can read out. Codes like
    // `account_create_activation_required` are diagnostic, not sensitive.
    const err: any = new Error(body?.error?.message ?? 'Stripe account creation failed');
    err.stripeCode =
      body?.error?.code ?? body?.error?.type ?? `http_${res.status}`;
    // invalid_fields is useless without knowing WHICH fields. Stripe nests
    // them differently across error shapes, so collect any path-like strings
    // rather than betting on one key.
    err.stripeFields = extractFieldPaths(body?.error);
    throw err;
  }

  if (!body?.id) {
    console.error('[connect] v2 account creation returned no id:', JSON.stringify(body));
    throw new Error('Stripe account creation returned no id');
  }

  return body.id as string;
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
