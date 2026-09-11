import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import {
  getIndividualPersonId,
  personIdentityVerified,
} from '@/lib/stripe/connect';
import { resolveOnboardingActor } from '@/lib/stripe/onboarding';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/identity/create-session
 *
 * Creates a Stripe Identity VerificationSession for the current user and
 * returns the hosted-flow URL that the client should redirect to.
 *
 * ONE UPLOAD, NOT TWO. Stripe Identity and Connect KYC are separate systems:
 * a verification proves nothing to a connected account unless the session
 * names the Person it belongs to. That link is `related_person`, it is set at
 * CREATION and can never be added afterwards — which is why a user who
 * verified with us and then opened a payout account was asked for the very
 * same passport a second time, by Stripe's hosted form.
 *
 * So the account comes first now. When the traveler tells us where they bank,
 * we open the connected account before sending them to Stripe, and the
 * verification settles Jibly's identity check and Stripe's KYC at once.
 *
 * Flow:
 *   1. User starts verification (identity gate, or the payouts flow)
 *   2. Frontend POSTs here, with the payout country when it knows it
 *   3. We resolve — or create — the connected account, find its Person, and
 *      create a VerificationSession linked to that Person
 *   4. We return the session's `url`; the frontend redirects there
 *   5. User completes the flow on Stripe-hosted pages (upload doc + selfie)
 *   6. Stripe redirects back with ?identity=done
 *   7. Our webhook sets profiles.identity_verified_at, and Stripe clears
 *      individual.verification.document on the connected account by itself
 *
 * Someone with no payout country — a sender who may never carry a parcel —
 * gets an unlinked session, exactly as before. Nothing about their journey
 * changes, and there is no account to link to.
 */

/**
 * Did Stripe refuse the LINK, rather than the verification?
 *
 * related_person is documented for a Person "who's required to provide a
 * document". A Person with nothing outstanding, or one Stripe won't accept a
 * verification for, is a reason to fall back to an unlinked session — never a
 * reason to leave the traveler unable to verify at all. Any other error is
 * genuine and is rethrown.
 */
function isRelatedPersonRejection(e: any): boolean {
  const param = String(e?.param ?? e?.raw?.param ?? '');
  const message = String(e?.message ?? e?.raw?.message ?? '');
  return param.startsWith('related_person') || /related_person/i.test(message);
}

/**
 * The connected account this verification should settle, if there is one.
 *
 * The account on file ALWAYS wins, and the country is only ever used to open
 * a first one. resolveOnboardingActor(country) will replace an account whose
 * country doesn't match — correct when a traveler is deliberately redoing
 * payout setup, catastrophic here, where the country is a hint offered
 * alongside an identity check. Nobody should lose a half-finished payout
 * account because they picked the wrong entry in a dropdown on the way to
 * photographing their passport.
 *
 * Returning null is normal, not a failure: a sender who skipped the question
 * has no account to link to and gets an ordinary unlinked verification.
 */
async function resolveLinkAccountId(country?: string): Promise<string | null> {
  const existing = await resolveOnboardingActor();
  if ('actor' in existing) return existing.actor.accountId;

  if (country) {
    const created = await resolveOnboardingActor(country);
    if ('actor' in created) return created.actor.accountId;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const body = await req.json().catch(() => ({}) as any);

  // Where Stripe sends the user back after they finish (or abandon) the flow.
  // The client passes the page it started from (e.g. /voyager) so we return
  // them exactly there with their in-progress form intact.
  const origin = req.headers.get('origin') ?? req.nextUrl.origin;
  let returnTo = typeof body?.returnTo === 'string' ? body.returnTo : '/me';
  // Safety: only allow same-origin relative paths (no protocol-relative // or
  // absolute URLs that could redirect off-site).
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) returnTo = '/me';
  const sep = returnTo.includes('?') ? '&' : '?';
  const returnUrl = `${origin}${returnTo}${sep}identity=done`;

  const country =
    typeof body?.country === 'string' && /^[A-Za-z]{2}$/.test(body.country)
      ? body.country.toUpperCase()
      : undefined;

  try {
    const accountId = await resolveLinkAccountId(country);

    let account: Stripe.Account | null = null;
    if (accountId) {
      try {
        account = await stripe.accounts.retrieve(accountId);
      } catch (e: any) {
        // An account we can't read is one we can't link to. Verify anyway.
        console.warn(
          `[identity/create-session] could not read ${accountId}:`,
          e?.message
        );
      }
    }

    // Don't let a verified user burn a paid Stripe check for nothing. But
    // "nothing" is narrower than it used to be: a user verified BEFORE the
    // accounts-first reorder has a session that was never tied to their
    // Person, so Stripe still wants a document from them. Re-verifying is
    // exactly how that gets fixed, and it is the only way — Stripe has no API
    // to attach a finished session to a Person afterwards.
    const { data: profile } = await supabase
      .from('profiles')
      .select('identity_verified_at')
      .eq('id', user.id)
      .maybeSingle();
    if (
      profile?.identity_verified_at &&
      (!account || personIdentityVerified(account))
    ) {
      return NextResponse.json(
        { error: 'Identity already verified' },
        { status: 400 }
      );
    }

    const personId = account ? await getIndividualPersonId(account) : null;

    const params: Stripe.Identity.VerificationSessionCreateParams = {
      type: 'document',
      // metadata propagates into the webhook payload, letting us map the
      // verification back to OUR user without an extra DB lookup. The connect
      // ids ride along so a failed link is diagnosable from the session alone.
      metadata: {
        user_id: user.id,
        email: user.email ?? '',
        ...(account ? { connect_account: account.id } : {}),
        ...(personId ? { connect_person: personId } : {}),
      },
      options: {
        document: {
          // require a selfie matched against the ID photo — this is the
          // anti-fraud bit, otherwise stolen IDs would pass. It is also what
          // lets this session clear Stripe's proof_of_liveness requirement.
          require_matching_selfie: true,
          // accept national IDs + passports + driving licences (the most
          // permissive option; restricts only forbidden categories)
          require_live_capture: true,
        },
      },
      return_url: returnUrl,
    };

    let session: Stripe.Identity.VerificationSession;
    if (account && personId) {
      try {
        session = await stripe.identity.verificationSessions.create({
          ...params,
          related_person: { account: account.id, person: personId },
        });
      } catch (e: any) {
        if (!isRelatedPersonRejection(e)) throw e;
        // Stripe wouldn't take the link. The traveler still gets verified for
        // Jibly; the document requirement, if it ever appears, is picked up by
        // the payouts flow, which offers a linked check at that point.
        console.warn(
          `[identity/create-session] ${account.id}/${personId} rejected the link (${e?.code}: ${e?.message}) — verifying unlinked`
        );
        session = await stripe.identity.verificationSessions.create(params);
      }
    } else {
      session = await stripe.identity.verificationSessions.create(params);
    }

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
      // Whether this one upload will also settle Stripe's KYC. The UI uses it
      // to decide what to promise; false is not an error.
      linked: !!session.related_person,
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
