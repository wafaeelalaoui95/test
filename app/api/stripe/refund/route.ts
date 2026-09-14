import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  refundBooking,
  RELEASE_COLUMNS,
  type ReleasableBooking,
} from '@/lib/stripe/release';
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
 * balance while the traveler keeps a fee for an undelivered parcel. That
 * sequence lives in lib/stripe/release.ts, shared with /api/trip/cancel — two
 * copies of it is how one of them forgets the reversal.
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
    .select(`sender_id, ${RELEASE_COLUMNS}`);

  const { data: found } = await (body.bookingIntentId
    ? query.eq('id', body.bookingIntentId)
    : query.eq('payment_intent_id', body.paymentIntentId!)
  ).maybeSingle();
  const intent = found as (ReleasableBooking & { sender_id: string }) | null;

  if (!intent) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (intent.sender_id !== user.id && !actingAsAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (intent.payment_status !== 'captured') {
    return NextResponse.json(
      { error: 'Nothing to refund: payment was never captured' },
      { status: 400 }
    );
  }
  if (!intent.payment_intent_id || !intent.payment_amount) {
    return NextResponse.json({ error: 'Booking has no payment' }, { status: 400 });
  }

  const result = await refundBooking(intent, {
    amountCents: body.amountCents,
    reason: body.reason,
  });

  if (result.kind === 'nothing_owed') {
    // The only way to get here with a 'captured' status checked above is a
    // booking already refunded in full.
    return NextResponse.json({ ok: true, alreadyRefunded: true });
  }
  if (result.kind === 'failed') {
    const status = result.code === 'amount_too_large' ? 400 : 500;
    return NextResponse.json(
      { error: status === 400 ? result.message : 'refund_failed', code: result.code },
      { status }
    );
  }
  if (result.kind !== 'refunded') {
    return NextResponse.json({ error: 'refund_failed', code: 'unexpected' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    refundId: result.refundId,
    reversalId: result.reversalId,
    refundedCents: result.refundedCents,
    totalRefundedCents: result.totalRefundedCents,
  });
}
