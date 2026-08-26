import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/identity/create-session
 *
 * Creates a new Stripe Identity VerificationSession for the current user
 * and returns the hosted-flow URL that the client should redirect to.
 *
 * Flow:
 *   1. User clicks "Vérifier mon identité" on /me
 *   2. Frontend POSTs to this route
 *   3. We create a Stripe VerificationSession, attaching the user.id as
 *      metadata so the webhook can map the result back to the right profile
 *   4. We return the session's `url` field; the frontend redirects there
 *   5. User completes the flow on Stripe-hosted pages (upload doc + selfie)
 *   6. Stripe redirects back to /me with ?identity=done
 *   7. Webhook (separate route) fires asynchronously with the outcome and
 *      updates profiles.identity_verified_at + verification_level
 *
 * Why metadata-based mapping instead of querying by user: it's idempotent,
 * cheap, and survives if the user reloads mid-flow.
 */
export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Don't let a verified user re-verify silently — it would burn a paid
  // Stripe check for nothing. If they want to re-do it (e.g. changed
  // legal name), they can contact support.
  const { data: profile } = await supabase
    .from('profiles')
    .select('identity_verified_at')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.identity_verified_at) {
    return NextResponse.json(
      { error: 'Identity already verified' },
      { status: 400 }
    );
  }

  const stripe = getStripe();

  // Build the return URL — where Stripe sends the user back after they
  // finish (or abandon) the flow. The client passes the page it started
  // from (e.g. /voyager) so we return the user exactly there with their
  // in-progress form intact, instead of always dumping them on /me.
  const origin = req.headers.get('origin') ?? req.nextUrl.origin;
  const body = await req.json().catch(() => ({} as any));
  let returnTo = typeof body?.returnTo === 'string' ? body.returnTo : '/me';
  // Safety: only allow same-origin relative paths (no protocol-relative // or
  // absolute URLs that could redirect off-site).
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/me';
  const sep = returnTo.includes('?') ? '&' : '?';
  const returnUrl = `${origin}${returnTo}${sep}identity=done`;

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      // metadata propagates into the webhook payload, letting us map the
      // verification back to OUR user without an extra DB lookup
      metadata: {
        user_id: user.id,
        email: user.email ?? '',
      },
      options: {
        document: {
          // require a selfie matched against the ID photo — this is the
          // anti-fraud bit, otherwise stolen IDs would pass
          require_matching_selfie: true,
          // accept national IDs + passports + driving licences (the most
          // permissive option; restricts only forbidden categories)
          require_live_capture: true,
        },
      },
      return_url: returnUrl,
    });

    // Also stash the session id on the profile right away. If Stripe's
    // webhook is slow (or we miss it), we can reconcile by polling Stripe
    // with this id later.
    await supabase
      .from('profiles')
      .update({
        identity_verification_id: session.id,
        identity_verification_status: 'pending',
      })
      .eq('id', user.id);

    return NextResponse.json({
      sessionId: session.id,
      // `url` is the hosted flow; the client redirects the user here.
      url: session.url,
    });
  } catch (e: any) {
    console.error('[identity/create-session] Stripe error:', e?.type, e?.code, e?.message);
    // Never return Stripe's prose. Its messages are addressed to whoever runs
    // the integration, not to the person in front of the screen — a user was
    // shown "have an account admin visit dashboard.stripe.com/identity/…",
    // which is both confusing and a disclosure of how this is wired.
    const rawCode = e?.code ?? e?.raw?.code ?? e?.type ?? 'unknown';
    const code = /^[a-z0-9_]{1,64}$/i.test(String(rawCode))
      ? String(rawCode)
      : 'unknown';
    return NextResponse.json(
      { error: 'identity_start_failed', code },
      { status: 500 }
    );
  }
}
