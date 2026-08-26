import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import {
  getOrCreateConnectAccount,
  clearConnectAccount,
  isMissingAccountError,
} from '@/lib/stripe/connect';
import { findCountryByName } from '@/lib/countries';
import { isPayoutCountry } from '@/lib/stripe/payout-countries';
import { getSiteUrl } from '@/lib/site-url';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Resolve whatever we hold for a user's country into an ISO-3166 alpha-2 code,
 * which is the only thing stripe.accounts.create accepts.
 *
 * profiles.country is a FREE-TEXT field (see the input on /me) holding a
 * display name like "France" or "Maroc" — passing it to Stripe unmapped is an
 * immediate invalid_request_error. Anything we can't map confidently becomes
 * null so the caller can reject the request rather than guessing: the country is
 * immutable on a Connect account, so the UI asks the traveler outright.
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
  // The traveler picks this from a dropdown; Stripe requires it and freezes it
  // permanently, so we never infer it.
  country: z.string().length(2).toUpperCase().optional(),
  // UI language, so Stripe's hosted onboarding renders in the language the
  // traveler was already reading. BCP-47-ish; anything unrecognised falls back.
  locale: z.enum(['fr', 'en']).optional(),
});

// Stripe wants a full locale tag, not the bare language code the app uses.
const STRIPE_LOCALES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

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

  // Where Stripe's "return to Jibly" button sends the traveler. Must be the
  // real domain — this is the one the user complained about landing on a
  // vercel.app address.
  const baseUrl = getSiteUrl();

  try {
    // What the traveler chose, or the (free-text) profile country when it maps
    // cleanly. Never the platform's own country: defaulting to GB is what made
    // every traveler a UK account holder, permanently.
    const country =
      toCountryCode(body.country) ?? toCountryCode(profile.country) ?? '';

    // Stripe rejects a v2 account without one (identity_country_required), and
    // it can never be changed afterwards — so refuse here rather than let a
    // guess become permanent. The UI asks the traveler directly.
    if (!isPayoutCountry(country)) {
      return NextResponse.json(
        { error: 'payout_setup_failed', code: 'country_required' },
        { status: 400 }
      );
    }

    const stripeLocale = STRIPE_LOCALES[body.locale ?? 'fr'] ?? 'fr-FR';
    const stripe = getStripe();

    const makeLink = (account: string) =>
      stripe.accountLinks.create({
        account,
        // Where Stripe sends them if the link died before they finished. The UI
        // treats this as "click the button again" — a fresh link is minted.
        refresh_url: `${baseUrl}/me?payouts=refresh`,
        return_url: `${baseUrl}/me?payouts=done`,
        type: 'account_onboarding',
      });

    const accountId = await getOrCreateConnectAccount(
      user.id,
      user.email,
      country,
      stripeLocale
    );

    let link;
    try {
      link = await makeLink(accountId);
    } catch (e: any) {
      // The stored account doesn't exist under the current keys — almost always
      // a sandbox id left behind by the switch to live mode. Forget it and
      // create a real one rather than making the traveler wait for someone to
      // clear a database column.
      if (!isMissingAccountError(e)) throw e;
      console.warn(
        `[connect/onboard] stale account ${accountId} for user ${user.id}; recreating`
      );
      await clearConnectAccount(user.id);
      const fresh = await getOrCreateConnectAccount(
        user.id,
        user.email,
        country,
        stripeLocale,
        // recreate: forces a fresh idempotency key, so Stripe doesn't replay
        // the cached response and hand back the dead account id again.
        true
      );
      link = await makeLink(fresh);
    }

    return NextResponse.json({ url: link.url });
  } catch (e: any) {
    // Log the real error, return a generic one. Stripe's messages are written
    // for the developer, not the traveler — they run to paragraphs of API
    // advice and doc links, and rendering that in the payout modal is both
    // alarming and a small disclosure of how the integration is built.
    console.error('[connect/onboard]', e?.type, e?.code, e?.message);
    // Return the short error code alongside the opaque error. Stripe's codes
    // are diagnostic identifiers, not prose and not secrets, and having one
    // visible in the UI turns "it doesn't work" into something answerable
    // without a trip to the server logs. Whitelisted charset so a stray
    // message can never ride out through this field.
    // e.type on an SDK error is the class name (StripeInvalidRequestError),
    // which says nothing useful. Prefer the actual codes.
    const rawCode =
      e?.stripeCode ?? e?.code ?? e?.raw?.code ?? e?.type ?? 'unknown';
    const code = /^[a-z0-9_]{1,64}$/i.test(String(rawCode))
      ? String(rawCode)
      : 'unknown';
    return NextResponse.json(
      { error: 'payout_setup_failed', code },
      { status: 500 }
    );
  }
}
