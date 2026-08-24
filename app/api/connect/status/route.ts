import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { syncConnectAccount } from '@/lib/stripe/connect';
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

  if (!payoutsEnabled) {
    try {
      const account = await getStripe().accounts.retrieve(
        profile.stripe_account_id
      );
      await syncConnectAccount(account);
      payoutsEnabled = account.payouts_enabled === true;
      // Surfaced so the UI can say *what* Stripe is still waiting on rather
      // than a bare "incomplete".
      requirementsDue = account.requirements?.currently_due ?? [];
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
  });
}
