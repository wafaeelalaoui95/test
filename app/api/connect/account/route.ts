import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { isAccountPayable } from '@/lib/stripe/connect';
import {
  resolveOnboardingActor,
  unsupportedRequirements,
} from '@/lib/stripe/onboarding';

/**
 * POST /api/connect/account
 * Body: { country: "NL" }
 *
 * Step one of payout onboarding on OUR pages: make sure an account exists in
 * the country the traveler picked, and report what Stripe still wants.
 *
 * The response drives which path the UI takes. `canSelfServe` false means
 * Stripe is asking for something our forms don't collect — an identity
 * document, a national ID number — and that traveler should be sent to the
 * hosted form instead of being stuck in a flow that can't finish.
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
      requirementsDue: [
        ...new Set([
          ...(account.requirements?.currently_due ?? []),
          ...(account.requirements?.past_due ?? []),
        ]),
      ],
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
