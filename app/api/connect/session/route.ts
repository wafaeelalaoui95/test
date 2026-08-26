import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import {
  getOrCreateConnectAccount,
  getStoredConnectAccountId,
  clearConnectAccount,
  isMissingAccountError,
  isAccountPayable,
} from '@/lib/stripe/connect';
import { findCountryByName } from '@/lib/countries';
import { isPayoutCountry } from '@/lib/stripe/payout-countries';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/connect/session
 *
 * Returns a client secret for a Connect embedded onboarding component, so the
 * traveler completes setup INSIDE Jibly.
 *
 * This replaces the redirect to Stripe's hosted page. The fields Stripe asks
 * for are the same either way — Stripe owns that form — but the traveler never
 * leaves the site and never sees a co-branded "Jibly UK partners with Stripe"
 * splash. That hand-off was the actual objection, not the fields.
 *
 * Account creation is identical to /api/connect/onboard, deliberately: the two
 * routes differ only in what they hand back, a session secret rather than a
 * redirect URL.
 */
const schema = z.object({
  // The traveler picks this from a dropdown; Stripe requires it and freezes it
  // permanently, so we never infer it.
  country: z.string().length(2).toUpperCase().optional(),
});

function toCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return findCountryByName(trimmed)?.code ?? null;
}

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
    const raw = await req.text();
    body = schema.parse(raw ? JSON.parse(raw) : {});
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('identity_verified_at, country')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.identity_verified_at) {
    return NextResponse.json({ error: 'identity_required' }, { status: 403 });
  }

  try {
    const country =
      toCountryCode(body.country) ?? toCountryCode(profile.country) ?? '';

    if (!isPayoutCountry(country)) {
      return NextResponse.json(
        { error: 'payout_setup_failed', code: 'country_required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Same immutable-country guard as the redirect route: an existing account
    // is reused as-is, so a traveler who changes their mind about the country
    // would otherwise be silently ignored.
    const existingId = await getStoredConnectAccountId(user.id);
    if (existingId) {
      try {
        const existing = await stripe.accounts.retrieve(existingId);
        if (existing.country && existing.country.toUpperCase() !== country) {
          if (isAccountPayable(existing)) {
            return NextResponse.json(
              { error: 'payout_setup_failed', code: 'country_locked' },
              { status: 409 }
            );
          }
          await clearConnectAccount(user.id);
        }
      } catch (e: any) {
        if (!isMissingAccountError(e)) throw e;
      }
    }

    const accountId = await getOrCreateConnectAccount(
      user.id,
      user.email,
      country,
      'fr-FR',
      true
    );

    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            // The traveler shouldn't be pushed to change the terms they just
            // accepted, and we collect only what is currently due — same
            // stance as the redirect flow.
            external_account_collection: true,
          },
        },
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (e: any) {
    console.error('[connect/session]', e?.type, e?.code, e?.message);
    const rawCode = e?.stripeCode ?? e?.code ?? e?.raw?.code ?? e?.type ?? 'unknown';
    const code = /^[a-z0-9_]{1,64}$/i.test(String(rawCode))
      ? String(rawCode)
      : 'unknown';
    return NextResponse.json(
      { error: 'payout_setup_failed', code },
      { status: 500 }
    );
  }
}
