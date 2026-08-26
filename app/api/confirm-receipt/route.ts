import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { transferToTraveler } from '@/lib/stripe/payout';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/confirm-receipt
 * Body: { bookingIntentId: string }
 *
 * Called when the TRAVELER confirms delivery on /me by entering the code the
 * recipient (the sender or their relative) gives them at drop-off. This is the
 * pivotal step of the whole escrow flow: it records receipt, unlocks mutual
 * reviews, and RELEASES THE MONEY to the traveler. The traveler can only reach
 * this by entering the recipient's code, so they can't self-release payment
 * without an actual handover.
 *
 * The funds were captured earlier, when the traveler accepted the booking
 * (/api/stripe/capture) — that avoids the card authorisation expiring during a
 * long trip. But they stop in the Jibly balance until this route runs. Capture
 * and transfer being two separate steps is precisely what makes the escrow
 * real, and why the integration uses separate charges and transfers.
 *
 * Why do this server-side as ONE operation:
 *   - The two updates (DB + Stripe) must stay in sync. Doing them as
 *     separate fetches from the browser means a flaky network can leave
 *     the booking in a "confirmed received but not captured" zombie state,
 *     with the traveler's money stuck.
 *   - Stripe's API is idempotent for capture (re-calling on an already-
 *     captured intent is a no-op), so it's safe to retry.
 *
 * Authorisation: only the SENDER of this booking can call this. We re-
 * verify server-side because RLS doesn't apply to Stripe calls.
 */

const schema = z.object({
  bookingIntentId: z.string().uuid(),
  // The delivery code the traveler reads out at drop-off. Required to release
  // the payment when the booking has one — this is what makes the handover
  // gate real (it used to be checked only client-side).
  code: z.string().optional(),
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

  // Pull the booking + context for auth.
  const { data: intent, error: intentErr } = await supabase
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, traveler_trip_id, payment_intent_id, payment_status, payment_amount, transfer_id, received_confirmed_at, delivery_proof_url, delivery_code'
    )
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (intentErr || !intent) {
    return NextResponse.json({ ok: false, reason: 'unknown' }, { status: 404 });
  }

  // Only the TRAVELER of THIS booking can confirm delivery (they enter the
  // recipient's code). Resolve the traveler directly or via the linked trip.
  let travelerId: string | null = intent.traveler_user_id ?? null;
  if (!travelerId && intent.traveler_trip_id) {
    const { data: trip } = await supabase
      .from('traveler_trips')
      .select('user_id')
      .eq('id', intent.traveler_trip_id)
      .maybeSingle();
    travelerId = trip?.user_id ?? null;
  }
  if (travelerId !== user.id) {
    return NextResponse.json({ ok: false, reason: 'not_traveler' }, { status: 403 });
  }

  // Sanity check: there must be a delivery proof before the sender can
  // claim receipt. Protects against accidental clicks pre-delivery.
  if (!intent.delivery_proof_url) {
    return NextResponse.json({ ok: false, reason: 'no_proof' }, { status: 400 });
  }

  // The handover gate: to release payment for the first time, the sender must
  // present the traveler's delivery code. Enforced here (server-side) so it
  // can't be bypassed by calling the endpoint directly. Skipped once already
  // received (idempotent retries).
  if (!intent.received_confirmed_at && intent.delivery_code && body.code !== intent.delivery_code) {
    return NextResponse.json({ ok: false, reason: 'invalid_code' }, { status: 400 });
  }

  // ===== STEP 1: mark received_confirmed_at =====
  // Idempotent: if it's already set, we don't overwrite the timestamp.
  if (!intent.received_confirmed_at) {
    // Money-flow columns are service-role-only (RLS); write via admin client.
    const { error: updateErr } = await getAdminClient()
      .from('booking_intents')
      .update({ received_confirmed_at: new Date().toISOString() })
      .eq('id', body.bookingIntentId);
    if (updateErr) {
      console.error('[confirm-receipt] DB update failed:', updateErr);
      return NextResponse.json(
        { error: 'Failed to record receipt' },
        { status: 500 }
      );
    }
  }

  // ===== STEP 2: capture the Stripe payment =====
  // Skip if there's no payment_intent_id (some legacy bookings) or if
  // already captured. We still return success in those cases — the DB
  // step (the source of truth for "received") is done.
  if (!intent.payment_intent_id) {
    return NextResponse.json({ ok: true, captured: false, reason: 'no_payment_intent' });
  }

  const stripe = getStripe();

  // Release the traveler's share. THIS is the moment the escrow opens: the
  // money has been sitting in the Jibly balance since the traveler accepted,
  // and only a confirmed delivery lets it go. /api/stripe/capture deliberately
  // does not do this — paying at acceptance would fund an undelivered parcel.
  const releaseToTraveler = (amountCents: number, chargeId: string | null) =>
    transferToTraveler({
      bookingIntentId: intent.id,
      travelerUserId: travelerId,
      existingTransferId: intent.transfer_id,
      amountCents,
      chargeId,
    });

  // Already captured — the normal case, since capture happens at acceptance.
  // Re-read the PaymentIntent for the charge id and the authoritative amount,
  // then pay out.
  if (intent.payment_status === 'captured') {
    const pi = await stripe.paymentIntents.retrieve(intent.payment_intent_id);
    const payout = await releaseToTraveler(
      pi.amount_received || intent.payment_amount || pi.amount,
      typeof pi.latest_charge === 'string'
        ? pi.latest_charge
        : pi.latest_charge?.id ?? null
    );
    return NextResponse.json({
      ok: true,
      captured: true,
      alreadyCaptured: true,
      payout,
    });
  }
  if (intent.payment_status !== 'authorized') {
    // unpaid / canceled / failed — we don't try to capture
    return NextResponse.json({
      ok: true,
      captured: false,
      reason: `payment_status=${intent.payment_status}`,
    });
  }

  try {
    const captured = await stripe.paymentIntents.capture(intent.payment_intent_id);

    // Mirror the new status into our DB so the wallet picks it up
    // immediately, without waiting for the webhook. Service-role write.
    const { error: statusErr } = await getAdminClient()
      .from('booking_intents')
      .update({ payment_status: 'captured', payment_amount: captured.amount })
      .eq('id', body.bookingIntentId);

    if (statusErr) {
      // Stripe captured fine but the DB write failed. Log loudly so we can
      // reconcile via the SQL script. We still return ok=true because the
      // money moved.
      console.error(
        '[confirm-receipt] Stripe captured but DB sync failed:',
        statusErr
      );
    }

    const payout = await releaseToTraveler(
      captured.amount,
      typeof captured.latest_charge === 'string'
        ? captured.latest_charge
        : captured.latest_charge?.id ?? null
    );

    return NextResponse.json({
      ok: true,
      captured: true,
      stripeStatus: captured.status,
      payout,
    });
  } catch (e: any) {
    console.error('[confirm-receipt] Stripe capture error:', e?.message);
    // The receipt was already recorded (step 1). Returning 500 lets the
    // caller surface an error to the user so they know to contact support
    // — but the booking is NOT lost: the SQL reconciliation script can
    // pick it up later.
    return NextResponse.json(
      {
        ok: false,
        receiptRecorded: true,
        captureError: e?.message ?? 'Capture failed',
      },
      { status: 500 }
    );
  }
}
