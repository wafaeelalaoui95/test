import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { isAdminUserId } from '@/lib/admin';

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
 * WHO MAY CALL THIS. The sender, or an operator (see lib/admin.ts). Not the
 * traveler: refunding themselves makes no sense, and self-service refunds by
 * the paid party are an obvious abuse vector.
 *
 * The sender's own access is itself narrow by accident of state, and worth
 * understanding before widening it: capture happens when the traveler ACCEPTS,
 * and release happens when the recipient CONFIRMS DELIVERY. So between those
 * two moments a sender can refund money for a service the traveler may already
 * have performed. That is why no self-service refund button exists in the UI —
 * a disputed delivery is a decision, not a click, and it belongs to an
 * operator.
 *
 * Refunding here rather than in the Stripe dashboard matters: the dashboard
 * refunds the sender but does NOT reverse the traveler's transfer and does NOT
 * update refunded_amount, so the money comes out of the Jibly balance and the
 * booking's record silently diverges from Stripe.
 */
const schema = z
  .object({
    bookingIntentId: z.string().uuid().optional(),
    // What an operator actually has in front of them is the Stripe dashboard,
    // where a booking is identified by its PaymentIntent — not by a Supabase
    // UUID they'd have to go and look up. Accept either.
    paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]+$/).optional(),
    amountCents: z.number().int().positive().max(1000000).optional(),
    reason: z.string().max(500).optional(),
  })
  .refine((b) => b.bookingIntentId || b.paymentIntentId, {
    message: 'bookingIntentId or paymentIntentId is required',
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

  // Decided BEFORE the read, because it decides which client does the reading:
  // an operator is not the sender, so RLS would hide the row from the
  // user-scoped client and the request would fail as "not found" rather than
  // working. isAdminUserId needs no row of its own.
  const actingAsAdmin = isAdminUserId(user.id);

  const query = (actingAsAdmin ? getAdminClient() : supabase)
    .from('booking_intents')
    .select(
      'id, sender_id, payment_intent_id, payment_status, payment_amount, transfer_id, transfer_amount, refunded_amount'
    );

  const { data: intent } = await (body.bookingIntentId
    ? query.eq('id', body.bookingIntentId)
    : query.eq('payment_intent_id', body.paymentIntentId!)
  ).maybeSingle();

  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.sender_id !== user.id && !actingAsAdmin) {
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
    // Log the real error, return a short code. Stripe's messages are written
    // for developers and can name internal ids — same reasoning as
    // /api/connect/onboard.
    console.error('[refund]', e?.type, e?.code, e?.message);
    const rawCode = e?.code ?? e?.raw?.code ?? 'refund_failed';
    const code = /^[a-z0-9_]{1,64}$/i.test(String(rawCode))
      ? String(rawCode)
      : 'refund_failed';
    return NextResponse.json(
      { error: 'refund_failed', code },
      { status: 500 }
    );
  }
}
