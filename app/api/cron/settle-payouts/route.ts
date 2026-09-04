import { NextRequest, NextResponse } from 'next/server';
import { retryPendingPayouts } from '@/lib/stripe/payout';
import { getAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/cron/settle-payouts
 *
 * Sweep every traveler who is owed money and can now receive it.
 *
 * Until this existed, a payout skipped at delivery — the traveler hadn't
 * finished their bank setup yet — was only retried when something happened to
 * ask about that specific person: an account.updated webhook, or the traveler
 * opening their own payouts page. So one traveler visiting the page settled
 * their own bookings and left another's sitting captured and delivered with no
 * transfer, indefinitely, with nobody told.
 *
 * Money owed to someone should not depend on them browsing. This runs on a
 * schedule and needs nobody present.
 *
 * Safe to run as often as you like: retryPendingPayouts only picks up bookings
 * that are captured, delivered and untransferred, and transferToTraveler is
 * idempotent per booking.
 */
export const runtime = 'nodejs';
// Never cached — a cached sweep is a sweep that didn't happen.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Vercel Cron sends this header, signed with the project's CRON_SECRET.
  // Refuse without it: this endpoint moves money, so it must not be callable
  // by anyone who guesses the path. Fails closed when the secret is unset.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // Who is owed something. Distinct travelers, not bookings — retryPendingPayouts
  // settles all of a person's outstanding bookings in one pass.
  const { data: owed, error } = await admin
    .from('booking_intents')
    .select('traveler_user_id')
    .eq('payment_status', 'captured')
    .is('transfer_id', null)
    .not('received_confirmed_at', 'is', null)
    .not('traveler_user_id', 'is', null)
    .limit(500);

  if (error) {
    console.error('[cron/settle-payouts] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const travelerIds = [...new Set((owed ?? []).map((b) => b.traveler_user_id))];
  if (!travelerIds.length) {
    return NextResponse.json({ travelers: 0, settled: 0 });
  }

  // Only those Stripe will actually accept a transfer for. Attempting the rest
  // would just log a skip per booking per run.
  const { data: payable } = await admin
    .from('profiles')
    .select('id')
    .in('id', travelerIds as string[])
    .eq('stripe_payouts_enabled', true);

  const ready = (payable ?? []).map((p) => p.id);

  console.log(
    `[cron/settle-payouts] ${travelerIds.length} traveler(s) owed, ${ready.length} payable`
  );

  // Sequential on purpose: each call makes several Stripe requests, and a
  // burst of parallel transfers is how you meet a rate limit while moving
  // money. There will never be many.
  let failed = 0;
  for (const travelerUserId of ready) {
    try {
      await retryPendingPayouts(travelerUserId);
    } catch (e: any) {
      failed++;
      console.error(
        `[cron/settle-payouts] failed for ${travelerUserId}:`,
        e?.message
      );
    }
  }

  return NextResponse.json({
    travelers: travelerIds.length,
    payable: ready.length,
    // Travelers owed money who still can't receive it. Worth watching: a number
    // that never falls is someone who has given up on payout setup and is
    // waiting on an email nobody sends.
    waitingOnSetup: travelerIds.length - ready.length,
    failed,
  });
}
