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
 *
 * AND THEN IT CAPTURES. This route used to stop at 'authorized', which left
 * this flow holding a card authorisation until the parcel was delivered —
 * exactly the arrangement the other flow deliberately rejected, because
 * Stripe drops an uncaptured authorisation after about seven days and most
 * trips are further out than that. A proposal accepted three weeks before the
 * flight therefore died quietly on day seven, and the capture attempted at
 * delivery failed: parcel carried, traveller never paid, nobody told.
 *
 * The two flows now agree. A sender booking a trip is captured when the
 * traveller accepts; a traveller's proposal is captured when the sender pays.
 * Both are the moment the SECOND party commits, which is the rule — here the
 * traveller committed by proposing and the sender by paying.
 *
 * Capturing is not paying the traveller. The money stops in the Jibly balance
 * and only a confirmed (or auto-released) delivery transfers it onward; see
 * /api/confirm-receipt and /api/cron/auto-release.
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

  // Record the authorisation BEFORE capturing. If the capture then fails we
  // are left with a booking that is confirmed and authorised, which is the
  // state this route used to end in anyway and which /api/cron/settle-payouts
  // and the refund path both already understand. The reverse order risks money
  // captured at Stripe with no row saying so.
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

  // Take the money now — see the note at the top of this file.
  try {
    const captured = await getStripe().paymentIntents.capture(pi.id);
    const { error: capErr } = await getAdminClient()
      .from('booking_intents')
      .update({ payment_status: 'captured', payment_amount: captured.amount })
      .eq('id', body.bookingIntentId);
    if (capErr) {
      // Stripe took the money and our row disagrees. Loud, because the sender
      // has really been charged and every downstream query keys off this
      // column. The webhook reconciles if configured.
      console.error('[record-authorization] captured but DB sync failed:', capErr.message);
    }
    return NextResponse.json({ ok: true, captured: true });
  } catch (e: any) {
    // The booking stands, authorised. Not fatal to the sender — their card is
    // still committed and the parcel is still booked — but it is now on the
    // seven-day clock this change exists to remove, so it has to be findable.
    console.error(
      '[record-authorization] capture failed for %s: %s',
      body.bookingIntentId,
      e?.message
    );
    return NextResponse.json({ ok: true, captured: false });
  }
}
