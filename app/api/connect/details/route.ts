import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { resolveOnboardingActor } from '@/lib/stripe/onboarding';

/**
 * POST /api/connect/details
 *
 * The traveler's own details, from Jibly's form rather than Stripe's.
 *
 * These are ORDINARY personal data — a name, a date of birth, a home address.
 * The account holds them already in spirit: profiles has the name and country.
 * The sensitive parts of onboarding never come through here: the IBAN is
 * tokenised in the browser by Stripe.js (see /api/connect/bank), and identity
 * documents are not collected by us at all — a traveler Stripe wants a
 * document from goes to the hosted form instead.
 *
 * We store nothing new locally. Stripe is the record; this route is a pipe.
 */
const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  dobDay: z.number().int().min(1).max(31),
  dobMonth: z.number().int().min(1).max(12),
  // Stripe rejects implausible years anyway; this keeps obvious typos from
  // becoming a support conversation.
  dobYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() - 13),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  state: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    // Name the offending fields so the form can mark them, without echoing
    // back what the person typed.
    const fields = Array.isArray(e?.issues)
      ? e.issues.map((i: any) => String(i.path?.[0] ?? '')).filter(Boolean)
      : [];
    return NextResponse.json(
      { error: 'invalid_details', fields },
      { status: 400 }
    );
  }

  const resolved = await resolveOnboardingActor();
  if ('error' in resolved) {
    return NextResponse.json(
      { error: resolved.error.code, code: resolved.error.code },
      { status: resolved.error.status }
    );
  }

  try {
    await getStripe().accounts.update(resolved.actor.accountId, {
      individual: {
        first_name: body.firstName,
        last_name: body.lastName,
        dob: { day: body.dobDay, month: body.dobMonth, year: body.dobYear },
        address: {
          line1: body.line1,
          ...(body.line2 ? { line2: body.line2 } : {}),
          city: body.city,
          postal_code: body.postalCode,
          ...(body.state ? { state: body.state } : {}),
          // No country: it is fixed by the account and Stripe rejects a
          // mismatch. The traveler already chose it at step one.
        },
        ...(resolved.actor.email ? { email: resolved.actor.email } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[connect/details]', e?.type, e?.code, e?.message);
    // Stripe's field path is the one genuinely useful thing in its error —
    // it tells the form which input to mark. The prose is not returned.
    const param =
      typeof e?.param === 'string' && /^[a-z0-9_.[\]]{1,80}$/i.test(e.param)
        ? e.param
        : null;
    return NextResponse.json(
      {
        error: 'details_failed',
        code: e?.code ?? 'unknown',
        ...(param ? { param } : {}),
      },
      { status: 400 }
    );
  }
}
