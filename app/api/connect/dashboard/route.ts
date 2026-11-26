import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
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
    console.error('[connect/dashboard]', e?.type, e?.code, e?.message);
    // Deliberately NOT clearing stripe_account_id here, even when the error
    // looks like a missing account. Opening a dashboard is a read-only action;
    // wiping a working payout account because a login link failed would be a
    // catastrophic response to a minor failure. Onboarding is where a stale id
    // gets repaired, because there the user is asking to create one anyway.
    const rawCode = e?.code ?? e?.raw?.code ?? e?.type ?? 'unknown';
    const code = /^[a-z0-9_]{1,64}$/i.test(String(rawCode))
      ? String(rawCode)
      : 'unknown';
    return NextResponse.json(
      { error: 'dashboard_failed', code },
      { status: 500 }
    );
  }
}
