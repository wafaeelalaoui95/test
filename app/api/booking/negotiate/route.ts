import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { syncRequestVisibility } from '@/lib/listings';
import { priceBreakdown } from '@/lib/utils';
import {
  awaitingParty,
  canSenderCounter,
  canTravelerCounter,
  checkSenderOffer,
  checkTravelerCounter,
  roundEuros,
} from '@/lib/negotiation';
import { notifyNegotiation } from '@/lib/negotiation-notify';

/**
 * POST /api/booking/negotiate
 *
 * Every change to a negotiated price goes through here (rules: lib/negotiation.ts).
 * The browser never writes a price: these columns are server-owned (see
 * migrations 2026-11-23-guard-booking-price.sql and -price-bargaining.sql).
 *
 *   { action: 'trip-offer', paymentIntentId, tripId, item_category, item_title?, item_description? }
 *       SENDER, booking a listed trip at a lower price. The card was authorised
 *       at that price by /api/stripe/create-payment-intent ({ tripId, offerTotal }).
 *       Creates the booking, waiting on the traveller.
 *
 *   { action: 'sender-counter', bookingIntentId, paymentIntentId }
 *       SENDER, answering a traveller's price with a lower one. Authorised by
 *       create-payment-intent ({ bookingIntentId, offerTotal }). Authorise only:
 *       nothing is captured until the traveller accepts.
 *
 *   { action: 'counter', bookingIntentId, amountTotal }
 *       TRAVELLER, answering the sender's price with a higher one. The sender's
 *       hold is released; they accept the counter by paying it.
 *
 *   { action: 'accept', bookingIntentId }
 *       TRAVELLER, accepting the sender's price: confirmed and captured.
 *
 *   { action: 'refuse', bookingIntentId }
 *       TRAVELLER, refusing the sender's price: cancelled, hold released.
 *
 * (The sender accepts a traveller's price by paying it — the existing
 * /api/booking/record-authorization — and refuses it with the existing decline.)
 */
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('trip-offer'),
    paymentIntentId: z.string().min(1),
    tripId: z.string().uuid(),
    item_category: z.string().min(1).max(60),
    item_title: z.string().max(120).nullish(),
    item_description: z.string().max(2000).nullish(),
  }),
  z.object({
    action: z.literal('sender-counter'),
    bookingIntentId: z.string().uuid(),
    paymentIntentId: z.string().min(1),
  }),
  z.object({
    action: z.literal('counter'),
    bookingIntentId: z.string().uuid(),
    amountTotal: z.number().positive().max(10_000),
  }),
  z.object({ action: z.literal('accept'), bookingIntentId: z.string().uuid() }),
  z.object({ action: z.literal('refuse'), bookingIntentId: z.string().uuid() }),
]);

const BOOKING_COLUMNS =
  'id, sender_id, traveler_user_id, traveler_trip_id, shipping_request_id, status, initiated_by, proposed_price, original_price, price_pending_by, sender_countered, traveler_countered, payment_status, payment_intent_id, payment_amount';

