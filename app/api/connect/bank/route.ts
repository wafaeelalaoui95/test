import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { resolveOnboardingActor } from '@/lib/stripe/onboarding';

/**
 * POST /api/connect/bank
 * Body: { token: "btok_..." }
 *
 * Attaches the traveler's bank account as the destination for their payouts.
 *
 * WE NEVER SEE THE IBAN. Stripe.js tokenises it in the browser — the number
 * goes from a Stripe-hosted input straight to Stripe, and what reaches this
 * route is a single-use `btok_` that is worthless to anyone else. That is the
 * whole reason building our own form is defensible: the part we would not want
 * to hold never touches us.
 *
 * Only possible because our accounts are controller.requirement_collection =
 * 'application' — Stripe refuses bank tokens on accounts it collects
 * requirements for itself.
 */
const schema = z.object({
  token: z.string().regex(/^btok_[A-Za-z0-9_]+$/),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const resolved = await resolveOnboardingActor();
  if ('error' in resolved) {
    return NextResponse.json(
      { error: resolved.error.code, code: resolved.error.code },
      { status: resolved.error.status }
    );
  }

  try {
    const account = await getStripe().accounts.createExternalAccount(
      resolved.actor.accountId,
      {
        external_account: body.token,
        // Replacing, not accumulating: someone correcting a typo or changing
        // bank should end up with one destination, not a growing list where
        // the wrong one might be default.
        default_for_currency: true,
      }
    );

    return NextResponse.json({
      ok: true,
      // Enough for the UI to show "•••• 4242" back. Never the full number.
      last4: (account as any).last4 ?? null,
      bankName: (account as any).bank_name ?? null,
    });
  } catch (e: any) {
    console.error('[connect/bank]', e?.type, e?.code, e?.message);
    return NextResponse.json(
      { error: 'bank_failed', code: e?.code ?? 'unknown' },
      { status: 400 }
    );
  }
}
