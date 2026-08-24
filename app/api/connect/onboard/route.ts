import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import {
  getOrCreateConnectAccount,
  DEFAULT_ACCOUNT_COUNTRY,
} from '@/lib/stripe/connect';
import { findCountryByName } from '@/lib/countries';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Resolve whatever we hold for a user's country into an ISO-3166 alpha-2 code,
 * which is the only thing stripe.accounts.create accepts.
 *
 * profiles.country is a FREE-TEXT field (see the input on /me) holding a
 * display name like "France" or "Maroc" — passing it to Stripe unmapped is an
 * immediate invalid_request_error. Anything we can't map confidently becomes
 * null so the caller falls back to the platform default rather than guessing:
 * the country is immutable on a Connect account, so a wrong guess means
 * deleting the account and starting over.
 */
function toCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Already a code (the client may send one explicitly).
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return findCountryByName(trimmed)?.code ?? null;
}

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
    // Precedence: what the client explicitly asked for, then the (free-text)
    // profile country mapped to a code, then the platform's own country.
    const country =
      toCountryCode(body.country) ??
      toCountryCode(profile.country) ??
      DEFAULT_ACCOUNT_COUNTRY;

    const accountId = await getOrCreateConnectAccount(
      user.id,
      user.email,
      country
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
    // Log the real error, return a generic one. Stripe's messages are written
    // for the developer, not the traveler — they run to paragraphs of API
    // advice and doc links, and rendering that in the payout modal is both
    // alarming and a small disclosure of how the integration is built.
    console.error('[connect/onboard]', e?.type, e?.code, e?.message);
    return NextResponse.json(
      { error: 'payout_setup_failed' },
      { status: 500 }
    );
  }
}