/** Same 4-digit handover codes as lib/supabase/queries.ts (kept here so this route does not pull the browser client in). */
function confirmationCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 10_000).toString().padStart(4, '0');
}

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Unauthorized', 401);

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return fail('Invalid request body');
  }

  const admin = getAdminClient();
  const stripe = getStripe();
  const now = new Date().toISOString();

  // ===========================================================================
  // SENDER: a lower price on a listed trip — creates the booking
  // ===========================================================================
  if (body.action === 'trip-offer') {
    // Idempotent: a double-click or a retry after a lost response must not
    // create two bookings on one authorisation.
    const { data: existing } = await admin
      .from('booking_intents')
      .select('id')
      .eq('payment_intent_id', body.paymentIntentId)
      .maybeSingle();
    if (existing) return NextResponse.json({ ok: true, bookingIntentId: existing.id });

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
    } catch {
      return fail('Payment intent not found');
    }
    const md = pi.metadata ?? {};
    if (pi.status !== 'requires_capture') return fail(`payment_not_authorised (${pi.status})`);
    if (md.userId !== user.id || md.tripId !== body.tripId || md.offer !== 'sender') {
      console.error('[negotiate] trip-offer PI %s does not match trip %s / user', pi.id, body.tripId);
      return fail('payment_mismatch');
    }

    const { data: trip } = await admin
      .from('traveler_trips')
      .select('id, user_id, status, compensation_min, departure_city, arrival_city')
      .eq('id', body.tripId)
      .maybeSingle();
    if (!trip || trip.status === 'cancelled' || trip.status === 'completed') {
      await stripe.paymentIntents.cancel(pi.id).catch(() => {});
      return fail('trip_not_open', 409);
    }
    if (trip.user_id === user.id) return fail('Cannot book your own trip');

    const listed = priceBreakdown(Number(trip.compensation_min)).total;
    const amount = roundEuros(pi.amount / 100);
    const err = checkSenderOffer(amount, listed);
    if (err) {
      // The listing moved between pricing and here, or the intent was forged.
      await stripe.paymentIntents.cancel(pi.id).catch(() => {});
      return fail(err);
    }

    const { data: created, error: insErr } = await admin
      .from('booking_intents')
      .insert({
        sender_id: user.id,
        traveler_user_id: trip.user_id,
        traveler_trip_id: trip.id,
        item_category: body.item_category,
        item_title: body.item_title?.trim() || null,
        item_description: body.item_description || null,
        pickup_city: trip.departure_city,
        destination_city: trip.arrival_city,
        initiated_by: 'sender',
        status: 'pending',
        proposed_price: amount,
        original_price: listed,
        price_pending_by: 'sender',
        sender_countered: true,
        price_updated_at: now,
        payment_intent_id: pi.id,
        payment_status: 'authorized',
        payment_amount: pi.amount,
        pickup_code: confirmationCode(),
        delivery_code: confirmationCode(),
      })
      .select('id')
      .single();
    if (insErr || !created) {
      console.error('[negotiate] trip-offer insert failed:', insErr?.message);
      await stripe.paymentIntents.cancel(pi.id).catch(() => {});
      return fail('Failed to save the offer', 500);
    }

    await admin.from('price_offers').insert({
      booking_intent_id: created.id,
      from_user: user.id,
      from_role: 'sender',
      amount_total: amount,
      kind: 'offer',
    });
    await notifyNegotiation(created.id, 'offer_to_traveler');
    return NextResponse.json({ ok: true, bookingIntentId: created.id });
  }

  // Every other action works on an existing booking.
  const { data: b } = await admin
    .from('booking_intents')
    .select(BOOKING_COLUMNS)
    .eq('id', body.bookingIntentId)
    .maybeSingle();
  if (!b) return fail('Booking not found', 404);

  const isSender = b.sender_id === user.id;
  let isTraveler = b.traveler_user_id === user.id;
  if (!isTraveler && b.traveler_trip_id) {
    const { data: trip } = await admin
      .from('traveler_trips')
      .select('user_id')
      .eq('id', b.traveler_trip_id)
      .maybeSingle();
    isTraveler = trip?.user_id === user.id;
  }

  // ===========================================================================
  // SENDER: a lower price in answer to a traveller's — authorised, not captured
  // ===========================================================================
  if (body.action === 'sender-counter') {
    if (!isSender) return fail('Forbidden', 403);
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
    } catch {
      return fail('Payment intent not found');
    }
    const md = pi.metadata ?? {};
    if (pi.status !== 'requires_capture') return fail(`payment_not_authorised (${pi.status})`);
    if (md.userId !== user.id || md.bookingIntentId !== b.id || md.offer !== 'sender') {
      return fail('payment_mismatch');
    }
    const amount = roundEuros(pi.amount / 100);
    const err = !canSenderCounter(b) ? 'not_allowed' : checkSenderOffer(amount, Number(b.proposed_price));
    if (err) {
      await stripe.paymentIntents.cancel(pi.id).catch(() => {});
      return fail(err, 409);
    }

    // Conditional on the state we checked, so two tabs cannot both counter.
    const { data: updated } = await admin
      .from('booking_intents')
      .update({
        proposed_price: amount,
        price_pending_by: 'sender',
        sender_countered: true,
        price_updated_at: now,
        payment_intent_id: pi.id,
        payment_status: 'authorized',
        payment_amount: pi.amount,
      })
      .eq('id', b.id)
      .eq('status', 'pending')
      .eq('payment_status', 'unpaid')
      .eq('sender_countered', false)
      .select('id');
    if (!updated?.length) {
      await stripe.paymentIntents.cancel(pi.id).catch(() => {});
      return fail('state_changed', 409);
    }
    await admin.from('price_offers').insert({
      booking_intent_id: b.id,
      from_user: user.id,
      from_role: 'sender',
      amount_total: amount,
      kind: 'counter',
    });
    await notifyNegotiation(b.id, 'offer_to_traveler');
    return NextResponse.json({ ok: true });
  }

  // The rest are the traveller answering a price the sender put on the table.
  if (!isTraveler) return fail('Forbidden', 403);
  if (awaitingParty(b) !== 'traveler' || b.price_pending_by !== 'sender') {
    return fail('not_your_move', 409);
  }

  // ===========================================================================
  // TRAVELLER: counter with a higher price
  // ===========================================================================
  if (body.action === 'counter') {
    if (!canTravelerCounter(b)) return fail('not_allowed', 409);
    const amount = roundEuros(body.amountTotal);
    const err = checkTravelerCounter(amount, Number(b.proposed_price), b.original_price);
    if (err) return fail(err);

    // DB first, then release the hold. If the release fails, the worst case is
    // an authorisation that lapses on its own — never a charge.
    const { data: updated } = await admin
      .from('booking_intents')
      .update({
        proposed_price: amount,
        price_pending_by: 'traveler',
        traveler_countered: true,
        price_updated_at: now,
        payment_intent_id: null,
        payment_status: 'unpaid',
        payment_amount: null,
      })
      .eq('id', b.id)
      .eq('status', 'pending')
      .eq('price_pending_by', 'sender')
      .eq('traveler_countered', false)
      .select('id');
    if (!updated?.length) return fail('state_changed', 409);

    if (b.payment_intent_id) {
      await stripe.paymentIntents.cancel(b.payment_intent_id).catch((e: any) => {
        console.error('[negotiate] counter: could not release %s: %s', b.payment_intent_id, e?.message);
      });
    }
    await admin.from('price_offers').insert({
      booking_intent_id: b.id,
      from_user: user.id,
      from_role: 'traveler',
      amount_total: amount,
      kind: 'counter',
    });
    await notifyNegotiation(b.id, 'counter_to_sender');
    return NextResponse.json({ ok: true });
  }

  // ===========================================================================
  // TRAVELLER: refuse — the booking ends, the hold is released
  // ===========================================================================
  if (body.action === 'refuse') {
    const { data: updated } = await admin
      .from('booking_intents')
      .update({ status: 'cancelled', price_pending_by: null, payment_status: 'canceled' })
      .eq('id', b.id)
      .eq('status', 'pending')
      .eq('price_pending_by', 'sender')
      .select('id');
    if (!updated?.length) return fail('state_changed', 409);
    if (b.payment_intent_id) {
      await stripe.paymentIntents.cancel(b.payment_intent_id).catch((e: any) => {
        console.error('[negotiate] refuse: could not release %s: %s', b.payment_intent_id, e?.message);
      });
    }
    await syncRequestVisibility(b.id);
    await notifyNegotiation(b.id, 'refused_to_sender');
    return NextResponse.json({ ok: true });
  }

  // ===========================================================================
  // TRAVELLER: accept — confirmed, then captured (the second party committing)
  // ===========================================================================
  if (b.payment_status !== 'authorized' || !b.payment_intent_id) return fail('not_payable', 409);
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(b.payment_intent_id);
  } catch {
    return fail('Payment intent not found');
  }
  const expected = Math.round(Number(b.proposed_price) * 100);
  if (
    pi.status !== 'requires_capture' ||
    pi.amount < expected ||
    (pi.metadata?.userId && pi.metadata.userId !== b.sender_id)
  ) {
    console.error('[negotiate] accept refused for %s: PI %s status=%s amount=%s expected=%s', b.id, pi.id, pi.status, pi.amount, expected);
    return fail('payment_expired_or_mismatch', 409);
  }

  const { data: updated } = await admin
    .from('booking_intents')
    .update({ status: 'confirmed', price_pending_by: null, price_updated_at: now })
    .eq('id', b.id)
    .eq('status', 'pending')
    .eq('price_pending_by', 'sender')
    .select('id');
  if (!updated?.length) return fail('state_changed', 409);
  await syncRequestVisibility(b.id);

  try {
    const captured = await stripe.paymentIntents.capture(pi.id);
    const { error: capErr } = await admin
      .from('booking_intents')
      .update({ payment_status: 'captured', payment_amount: captured.amount })
      .eq('id', b.id);
    if (capErr) console.error('[negotiate] captured but DB sync failed:', capErr.message);
    return NextResponse.json({ ok: true, captured: true });
  } catch (e: any) {
    // Confirmed and still authorised — the same state the other accept path
    // leaves on a failed capture.
    console.error('[negotiate] capture failed for %s: %s', b.id, e?.message);
    return NextResponse.json({ ok: true, captured: false });
  }
}
