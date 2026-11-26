import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import {
  syncConnectAccount,
  isAccountPayable,
  isMissingAccountError,
} from '@/lib/stripe/connect';
import { unsupportedRequirements } from '@/lib/stripe/onboarding';
import { retryPendingPayouts } from '@/lib/stripe/payout';
import { getServerClient } from '@/lib/supabase/server';

/**
 * GET /api/connect/status
 *
 * Where does the current user stand on payouts? Re-reads the live Stripe
 * account, re-syncs the cached flags, and reports what remains.
 *
 * The re-read matters for the moment a traveler finishes onboarding: they are
 * looking at the screen possibly before account.updated arrives, and telling
 * them setup is incomplete right after they completed it is how you generate
 * support mail.
 *
 * It runs even for an account that is already payable, because the payouts tab
 * needs the account's country to know whether changing bank should ask for an
 * IBAN or a sort code. This route is only hit from the payouts screen, so the
 * extra call is not on any hot path.
 */
export async function GET() {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'stripe_account_id, stripe_payouts_enabled, stripe_charges_enabled, stripe_onboarded_at, identity_verified_at'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.stripe_account_id) {
    return NextResponse.json({
      onboarded: false,
      payoutsEnabled: false,
      identityVerified: !!profile?.identity_verified_at,
      needsOnboarding: true,
    });
  }

  let payoutsEnabled = profile.stripe_payouts_enabled === true;
  let requirementsDue: string[] = [];
  // The full requirements hash, echoed back for diagnosis. This is what
  // actually answers "why is Stripe asking for a website?" — if
  // business_profile.url isn't in here, the hosted flow is collecting more
  // than Stripe requires, which is a different problem with a different fix.
  // Opening this route in a browser while logged in is the quickest way to
  // read it; no Stripe key or CLI needed.
  let requirements: Record<string, unknown> | null = null;
  // Requirements our own forms can't satisfy — empty means the traveler can
  // finish on Jibly.
  let unsupported: string[] = [];
  // Needed even for a finished account: it decides whether changing bank asks
  // for an IBAN or a sort code. It is immutable, so it is safe to trust.
  let country: string | null = null;
  // Set only when the Stripe read itself failed — see the catch below.
  let stripeError: string | null = null;
  let stripeErrorMessage: string | null = null;
  // The one failure the traveler can act on: the profile names an account this
  // key cannot see. Onboarding already recreates in that case, so the UI just
  // has to send them back through it instead of insisting they finish a setup
  // that points nowhere.
  let accountMissing = false;

  try {
    const account = await getStripe().accounts.retrieve(
      profile.stripe_account_id
    );
    const syncedUserId = await syncConnectAccount(account);
    country = account.country ?? null;
    // isAccountPayable, not account.payouts_enabled: Stripe sets that flag
    // while requirements are still outstanding, so trusting it tells a
    // traveler who abandoned onboarding that they are all set.
    payoutsEnabled = isAccountPayable(account);
    // Surfaced so the UI can say *what* Stripe is still waiting on rather
    // than a bare "incomplete".
    // Deduplicated: past_due is a SUBSET of currently_due, not a separate
    // list, so concatenating them showed every field twice.
    requirementsDue = [
      ...new Set([
        ...(account.requirements?.currently_due ?? []),
        ...(account.requirements?.past_due ?? []),
      ]),
    ];
    requirements = {
      currently_due: account.requirements?.currently_due ?? [],
      eventually_due: account.requirements?.eventually_due ?? [],
      past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
      // Handy context when reading the list: which of these actually block
      // money moving, and what shape of account we ended up creating.
      capabilities: account.capabilities ?? null,
      business_type: account.business_type ?? null,
      country: account.country ?? null,
      tos_acceptance: account.tos_acceptance ?? null,
      // The two fields that answer "why is Stripe emailing my traveler?".
      // A Custom account has no dashboard and Stripe owns no relationship
      // with its holder — the platform does. So if these come back
      // type: 'express' or stripe_dashboard.type: 'express', the account is
      // not what the code asked for, and Stripe writing to the traveler is
      // the correct behaviour for what it actually is.
      //
      // controller.requirement_collection says who Stripe chases for missing
      // documents: 'application' is us, 'stripe' is the traveler directly.
      type: account.type ?? null,
      controller: account.controller ?? null,
      // Answers "when does this person's money actually reach their bank?"
      // without opening the dashboard. interval 'manual' here means never,
      // on its own, no matter how long anyone waits — worth being able to see
      // rather than infer.
      payout_schedule: account.settings?.payouts?.schedule ?? null,
    };
    // Which requirements our own screens can't collect. Drives two things in
    // PayoutOnboarding: whether to hand this traveler the hosted form, and
    // which step to resume them at rather than restarting from the country.
    unsupported = unsupportedRequirements(account);

    // Settle anything owed to this traveler while we have the answer.
    //
    // The webhook was the only thing doing this, and it fires when Stripe
    // decides something changed — not when the traveler finishes. So a
    // traveler could complete setup, be told "all set", and still not be paid
    // for a parcel they had already delivered. This route is hit by the payouts
    // screen, which is exactly where they land afterwards.
    //
    // transferToTraveler is idempotent per booking, so a page refresh cannot
    // pay anyone twice.
    if (payoutsEnabled && syncedUserId) {
      await retryPendingPayouts(syncedUserId);
    }
  } catch (e: any) {
    console.error('[connect/status] retrieve failed:', e?.code, e?.message);
    // Fall through to the cached values — a Stripe outage should degrade to
    // stale data, not a broken /me page.
    //
    // But say so in the response. Without this the failure was indistinguishable
    // from a genuinely unfinished account: both answer payoutsEnabled false with
    // requirements null, and the traveler is told to complete a setup they have
    // already completed. 'resource_missing' here means the profile points at an
    // account this key cannot see — deleted, or belonging to the other mode.
    stripeError = e?.code ?? e?.type ?? 'unknown';
    stripeErrorMessage = e?.message ?? null;
    accountMissing = isMissingAccountError(e);
  }

  return NextResponse.json({
    // Echoed so it can be compared against the acct_ in the Stripe onboarding
    // URL — the quickest way to catch the app sending someone to an older
    // account than the one it reports on.
    accountId: profile.stripe_account_id,
    onboarded: payoutsEnabled,
    payoutsEnabled,
    identityVerified: !!profile.identity_verified_at,
    needsOnboarding: !payoutsEnabled,
    country,
    requirementsDue,
    unsupported,
    canSelfServe: unsupported.length === 0,
    requirements,
    // null on a healthy read. Anything else means the numbers above are stale
    // cache, not Stripe's answer.
    stripeError,
    stripeErrorMessage,
    accountMissing,
  });
}
