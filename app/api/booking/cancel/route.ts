import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import {
  releaseBookingFunds,
  RELEASE_COLUMNS,
  type ReleasableBooking,
} from '@/lib/stripe/release';
import { syncRequestVisibility } from '@/lib/listings';

/**
 * POST /api/booking/cancel
 * Body: { bookingIntentId: uuid, reason: <code>, note?: string }
 *
 * A sender pulls out of a booking the traveller has already accepted.
 *
 * There was no way to do this. /api/stripe/cancel only voids an authorisation,
 * and capture happens the moment the traveller accepts — so from acceptance
 * onwards a sender who could not go through with it had one option, which was
 * to email support and hope. The Cancellation & Refund Policy gives the case a
 * section of its own.
 *
 * WHAT THIS DOES NOT DO IS REFUND.
 *
 * That is the whole design, and it is taken from the policy rather than from
 * convenience: a sender cancelling after confirmation is not automatically
 * entitled to their money back, because by then a traveller may have turned
 * down other parcels, planned their luggage around this one, or travelled to a
 * handover. Whether anything is returned, and how much, depends on who
 * cancelled, when, and what the other party had already done — which is a
 * judgement, not a branch. A self-service refund button would also hand the
 * paying side a way to undo a service the other side has already performed.
 *
 * So the booking is cancelled, the money stays put, and the row surfaces in the
 * operator's "to refund" list — cancelled, captured, never refunded — which
 * already exists and is already watched. /api/stripe/refund does the rest, with
 * its own reversal logic.
 *
 * The one case that IS automatic: a booking still sitting on an authorisation
 * (capture failed, or has not run). Nothing has been taken, so the hold is
 * released and there is nothing for anyone to decide.
 *
 * Refused once the parcel has physically changed hands. After that the policy
 * stops treating it as a cancellation at all — it is a delivery, return or loss
 * question — and a sender must report a problem instead.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Why a sender stopped.
 *
 * Not shared with the traveller's list in /api/trip/cancel: "my flight was
 * cancelled" is meaningless here, and a list that mostly does not apply is a
 * list where everyone picks the first item. These must stay in step with the
 * check constraint in 2026-10-01-cancellation-and-report-reasons.sql.
 */
const REASONS = [
  'no_longer_needed',
  'sent_another_way',
  'cannot_make_handover',
  'traveller_unresponsive',
  'handover_not_agreed',
  'other',
] as const;

/**
 * Reasons that mean the parcel itself is finished, not just this pairing.
 *
 * Cancelling a booking and withdrawing a listing are different acts, so by
 * default the parcel goes back on the market the way it does when a traveller
 * declines. For these two that would be absurd — a sender who has already
 * posted it another way does not want fresh offers — so the listing comes down
 * with the booking.
 */
const ENDS_THE_LISTING: string[] = ['no_longer_needed', 'sent_another_way'];

const schema = z.object({
  bookingIntentId: z.string().uuid(),
  reason: z.enum(REASONS),
  // Required for 'other', like every other reason field in this codebase: a
  // code of "other" with nothing after it tells the traveller less than no
  // reason would.
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (body.reason === 'other' && !body.note) {
    return NextResponse.json({ error: 'note_required' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: booking } = await admin
    .from('booking_intents')
    .select(
      `${RELEASE_COLUMNS}, sender_id, traveler_user_id, traveler_trip_id, shipping_request_id, status, pickup_confirmed_at, received_confirmed_at, item_title`
    )
    .eq('id', body.bookingIntentId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (booking.sender_id !== user.id) {
    // Only the person whose money it is. A traveller ending a booking already
    // has its own route, with its own reasons and its own refund behaviour.
    return NextResponse.json({ error: 'not_your_booking' }, { status: 403 });
  }
  if (booking.status === 'cancelled') {
    return NextResponse.json({ ok: true, already: true });
  }
  if (booking.pickup_confirmed_at || booking.received_confirmed_at) {
    // The traveller is carrying it, or has delivered it. Cancelling is no
    // longer the right word for what the sender wants, and pretending
    // otherwise would leave a parcel in somebody's bag with no booking
    // attached to it.
    return NextResponse.json({ error: 'already_handed_over' }, { status: 409 });
  }

  // Money first, and only the automatic case. releaseBookingFunds decides what
  // applies from payment_status, so an authorisation is voided and a captured
  // payment is deliberately left alone for a human.
  let released = false;
  if (booking.payment_status === 'authorized') {
    const release = await releaseBookingFunds(booking as ReleasableBooking, {
      reason: `sender_cancelled:${body.reason}`,
    });
    released = release.kind === 'authorization_released';
    if (release.kind === 'failed') {
      console.error(
        '[booking/cancel] could not release hold on %s (%s): %s',
        booking.id,
        release.code,
        release.message
      );
    }
  }

  // Unconditional, like /api/trip/cancel: a Stripe failure must never be the
  // reason a traveller goes on believing they are carrying something.
  const { error: cancelErr } = await admin
    .from('booking_intents')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: body.reason,
      cancellation_note: body.note ?? null,
    })
    .eq('id', body.bookingIntentId);

  if (cancelErr) {
    console.error('[booking/cancel] update failed:', booking.id, cancelErr.message);
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 });
  }

  // Put the parcel back on the market, or take it down with the booking.
  if (booking.shipping_request_id && ENDS_THE_LISTING.includes(body.reason)) {
    const { error: listingErr } = await admin
      .from('shipping_requests')
      .update({ status: 'cancelled' })
      .eq('id', booking.shipping_request_id)
      .eq('user_id', user.id);
    if (listingErr) {
      console.error('[booking/cancel] could not withdraw listing:', listingErr.message);
    }
  } else {
    await syncRequestVisibility(body.bookingIntentId);
  }

  // Tell the traveller. Best-effort and in-app only for now: the email
  // templates are English-only, and this is the kind of message that reads
  // badly in a language the reader did not choose.
  if (booking.traveler_user_id) {
    try {
      await admin.from('notifications').insert({
        user_id: booking.traveler_user_id,
        type: 'booking_cancelled_by_sender',
        title: `${booking.item_title?.trim() || 'A parcel'} is no longer being sent`,
        body: body.note
          ? `The sender cancelled: ${body.note}`
          : 'The sender cancelled this booking.',
        link: `/me?booking=${booking.id}`,
        related_booking_id: booking.id,
      });
    } catch (e: any) {
      console.error('[booking/cancel] notification failed:', e?.message);
    }
  }

  return NextResponse.json({
    ok: true,
    // What the sender is owed, and by whom, in the only two shapes there are.
    money: released
      ? 'hold_released'
      : booking.payment_status === 'captured'
      ? 'under_review'
      : 'none',
  });
}
