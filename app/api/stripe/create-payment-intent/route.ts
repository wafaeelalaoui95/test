import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';
import { ensureCustomer, forgetCustomer } from '@/lib/stripe/customer';
import { priceBreakdown } from '@/lib/utils';
import { canSenderCounter, checkSenderOffer, roundEuros } from '@/lib/negotiation';

/**
 * POST /api/stripe/create-payment-intent
 * Body: { tripId: string, description?: string }            — booking a traveller's trip
 *    or { bookingIntentId: string, description?: string }   — paying a traveller's proposal
 *
 * Creates a Stripe PaymentIntent in manual-capture mode. We *authorise* the
 * sender's card now (so they enter their details before knowing if the
 * traveler accepts), and capture later when the traveler accepts. If the
 * traveler declines, we cancel the authorisation and no money moves.
 *
 * THE AMOUNT IS DECIDED HERE, never by the browser. This route used to take
 * `amountCents` from the request body and charge exactly that, so anyone who
 * edited the request could book a 23,50 € trip for 1 €. The client now says
 * WHAT it is paying for, and the price is read from the database:
 *   - a trip: priceBreakdown(trip.compensation_min).total
 *   - a proposal: booking_intents.proposed_price (locked against client
 *     updates by the booking_intents_guard_price trigger)
 * What was priced is written into the PaymentIntent metadata, and
 * /api/stripe/capture and /api/booking/record-authorization check it before
 * any money is taken, so a PaymentIntent priced for one thing cannot be
 * attached to another.
 *
 * Returns the client_secret needed by Stripe Elements on the frontend.
 */
const schema = z.union([
  z.object({
    tripId: z.string().uuid(),
    // A lower price than the listing: the sender's offer, total incl. fee.
    offerTotal: z.number().positive().max(10_000).optional(),
    description: z.string().max(500).optional(),
  }),
  z.object({
    bookingIntentId: z.string().uuid(),
    // A counter to the traveller's price (see lib/negotiation.ts).
    offerTotal: z.number().positive().max(10_000).optional(),
    description: z.string().max(500).optional(),
  }),
]);

/** Euros (possibly fractional) → integer cents, without float dust. */
function toCents(euros: number): number {
  return Math.round(Number(euros) * 100);
}

