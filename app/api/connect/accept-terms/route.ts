import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { syncConnectAccount, isAccountPayable } from '@/lib/stripe/connect';
import { resolveOnboardingActor, clientIp } from '@/lib/stripe/onboarding';

/**
 * POST /api/connect/accept-terms
 *
 * Records that the traveler accepted Stripe's Connected Account Agreement.
 * The last step: Stripe will not enable payouts until this exists.
 *
 * The date and IP are Stripe's evidence that a real person agreed, so both
 * must describe the actual acceptance — the moment the traveler clicked, and
 * the address they clicked from. Hence clientIp() reading the forwarded
 * header rather than the server's own address, and the timestamp taken here
 * rather than sent by the client.
 *
 * The FORM is where the legal work happens, not this route: the page must
 * show the agreement link and, because our accounts are on the full service
 * agreement rather than the recipient one, Stripe's acquirer disclosure.
 * See components/PayoutOnboarding.tsx.
 */
export async function POST(req: NextRequest) {
  const resolved = await resolveOnboardingActor();
  if ('error' in resolved) {
    return NextResponse.json(
      { error: resolved.error.code, code: resolved.error.code },
      { status: resolved.error.status }
    );
  }

  const ip = clientIp(req.headers);
  if (!ip) {
    // Stripe requires it, and inventing one would be a false record of who
    // agreed to what.
    console.error('[connect/accept-terms] no client IP in request headers');
    return NextResponse.json(
      { error: 'terms_failed', code: 'no_client_ip' },
      { status: 400 }
    );
  }

  try {
    const account = await getStripe().accounts.update(
      resolved.actor.accountId,
      {
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip,
          ...(req.headers.get('user-agent')
            ? { user_agent: req.headers.get('user-agent')! }
            : {}),
        },
      }
    );

    // Accepting the terms is usually the step that flips the account payable,
    // so mirror the result immediately rather than waiting on the webhook —
    // the traveler is looking at the screen right now.
    await syncConnectAccount(account);

    return NextResponse.json({
      ok: true,
      payoutsEnabled: isAccountPayable(account),
      requirementsDue: [
        ...new Set([
          ...(account.requirements?.currently_due ?? []),
          ...(account.requirements?.past_due ?? []),
        ]),
      ],
    });
  } catch (e: any) {
    console.error('[connect/accept-terms]', e?.type, e?.code, e?.message);
    return NextResponse.json(
      { error: 'terms_failed', code: e?.code ?? 'unknown' },
      { status: 400 }
    );
  }
}
