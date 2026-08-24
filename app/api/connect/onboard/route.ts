import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getOrCreateConnectAccount } from '@/lib/stripe/connect';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/connect/onboard
 * Body: { country?: string }   // ISO-3166 alpha-2 of the traveler's bank
 *
 * Starts (or resumes) Stripe Express onboarding for the current user, so they
 * can be paid for deliveries. Returns a one-time hosted URL to redirect to.
 *
 * Flow, mirroring /api/identity/create-session:
 *   1. Traveler clicks "Recevoir mes paiements" on /me
 *   2. This route creates the Connect account if needed, then an AccountLink
 *   3. Frontend redirects to link.url (Stripe-hosted: identity, bank details)
 *   4. Stripe returns them to /me?payouts=done
 *   5. account.updated webhook flips profiles.stripe_payouts_enabled
 *
 * AccountLinks are single-use and expire in minutes, so we mint a fresh one on
 * every click rather than caching.
 */
const schema = z.object({
  // Defaults to FR: the marketplace is French-first. A traveler banking
  // elsewhere passes their own. Stripe cannot change this after creation.
  country: z.string().length(2).toUpperCase().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    // Tolerate an empty body — the common case is a bare click with no options.
    const raw = await req.text();
    body = schema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Payouts require a verified identity. Letting an unverified user onboard
  // would mean money leaving to someone we never checked — and Stripe would
  // block it at the KYC step anyway, just with a worse error.
  const { data: profile } = await supabase
    .from('profiles')
    .select('identity_verified_at, country')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.identity_verified_at) {
    return NextResponse.json(
      { error: 'identity_required' },
      { status: 403 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://jibly.io';

  try {
    const accountId = await getOrCreateConnectAccount(
      user.id,
      user.email,
      body.country ?? profile.country ?? 'FR'
    );

    const stripe = getStripe();
    const link = await stripe.accountLinks.create({
      account: accountId,
      // Where Stripe sends them if the link died before they finished. The UI
      // treats this as "click the button again" — a fresh link is minted.
      refresh_url: `${baseUrl}/me?payouts=refresh`,
      return_url: `${baseUrl}/me?payouts=done`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    console.error('[connect/onboard]', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Could not start payout setup' },
      { status: 500 }
    );
  }
}
