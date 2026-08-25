import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { clearConnectAccount, isMissingAccountError } from '@/lib/stripe/connect';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/connect/dashboard
 *
 * Returns a one-time URL into the traveler's Stripe Express dashboard, where
 * they can see their payouts and change their bank details.
 *
 * This is what makes payout setup revisitable rather than a one-shot gate:
 * onboarding collects the details once, and this is how someone changes their
 * IBAN two months later without contacting support. Stripe hosts it, so we
 * never see or store a bank account number.
 *
 * Login links are single-use and short-lived, hence minting one per click.
 */
export async function POST() {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.stripe_account_id) {
    // Nothing to log into yet — the caller should send them through onboarding.
    return NextResponse.json({ error: 'not_onboarded' }, { status: 409 });
  }

  try {
    const link = await getStripe().accounts.createLoginLink(
      profile.stripe_account_id
    );
    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    // Same stale-id case as onboarding: an account from another mode, or one
    // deleted in the Dashboard. Forget it so the UI falls back to setup.
    if (isMissingAccountError(e)) {
      console.warn(
        `[connect/dashboard] stale account for user ${user.id}; clearing`
      );
      await clearConnectAccount(user.id);
      return NextResponse.json({ error: 'not_onboarded' }, { status: 409 });
    }
    console.error('[connect/dashboard]', e?.type, e?.code, e?.message);
    return NextResponse.json({ error: 'dashboard_failed' }, { status: 500 });
  }
}
