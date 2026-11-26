import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { resolveOnboardingActor } from '@/lib/stripe/onboarding';
import { getAdminClient } from '@/lib/supabase/server';

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

    // One bank account per traveler.
    //
    // Stripe restricts accounts when the same bank details show up under two
    // different verified identities, and it does so hours later with no usable
    // reason — the failure is silent, delayed, and lands on the traveler. It is
    // also the thing identity verification exists to prevent: paying traveler A
    // into traveler B's account.
    //
    // The fingerprint is a stable hash Stripe returns on the external account.
    // It is not the IBAN and cannot be reversed into one, so comparing it holds
    // nothing we would rather not hold. The check has to come after attaching,
    // because that is when Stripe computes it — so a duplicate is detached
    // again immediately rather than left on the account.
    const fingerprint = (account as any).fingerprint as string | undefined;
    if (fingerprint) {
      const admin = getAdminClient();
      const { data: clash } = await admin
        .from('profiles')
        .select('id')
        .eq('stripe_bank_fingerprint', fingerprint)
        .neq('id', resolved.actor.userId)
        .maybeSingle();

      if (clash) {
        await getStripe()
          .accounts.deleteExternalAccount(resolved.actor.accountId, account.id)
          .catch((err) =>
            console.error('[connect/bank] could not detach duplicate:', err?.message)
          );
        console.warn(
          `[connect/bank] user ${resolved.actor.userId} tried a bank account already held by ${clash.id}`
        );
        return NextResponse.json(
          { error: 'bank_already_used', code: 'bank_already_used' },
          { status: 409 }
        );
      }

      const { error: storeErr } = await admin
        .from('profiles')
        .update({ stripe_bank_fingerprint: fingerprint })
        .eq('id', resolved.actor.userId);
      // Not fatal: the bank account is attached and payouts will work. We just
      // lose the guard for this one, which the unique index still backstops.
      if (storeErr) {
        console.error('[connect/bank] could not store fingerprint:', storeErr.message);
      }
    }

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
