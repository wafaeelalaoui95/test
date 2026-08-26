import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { syncConnectAccount, isAccountPayable } from '@/lib/stripe/connect';
import { getServerClient } from '@/lib/supabase/server';

/**
 * GET /api/connect/status
 *
 * Where does the current user stand on payouts? Returns the cached DB flags,
 * and — when they are not yet payable — re-reads the live Stripe account and
 * re-syncs first.
 *
 * The re-read exists for the return-from-onboarding moment: the user lands on
 * /me?payouts=done possibly before account.updated arrives, and showing them
 * "setup incomplete" right after they completed setup is the kind of thing
 * that generates support mail. Once payouts are enabled we trust the cache and
 * skip the API call.
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

  if (!payoutsEnabled) {
    try {
      const account = await getStripe().accounts.retrieve(
        profile.stripe_account_id
      );
      await syncConnectAccount(account);
      // isAccountPayable, not account.payouts_enabled: Stripe sets that flag
      // while requirements are still outstanding, so trusting it tells a
      // traveler who abandoned onboarding that they are all set.
      payoutsEnabled = isAccountPayable(account);
      // Surfaced so the UI can say *what* Stripe is still waiting on rather
      // than a bare "incomplete".
      requirementsDue = [
        ...(account.requirements?.currently_due ?? []),
        ...(account.requirements?.past_due ?? []),
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
      };
    } catch (e: any) {
      console.error('[connect/status] retrieve failed:', e?.message);
      // Fall through to the cached values — a Stripe outage should degrade to
      // stale data, not a broken /me page.
    }
  }

  return NextResponse.json({
    onboarded: payoutsEnabled,
    payoutsEnabled,
    identityVerified: !!profile.identity_verified_at,
    needsOnboarding: !payoutsEnabled,
    requirementsDue,
    requirements,
  });
}
