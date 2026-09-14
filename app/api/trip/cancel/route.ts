import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient, getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { tripCancelledSenderEmail } from '@/lib/email/templates';
import {
  releaseBookingFunds,
  RELEASE_COLUMNS,
  type ReleasableBooking,
} from '@/lib/stripe/release';
import { getSiteUrl } from '@/lib/site-url';
import { formatName } from '@/lib/utils';

/**
 * POST /api/trip/cancel
 * Body: { tripId: uuid, reason: <code>, note?: string }
 *
 * A traveller stops flying. Everything that follows from that happens here.
 *
 * This replaces a client-side cancelTrip() that did three things and got two
 * of them wrong. It flipped the trip and its bookings to 'cancelled', then
 * made a best-effort fetch to release the payment — but ONLY for bookings
 * still in 'authorized'. Capture happens when the traveller ACCEPTS, so every
 * booking they had said yes to was already 'captured': the sender's card had
 * really been charged, the parcel was cancelled, and the money stayed in the
 * Jibly balance with nobody told. The confirmation dialog meanwhile promised
 * "any authorized payments will be released. No charge will be made."
 *
 * And nothing was sent to the sender at all. They found out by noticing their
 * parcel had moved into a bucket labelled "refusée" — the word used when a
 * traveller declines a request they never accepted.
 *
 * The order below is the order of what matters, and it is deliberate:
 *
 *   1. release the money        — attempted first, per booking
 *   2. cancel the booking       — ALWAYS, even if (1) failed
 *   3. tell the sender          — ALWAYS, with the truth about (1)
 *   4. cancel the trip          — last, once every parcel has been handled
 *
 * Step 2 does not depend on step 1 succeeding. A Stripe outage must never be
 * the reason a sender goes on believing their parcel is being carried; a
 * refund we failed to make is recoverable, a shipment someone is still
 * counting on is not. Unreturned money is left in a state the migration's
 * first check query finds — cancelled, captured, never refunded — rather than
 * in a log line nobody reads.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REASONS = [
  'flight_cancelled',
  'plans_changed',
  'no_space',
  'safety_concern',
  'other',
] as const;

const schema = z.object({
  tripId: z.string().uuid(),
  reason: z.enum(REASONS),
  // Not optional for 'other': a reason code of "other" with nothing after it
  // tells the sender less than no reason at all would.
  note: z.string().trim().max(500).optional(),
});

/**
 * The reason, as the sender reads it. Emails are English-only (see
 * lib/email/templates.ts) so there is one version of each.
 *
 * Written from the sender's point of view, not the traveller's: they are not
 * interested in a category, they want to know whether this was bad luck or
 * somebody changing their mind, because that is what decides how much they
 * trust the next traveller.
 */
const REASON_LINE: Record<(typeof REASONS)[number], string> = {
  flight_cancelled: 'Their flight was cancelled or moved by the airline.',
  plans_changed: 'They are no longer making the trip.',
  no_space: 'They are still travelling but can no longer carry anything.',
  safety_concern: 'They were not comfortable carrying it.',
  other: 'They did not travel in the end.',
};

/**
 * What actually happened to one sender's money.
 *
 * The two `_pending` states are failures, kept apart because they are opposite
 * news: `hold_pending` is "you were never charged and the hold will lapse",
 * `refund_pending` is "we have your money and are giving it back by hand".
 * Collapsing them into one "pending" was the first version of this, and it
 * would have told half these senders we had taken money we never took.
 */
type MoneyOutcome = 'released' | 'refunded' | 'hold_pending' | 'refund_pending' | 'none';

type BookingRow = ReleasableBooking & {
  sender_id: string;
  item_title: string | null;
  item_category: string;
  pickup_city: string;
  destination_city: string;
  status: string;
  received_confirmed_at: string | null;
};

// Matches the CATEGORY_LABEL in /api/cron/stale-requests, and for the same
// reason: ITEM_CATEGORIES holds translation KEYS, and a server route has no
// locale to resolve them with — 'cles' would reach an inbox as "cles".
const CATEGORY_LABEL: Record<string, string> = {
  documents: 'your documents',
  cles: 'your keys',
  vetements: 'your clothes',
  electronique: 'your electronics',
  petits_objets: 'your parcel',
  otc: 'your medicine',
};

/**
 * A date for an English email.
 *
 * Not formatShortDate: that one is fr-FR and drops the year, which is right on
 * a card next to today's trips and wrong here — these emails are English, and
 * an alternative trip can be months out, where "3 janv." says neither the
 * right language nor the right year.
 */
function emailDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

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
  const note = body.note?.trim() || null;
  if (body.reason === 'other' && !note) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: trip } = await admin
    .from('traveler_trips')
    .select(
      'id, user_id, departure_city, arrival_city, departure_country, arrival_country, departure_date, status'
    )
    .eq('id', body.tripId)
    .maybeSingle();

  if (!trip) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (trip.user_id !== user.id) {
    return NextResponse.json({ error: 'not_owner' }, { status: 403 });
  }
  if (trip.status === 'cancelled') {
    return NextResponse.json({ error: 'already_cancelled' }, { status: 409 });
  }

  const { data: rawBookings } = await admin
    .from('booking_intents')
    .select(
      `${RELEASE_COLUMNS}, sender_id, item_title, item_category, pickup_city, destination_city, status, received_confirmed_at`
    )
    .eq('traveler_trip_id', body.tripId)
    .neq('status', 'cancelled');

  const bookings = (rawBookings ?? []) as unknown as BookingRow[];

  // A parcel that has already arrived is not affected by the traveller not
  // flying next month — it flew. The old code cancelled these too, rewriting a
  // delivered booking's status and telling its sender their received parcel
  // had been cancelled. Left alone, they also keep their pending payout:
  // settle-payouts pays on received_confirmed_at, which is still set.
  const affected = bookings.filter((b) => !b.received_confirmed_at);
  const untouched = bookings.length - affected.length;

  // The traveller is the trip's owner, so this is the same name for every
  // booking on it — read once rather than per parcel.
  const { data: travelerProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const travelerFirstName = firstName(travelerProfile?.full_name);

  const cancelledAt = new Date().toISOString();
  const results: Array<{
    bookingId: string;
    money: MoneyOutcome;
    notified: boolean;
  }> = [];

  for (const booking of affected) {
    // ---- 1. the money -----------------------------------------------------
    const release = await releaseBookingFunds(booking, {
      reason: `trip_cancelled:${body.reason}`,
    });
    if (release.kind === 'failed') {
      console.error(
        '[trip/cancel] could not release booking %s (%s): %s',
        booking.id,
        release.code,
        release.message
      );
    }
    // A failure means different things either side of capture, and telling the
    // sender the wrong one is its own small betrayal: "we are refunding you"
    // to somebody who was never charged reads as an admission that we took
    // their money. Which state we failed in is decided by what the booking was
    // holding BEFORE the attempt, since a failed attempt leaves it unchanged.
    const money: MoneyOutcome =
      release.kind === 'authorization_released'
        ? 'released'
        : release.kind === 'refunded'
        ? 'refunded'
        : release.kind !== 'failed'
        ? 'none'
        : booking.payment_status === 'captured'
        ? 'refund_pending'
        : 'hold_pending';

    // ---- 2. the booking ---------------------------------------------------
    // Unconditional, and deliberately not inside the success branch above.
    const { error: cancelErr } = await admin
      .from('booking_intents')
      .update({
        status: 'cancelled',
        cancelled_at: cancelledAt,
        cancelled_by: user.id,
        cancellation_reason: body.reason,
        cancellation_note: note,
      })
      .eq('id', booking.id);
    if (cancelErr) {
      console.error('[trip/cancel] booking update failed:', booking.id, cancelErr.message);
    }

    // ---- 3. the sender ----------------------------------------------------
    const notified = await tellSender({
      booking,
      trip,
      travelerFirstName,
      reason: body.reason,
      note,
      money,
    });

    results.push({ bookingId: booking.id, money, notified });
  }

  // ---- 4. the trip --------------------------------------------------------
  const { error: tripErr } = await admin
    .from('traveler_trips')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt,
      cancellation_reason: body.reason,
      cancellation_note: note,
    })
    .eq('id', body.tripId);

  if (tripErr) {
    console.error('[trip/cancel] trip update failed:', tripErr.message);
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 });
  }

  const owed = results.filter((r) => r.money === 'refund_pending' || r.money === 'hold_pending');
  if (owed.length) {
    console.error(
      '[trip/cancel] %d booking(s) cancelled with money still held: %s',
      owed.length,
      owed.map((r) => r.bookingId).join(', ')
    );
  }

  return NextResponse.json({
    ok: true,
    cancelledBookings: results.length,
    deliveredUntouched: untouched,
    refunded: results.filter((r) => r.money === 'refunded').length,
    released: results.filter((r) => r.money === 'released').length,
    refundPending: owed.length,
    sendersNotified: results.filter((r) => r.notified).length,
  });
}

