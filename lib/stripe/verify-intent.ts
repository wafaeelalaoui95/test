import type Stripe from 'stripe';
import { priceBreakdown } from '@/lib/utils';

/**
 * Does this PaymentIntent belong to this booking, at the right price?
 * Returns null when it does, or a short reason when it does not.
 *
 * /api/stripe/create-payment-intent prices every intent on the server and
 * records what it priced in the metadata (`pricedBy: 'server'` plus `tripId`
 * or `bookingIntentId`). The booking row itself — including the
 * payment_intent_id it points at — is inserted by the browser, so before
 * capturing we check that the two agree: same payer, same trip or booking.
 *
 * Intents created before that change carry no `pricedBy`. They are only
 * accepted if Stripe's amount covers the trip's current price, so an old-style
 * underpriced intent cannot be captured either.
 */
export async function paymentIntentMismatch(
  pi: Stripe.PaymentIntent,
  booking: { id: string; sender_id: string; traveler_trip_id: string | null },
  // Any Supabase client that can read the trip (the caller's own is enough:
  // trips are readable by the parties).
  supabase: { from: (t: string) => any }
): Promise<string | null> {
  const md = pi.metadata ?? {};

  if (md.userId && md.userId !== booking.sender_id) {
    return 'paid by someone other than the sender';
  }

  if (md.pricedBy === 'server') {
    // A price the SENDER proposed (bargaining) is below the listing, so it is
    // only good for a booking that records exactly that price. Otherwise an
    // offer authorised at 17,75 € could be attached to a booking showing the
    // traveller the full listed price.
    if (md.offer === 'sender') {
      const { data: row } = await supabase
        .from('booking_intents')
        .select('proposed_price')
        .eq('id', booking.id)
        .maybeSingle();
      if (!row || Math.round(Number(row.proposed_price) * 100) !== pi.amount) {
        return 'offer amount does not match the booking price';
      }
    }
    if (md.bookingIntentId) {
      return md.bookingIntentId === booking.id ? null : 'priced for another booking';
    }
    if (md.tripId) {
      return md.tripId === booking.traveler_trip_id ? null : 'priced for another trip';
    }
    return 'server-priced intent without a target';
  }

  // Legacy intent (created by the old client-priced route).
  if (!booking.traveler_trip_id) return null;
  const { data: trip } = await supabase
    .from('traveler_trips')
    .select('compensation_min')
    .eq('id', booking.traveler_trip_id)
    .maybeSingle();
  if (!trip) return 'trip not found';
  const expected = Math.round(priceBreakdown(Number(trip.compensation_min)).total * 100);
  return pi.amount >= expected ? null : `legacy amount ${pi.amount} below price ${expected}`;
}
