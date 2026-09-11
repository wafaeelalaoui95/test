import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { isAccountPayable, personIdentityVerified } from '@/lib/stripe/connect';
import {
  resolveOnboardingActor,
  unsupportedRequirements,
  identityRequirements,
  identityVerificationPending,
  dueRequirements,
} from '@/lib/stripe/onboarding';

/**
 * POST /api/connect/account
 * Body: { country: "NL" }
 *
 * Step one of payout onboarding on OUR pages: make sure an account exists in
 * the country the traveler picked, and report what Stripe still wants.
 *
 * The response drives which path the UI takes. `canSelfServe` false means
 * Stripe is asking for something neither our forms nor a Stripe Identity
 * check can produce — a national ID number, a proof of address — and that
 * traveler should be sent to the hosted form instead of being stuck in a flow
 * that can't finish. An identity DOCUMENT is no longer one of those: it comes
 * back as `identityDue` and the flow handles it in-app.
 */
const schema = z.object({
  country: z.string().length(2).toUpperCase(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const resolved = await resolveOnboardingActor(body.country);
  if ('error' in resolved) {
    return NextResponse.json(
      { error: resolved.error.code, code: resolved.error.code },
      { status: resolved.error.status }
    );
  }

  try {
    const account = await getStripe().accounts.retrieve(
      resolved.actor.accountId
    );
    const unsupported = unsupportedRequirements(account);

    return NextResponse.json({
      accountId: account.id,
      country: account.country,
      payoutsEnabled: isAccountPayable(account),
      requirementsDue: dueRequirements(account),
      // Stripe wants an identity document. Not a dead end any more: the
      // payouts flow answers it with a Stripe Identity check bound to this
      // account's Person, so the traveler uploads once and never on a
      // Stripe-branded page.
      identityDue: identityRequirements(account),
      // Whether Stripe has already accepted who this person is. Read from the
      // Person, not from profiles.identity_verified_at — a check made before
      // the accounts-first reorder proves nothing to Stripe.
      personVerified: personIdentityVerified(account),
      // A document already with Stripe and still being judged. Asking again
      // in that window is how someone uploads the same passport twice.
      identityPending: identityVerificationPending(account),
      // Field-level rejections — "the name doesn't match the document", and
      // similar. Without surfacing these the traveler retypes the same value
      // forever, which is the worst failure mode of API onboarding.
      errors: account.requirements?.errors ?? [],
      unsupported,
      canSelfServe: unsupported.length === 0,
    });
  } catch (e: any) {
    console.error('[connect/account]', e?.type, e?.code, e?.message);
    return NextResponse.json(
      { error: 'account_failed', code: e?.code ?? 'unknown' },
      { status: 500 }
    );
  }
}