// =============================================================================
// Telling the sender
// =============================================================================
// Two channels, because they fail differently: the in-app notification is what
// they see next time they open Jibly, the email is what reaches them today
// while there is still time to find another traveller. Neither is allowed to
// throw — a cancellation that half-succeeded because Resend was down would
// leave the parcel in limbo, which is the state this whole route exists to
// abolish.
async function tellSender(params: {
  booking: BookingRow;
  trip: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
  };
  travelerFirstName: string | null;
  reason: (typeof REASONS)[number];
  note: string | null;
  money: MoneyOutcome;
}): Promise<boolean> {
  const { booking, trip, travelerFirstName, reason, note, money } = params;
  const admin = getAdminClient();

  const itemLabel =
    booking.item_title?.trim() || CATEGORY_LABEL[booking.item_category] || 'your parcel';
  const route = `${booking.pickup_city} → ${booking.destination_city}`;

  const alternatives = await findAlternativeTrips({
    pickupCity: booking.pickup_city,
    destinationCity: booking.destination_city,
    departureCountry: trip.departure_country,
    arrivalCountry: trip.arrival_country,
    excludeTripId: trip.id,
    excludeUserId: booking.sender_id,
  });

  const searchUrl =
    `${getSiteUrl()}/envoyer?from=${encodeURIComponent(booking.pickup_city)}` +
    `&to=${encodeURIComponent(booking.destination_city)}` +
    `&fromCountry=${encodeURIComponent(trip.departure_country)}` +
    `&toCountry=${encodeURIComponent(trip.arrival_country)}`;

  // ---- in-app -------------------------------------------------------------
  // Best-effort on purpose: the notifications table is managed outside this
  // repo's migrations, so a type it does not recognise must not be able to
  // take the email down with it.
  try {
    const { error } = await admin.from('notifications').insert({
      user_id: booking.sender_id,
      type: 'trip_cancelled',
      title: `${itemLabel} is not being carried`,
      body: alternatives.length
        ? `The trip ${route} was cancelled. ${alternatives.length} other traveller${
            alternatives.length > 1 ? 's are' : ' is'
          } going that way.`
        : `The trip ${route} was cancelled. Nobody else is listed on this route yet.`,
      link: `/me?booking=${booking.id}`,
      related_booking_id: booking.id,
      related_trip_id: trip.id,
    });
    if (error) console.error('[trip/cancel] notification insert:', error.message);
  } catch (e: any) {
    console.error('[trip/cancel] notification failed:', e?.message);
  }

  // ---- email --------------------------------------------------------------
  try {
    const { data: userData } = await admin.auth.admin.getUserById(booking.sender_id);
    const email = userData?.user?.email;
    if (!email) {
      console.warn('[trip/cancel] no email for sender', booking.sender_id);
      return false;
    }

    const { data: senderProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', booking.sender_id)
      .maybeSingle();

    const template = tripCancelledSenderEmail({
      senderFirstName: firstName(senderProfile?.full_name),
      travelerFirstName,
      itemLabel,
      pickupCity: booking.pickup_city,
      destinationCity: booking.destination_city,
      departureDate: emailDate(trip.departure_date),
      reasonLine: REASON_LINE[reason],
      note,
      // 'hold_pending' is told as 'released'. We failed to void the hold, but
      // an uncaptured authorisation expires on its own within about a week and
      // no charge is ever taken from it — so what the sender needs to know is
      // exactly what the successful case says. Making them worry about a
      // lapsing hold would be accurate and useless.
      refund:
        money === 'none'
          ? null
          : {
              kind:
                money === 'refund_pending'
                  ? 'pending'
                  : money === 'hold_pending'
                  ? 'released'
                  : money,
              amountCents: booking.payment_amount ?? 0,
            },
      alternatives,
      searchUrl,
    });

    const { error: sendErr } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    if (sendErr) {
      console.error('[trip/cancel] resend error:', sendErr);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error('[trip/cancel] email failed for', booking.id, e?.message);
    return false;
  }
}

function firstName(full: string | null | undefined): string | null {
  return full ? formatName(full).split(' ')[0] : null;
}

/**
 * Who else is going that way.
 *
 * Two rules make this different from the matching used on /envoyer:
 *
 *   - NO upper date bound. The other matchers cap at the sender's desired
 *     delivery date, which is the right rule when they are choosing; it is the
 *     wrong rule here, where the date they picked has just been taken away
 *     from them. Someone flying two weeks later is a real answer, and showing
 *     nothing because nobody matches a now-meaningless date is how this email
 *     ends up reading as a shrug.
 *   - The country-level fallback runs whenever the exact route is empty, so a
 *     sender on a thin corridor still sees something.
 */
async function findAlternativeTrips(params: {
  pickupCity: string;
  destinationCity: string;
  departureCountry: string;
  arrivalCountry: string;
  excludeTripId: string;
  excludeUserId: string;
}) {
  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const columns =
    'id, user_id, departure_city, arrival_city, departure_date, compensation_min';

  async function search(scope: 'city' | 'country') {
    let q = admin
      .from('traveler_trips')
      .select(columns)
      .eq('status', 'open')
      .gte('departure_date', today)
      .neq('id', params.excludeTripId)
      // A sender is sometimes also a traveller; their own trip is not an
      // alternative to their own parcel.
      .neq('user_id', params.excludeUserId)
      .order('departure_date', { ascending: true })
      .limit(3);

    q =
      scope === 'city'
        ? q.eq('departure_city', params.pickupCity).eq('arrival_city', params.destinationCity)
        : q
            .eq('departure_country', params.departureCountry)
            .eq('arrival_country', params.arrivalCountry);

    const { data } = await q;
    return data ?? [];
  }

  let trips = await search('city');
  if (!trips.length) trips = await search('country');
  if (!trips.length) return [];

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(new Set(trips.map((t: any) => t.user_id))));
  const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  return trips.map((t: any) => ({
    travelerFirstName: firstName(nameById.get(t.user_id)),
    departureCity: t.departure_city,
    arrivalCity: t.arrival_city,
    departureDate: emailDate(t.departure_date),
    compensationMin: t.compensation_min,
  }));
}
