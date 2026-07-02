import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/booking/record-authorization
 * Body: { bookingIntentId: string, paymentIntentId: string }
 *
 * Records a successful card authorisation on a booking the SENDER just paid
 * (e.g. accepting a traveler's proposal). Replaces the old client-side write
 * of payment_status/payment_amount, which let the browser set money columns
 * directly.
 *
 * We re-verify with Stripe that the PaymentIntent is really authorised
 * (requires_capture) and take the amount from Stripe — never from the client —
 * so payment_amount cannot be forged. The money columns are then written with
 * the service-role client (they are not client-writable under RLS).
 */
const schema = z.object({
  bookingIntentId: z.string().uuid(),
  paymentIntentId: z.string().min(1),
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

  const { data: intent, error: intentErr } = await supabase
    .from('booking_intents')
    .select('id, sender_id, payment_status')
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (intentErr || !intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Only the sender (the one who pays) can record their own authorisation.
  if (intent.sender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify the PaymentIntent with Stripe — the source of truth for both the
  // authorised state and the amount.
  const stripe = getStripe();
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
  } catch (e: any) {
    return NextResponse.json({ error: 'Payment intent not found' }, { status: 400 });
  }
  if (pi.status !== 'requires_capture') {
    return NextResponse.json(
      { error: `Payment not authorised (status=${pi.status})` },
      { status: 400 }
    );
  }

  const { error: updErr } = await getAdminClient()
    .from('booking_intents')
    .update({
      status: 'confirmed',
      payment_intent_id: pi.id,
      payment_status: 'authorized',
      payment_amount: pi.amount, // from Stripe, not the client
    })
    .eq('id', body.bookingIntentId);
  if (updErr) {
    console.error('[record-authorization] DB update failed:', updErr);
    return NextResponse.json({ error: 'Failed to record authorization' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
