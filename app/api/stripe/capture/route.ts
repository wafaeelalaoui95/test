import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/capture
 * Body: { paymentIntentId: string, bookingIntentId: string }
 *
 * Captures the previously-authorised payment — i.e. actually pulls funds
 * from the sender's card. The escrow is released only when the *sender*
 * confirms receipt, so the typical caller is the sender clicking "J'ai
 * bien reçu" on /me. We accept either party for resilience (e.g. if we
 * later add an admin tool or an automated reconciliation job).
 *
 * Authorisation: the caller must be either
 *   - the SENDER of this booking (sender_id), OR
 *   - the TRAVELER who owns the trip (traveler_trip.user_id), OR
 *   - the user set as traveler_user_id directly on the booking
 *
 * We re-verify server-side because RLS doesn't apply to Stripe calls.
 */
const schema = z.object({
  paymentIntentId: z.string().min(1),
  bookingIntentId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Pull the booking + minimal context for auth & idempotency checks.
  const { data: intent, error: intentErr } = await supabase
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, traveler_trip_id, payment_intent_id, payment_status, received_confirmed_at'
    )
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (intentErr || !intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (intent.payment_intent_id !== body.paymentIntentId) {
    return NextResponse.json({ error: 'Payment intent mismatch' }, { status: 400 });
  }

  // ===== Authorisation =====
  // The caller is allowed if they are:
  //   - the sender of this booking
  //   - the traveler owner of the trip
  //   - the user set as traveler_user_id directly
  let isSender = intent.sender_id === user.id;
  let isTraveler = intent.traveler_user_id === user.id;

  // Trip-owner fallback for older bookings that carry only the trip. Used for
  // authorisation only — this route no longer moves money to the traveler.
  if (!isTraveler && intent.traveler_trip_id) {
    const { data: trip } = await supabase
      .from('traveler_trips')
      .select('user_id')
      .eq('id', intent.traveler_trip_id)
      .maybeSingle();
    if (trip?.user_id === user.id) isTraveler = true;
  }

  if (!isSender && !isTraveler) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Sender-initiated capture should only happen AFTER they have confirmed
  // receipt — protects against accidental early captures.
  if (isSender && !isTraveler && !intent.received_confirmed_at) {
    return NextResponse.json(
      { error: 'Receipt not yet confirmed' },
      { status: 400 }
    );
  }

  // Idempotency: already captured → return success without re-calling Stripe.
  if (intent.payment_status === 'captured') {
    return NextResponse.json({ ok: true, alreadyCaptured: true });
  }

  const stripe = getStripe();
  try {
    const captured = await stripe.paymentIntents.capture(body.paymentIntentId);

    // Mirror the Stripe status into our DB so the UI sees it immediately
    // without waiting for the webhook. Written with the service-role client:
    // the money columns are not client-writable (RLS), so the server owns them.
    const { error: updateErr } = await getAdminClient()
      .from('booking_intents')
      .update({ payment_status: 'captured', payment_amount: captured.amount })
      .eq('id', body.bookingIntentId);

    if (updateErr) {
      console.error('[capture] DB update failed after Stripe capture:', updateErr);
      // Stripe succeeded but our DB didn't reflect it. We still return ok
      // because the money moved; the webhook will reconcile if configured.
    }

    // NO payout here. This route runs when the traveler ACCEPTS, which is
    // before they have carried anything — paying them at that moment would
    // hand over the money for an undelivered parcel and break the escrow the
    // homepage promises.
    //
    // Capture stays here (it avoids the authorisation expiring during a long
    // trip), but the money stops in the Jibly balance. The transfer to the
    // traveler happens in /api/confirm-receipt, once the sender confirms the
    // parcel arrived. That split is the whole reason for using separate
    // charges and transfers rather than destination charges.
    return NextResponse.json({ ok: true, status: captured.status });
  } catch (e: any) {
    console.error('Stripe capture error:', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Capture failed' },
      { status: 500 }
    );
  }
}