export async function POST(req: NextRequest) {
  // Must be authenticated — anonymous users shouldn't be able to mint
  // PaymentIntents (would let scrapers spam Stripe).
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Identity, enforced HERE and not only in the UI. The gate on /envoyer,
  // /voyager and the traveler profile is a courtesy — it explains why the
  // button did nothing. This is the part that cannot be walked around by
  // calling the endpoint directly, and it is the right place for it: no
  // PaymentIntent means no booking, whatever the client does.
  //
  // A traveler putting a stranger's sealed parcel in their bag is trusting
  // that Jibly checked who the sender is. That promise has to hold on the
  // server.
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('identity_verified_at, full_name, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!senderProfile?.identity_verified_at) {
    return NextResponse.json({ error: 'identity_required' }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ===== Price, from the database =====
  let amountCents: number;
  const pricedFor: Record<string, string> = {};

  if ('tripId' in body) {
    const { data: trip } = await supabase
      .from('traveler_trips')
      .select('id, user_id, status, compensation_min')
      .eq('id', body.tripId)
      .maybeSingle();
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    // A trip can carry several parcels, so 'matched' still takes bookings;
    // only a finished or withdrawn trip cannot be paid for.
    if (trip.status === 'cancelled' || trip.status === 'completed') {
      return NextResponse.json({ error: 'trip_not_open' }, { status: 409 });
    }
    if (trip.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot book your own trip' }, { status: 400 });
    }
    const listed = priceBreakdown(Number(trip.compensation_min)).total;
    if (body.offerTotal != null) {
      // Bargaining: the sender authorises THEIR price. Bounds are checked here
      // and again when the booking is created (/api/booking/negotiate).
      const err = checkSenderOffer(body.offerTotal, listed);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      amountCents = toCents(roundEuros(body.offerTotal));
      pricedFor.offer = 'sender';
    } else {
      amountCents = toCents(listed);
    }
    pricedFor.tripId = trip.id;
  } else {
    const { data: booking } = await supabase
      .from('booking_intents')
      .select('id, sender_id, status, initiated_by, payment_status, proposed_price, original_price, price_pending_by, sender_countered, traveler_countered')
      .eq('id', body.bookingIntentId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    // Only the sender pays, and only for a proposal still waiting on them.
    if (booking.sender_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (booking.status !== 'pending' || (booking.payment_status && booking.payment_status !== 'unpaid')) {
      return NextResponse.json({ error: 'booking_not_payable' }, { status: 409 });
    }
    if (body.offerTotal != null) {
      // The sender counters the traveller's price instead of paying it.
      if (!canSenderCounter(booking)) {
        return NextResponse.json({ error: 'not_allowed' }, { status: 409 });
      }
      const err = checkSenderOffer(body.offerTotal, Number(booking.proposed_price));
      if (err) return NextResponse.json({ error: err }, { status: 400 });
      amountCents = toCents(roundEuros(body.offerTotal));
      pricedFor.offer = 'sender';
    } else {
      // Paying the price on the table. A price the SENDER proposed is not
      // theirs to pay again: it is waiting on the traveller.
      if (booking.price_pending_by === 'sender') {
        return NextResponse.json({ error: 'booking_not_payable' }, { status: 409 });
      }
      amountCents = toCents(Number(booking.proposed_price));
    }
    pricedFor.bookingIntentId = booking.id;
  }

  // Stripe's own floor is 0,50 €; anything at or below it means bad data,
  // not a real price. Refuse rather than authorise a meaningless amount.
  if (!Number.isFinite(amountCents) || amountCents <= 50 || amountCents > 1_000_000) {
    console.error('[create-payment-intent] refused amount %s for %o', amountCents, pricedFor);
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }

  const stripe = getStripe();

  // Who is paying, in Stripe's own terms. Best-effort: null just means the
  // payment is attached to a guest customer, exactly as before.
  let customerId = await ensureCustomer(
    user,
    senderProfile?.full_name,
    senderProfile?.stripe_customer_id
  );

  const create = (customer?: string) =>
    stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      capture_method: 'manual', // authorise now, capture later
      automatic_payment_methods: { enabled: true },
      description: body.description ?? `Jibly booking`,
      customer,
      // Keep the metadata even with a customer attached: it's what let us
      // trace the payments made before customers existed, and it survives a
      // customer being deleted. tripId / bookingIntentId record what this
      // amount was computed for — the capture routes refuse a mismatch.
      metadata: {
        userId: user.id,
        bookingIntentId: pricedFor.bookingIntentId ?? '',
        tripId: pricedFor.tripId ?? '',
        pricedBy: 'server',
        // 'sender' when this authorises a price the sender proposed (an
        // offer or counter). Only /api/booking/negotiate may attach such an
        // intent; record-authorization refuses it (its amount is below the
        // price on the table) and the capture check requires an exact match.
        offer: pricedFor.offer ?? '',
      },
    });

  try {
    let intent;
    try {
      intent = await create(customerId ?? undefined);
    } catch (e: any) {
      // The stored id points at a customer that Stripe no longer has —
      // deleted from the dashboard, or belonging to the other mode's keys.
      // Drop it, mint a new one, and let the payment through.
      if (e?.code === 'resource_missing' && customerId) {
        await forgetCustomer(user.id);
        customerId = await ensureCustomer(user, senderProfile?.full_name, null);
        intent = await create(customerId ?? undefined);
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amountCents,
    });
  } catch (e: any) {
    console.error('Stripe create intent error:', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Stripe error' },
      { status: 500 }
    );
  }
}
