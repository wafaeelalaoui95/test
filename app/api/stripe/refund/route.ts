import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/refund
 * Body: { bookingIntentId: string, amountCents?: number, reason?: string }
 *
 * Refunds a booking whose payment was already CAPTURED — the case
 * /api/stripe/cancel explicitly refuses ("Payment already captured, cannot
 * cancel"). Parcel lost, never delivered, dispute settled in the sender's
 * favour: this is how the money goes back.
 *
 * Omit amountCents for a full refund; pass it to refund part of the booking.
 *
 * If the traveler was already paid we reverse their transfer proportionally in
 * the same operation, otherwise a refund would come entirely out of the Jibly
 * balance while the traveler keeps a fee for an undelivered parcel.
 *
 * Authorisation is deliberately NARROWER than capture/cancel: only the sender
 * may ask for their money back. A traveler refunding themselves makes no
 * sense, and self-service refunds by either party would be an obvious abuse
 * vector. Operator-initiated refunds go through the Stripe dashboard for now.
 */
const schema = z.object({
  bookingIntentId: z.string().uuid(),
  amountCents: z.number().int().positive().max(1000000).optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    .select(
      'id, sender_id, payment_intent_id, payment_status, payment_amount, transfer_id, transfer_amount, refunded_amount'
    )
    .eq('id', body.bookingIntentId)
    .maybeSingle();

  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.sender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (intent.payment_status !== 'captured') {
    return NextResponse.json(
      { error: 'Nothing to refund — payment was never captured' },
      { status: 400 }
    );
  }
  if (!intent.payment_intent_id || !intent.payment_amount) {
    return NextResponse.json({ error: 'Booking has no payment' }, { status: 400 });
  }

  const alreadyRefunded = intent.refunded_amount ?? 0;
  const remaining = intent.payment_amount - alreadyRefunded;
  if (remaining <= 0) {
    return NextResponse.json({ ok: true, alreadyRefunded: true });
  }

  const amount = body.amountCents ?? remaining;
  if (amount > remaining) {
    return NextResponse.json(
      { error: `Cannot refund more than the remaining ${remaining} cents` },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  try {
    // Reverse the traveler's cut FIRST. If this fails we want to know before
    // the sender is made whole, rather than after — a refund we cannot claw
    // back from the traveler is a loss we absorb.
    let reversalId: string | null = null;
    if (intent.transfer_id && intent.transfer_amount) {
      // Proportional: a 50% refund reverses 50% of the traveler's share, so a
      // partial refund doesn't take the whole payout back.
      const reverseAmount = Math.floor(
        (intent.transfer_amount * amount) / intent.payment_amount
      );
      if (reverseAmount > 0) {
        const reversal = await stripe.transfers.createReversal(
          intent.transfer_id,
          { amount: reverseAmount, metadata: { bookingIntentId: intent.id } },
          { idempotencyKey: `reversal_${intent.id}_${alreadyRefunded}_${amount}` }
        );
        reversalId = reversal.id;
      }
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: intent.payment_intent_id,
        amount,
        metadata: {
          bookingIntentId: intent.id,
          reason: body.reason ?? '',
        },
      },
      // Keyed on the amount refunded SO FAR, so a genuine second partial refund
      // gets its own key while an accidental double-submit does not.
      { idempotencyKey: `refund_${intent.id}_${alreadyRefunded}_${amount}` }
    );

    const total = alreadyRefunded + amount;
    const { error } = await getAdminClient()
      .from('booking_intents')
      .update({
        refunded_amount: total,
        refunded_at: new Date().toISOString(),
        // Only call it 'refunded' once nothing is left owed.
        payment_status:
          total >= intent.payment_amount ? 'refunded' : 'captured',
      })
      .eq('id', intent.id);

    if (error) {
      console.error('[refund] DB update failed after Stripe refund:', error);
    }

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      reversalId,
      refundedCents: amount,
      totalRefundedCents: total,
    });
  } catch (e: any) {
    console.error('[refund]', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Refund failed' },
      { status: 500 }
    );
  }
}
