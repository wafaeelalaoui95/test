import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/cancel
 * Body: { paymentIntentId: string, bookingIntentId: string }
 *
 * Called when the traveler DECLINES (or the sender cancels). Releases the
 * authorisation — no funds move. The sender's bank may still show a
 * "pending" entry for a few days before disappearing, depending on the
 * issuer.
 *
 * Either the traveler or the original sender can cancel. We allow both
 * because:
 *   - traveler declines  → standard flow
 *   - sender changes mind → also fair (until traveler accepts)
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

  const { data: intent } = await supabase
    .from('booking_intents')
    .select('id, sender_id, traveler_trip_id, payment_intent_id, payment_status')
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.payment_intent_id !== body.paymentIntentId) {
    return NextResponse.json({ error: 'Payment intent mismatch' }, { status: 400 });
  }

  // Check authorisation: sender themselves, OR the traveler who owns the trip
  let allowed = intent.sender_id === user.id;
  if (!allowed) {
    const { data: trip } = await supabase
      .from('traveler_trips')
      .select('user_id')
      .eq('id', intent.traveler_trip_id)
      .maybeSingle();
    if (trip?.user_id === user.id) allowed = true;
  }
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Already canceled? Idempotent.
  if (intent.payment_status === 'canceled') {
    return NextResponse.json({ ok: true, alreadyCanceled: true });
  }
  if (intent.payment_status === 'captured') {
    // Can't "cancel" once captured — would need a refund, which is a different
    // operation. For the MVP we just say "too late".
    return NextResponse.json(
      { error: 'Payment already captured, cannot cancel' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  try {
    await stripe.paymentIntents.cancel(body.paymentIntentId);
    await supabase
      .from('booking_intents')
      .update({ payment_status: 'canceled' })
      .eq('id', body.bookingIntentId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Stripe cancel error:', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Cancel failed' },
      { status: 500 }
    );
  }
}
