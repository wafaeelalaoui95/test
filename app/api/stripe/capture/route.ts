import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/capture
 * Body: { paymentIntentId: string, bookingIntentId: string }
 *
 * Called when the traveler ACCEPTS a booking. Captures the previously
 * authorised payment — i.e. actually pulls the funds from the sender's card.
 *
 * Only the traveler who owns the trip can trigger capture for that booking.
 * We re-verify ownership server-side because RLS doesn't apply to Stripe
 * calls — we must do the auth check ourselves.
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

  // Verify that this user is actually the traveler for this booking — we go
  // through traveler_trips because booking_intents only stores the trip ID.
  const { data: intent, error: intentErr } = await supabase
    .from('booking_intents')
    .select('id, traveler_trip_id, payment_intent_id, payment_status')
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (intentErr || !intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.payment_intent_id !== body.paymentIntentId) {
    return NextResponse.json({ error: 'Payment intent mismatch' }, { status: 400 });
  }

  const { data: trip } = await supabase
    .from('traveler_trips')
    .select('user_id')
    .eq('id', intent.traveler_trip_id)
    .maybeSingle();
  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If already captured, return success idempotently. Avoids double-charging
  // on flaky network / double-click scenarios.
  if (intent.payment_status === 'captured') {
    return NextResponse.json({ ok: true, alreadyCaptured: true });
  }

  const stripe = getStripe();
  try {
    const captured = await stripe.paymentIntents.capture(body.paymentIntentId);

    // Mirror Stripe status into our DB so the UI knows immediately,
    // without waiting for the webhook.
    await supabase
      .from('booking_intents')
      .update({ payment_status: 'captured' })
      .eq('id', body.bookingIntentId);

    return NextResponse.json({ ok: true, status: captured.status });
  } catch (e: any) {
    console.error('Stripe capture error:', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Capture failed' },
      { status: 500 }
    );
  }
}
