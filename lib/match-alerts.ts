import type { SupabaseClient } from '@supabase/supabase-js';
import { findCountryByName } from '@/lib/countries';
import { formatName } from '@/lib/utils';
import { tripMatchSenderEmail } from '@/lib/email/templates';

// =============================================================================
// Trip match alerts — "someone is travelling on (or near) your route"
// =============================================================================
// A sender posts Fès → Paris and waits. Days later a traveller posts a trip.
// Until now nothing connected the two: the sender only found out if they came
// back and looked.
//
// queueMatchAlertsForTrip() runs when a trip is published and writes one row
// per open request it could serve. It never emails. The operator reviews each
// row on /admin and sends or dismisses it (app/api/admin/match-alerts).
//
// "Nearby" = same departure country, same arrival city. Only for countries
// listed below, where a sender can realistically get a document to another
// city of departure (Fès → Agadir by CTM or a friend). Across France, Lille to
// Marseille is not "nearby" in the same sense.
//
// "Late" = exact route, but the trip leaves up to LATE_WINDOW_DAYS after the
// sender's date. The email says so and lets them decide whether it can wait.

const NEARBY_COUNTRY_CODES = new Set(['MA']);

/** How many days after the sender's date a trip on their exact route still counts. */
export const LATE_WINDOW_DAYS = 15;

/** YYYY-MM-DD plus `days` (negative to go back). */
function shiftDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000
  );
}

function sameText(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

export async function queueMatchAlertsForTrip(
  admin: SupabaseClient,
  tripId: string
): Promise<{ queued: number }> {
  const { data: trip } = await admin
    .from('traveler_trips')
    .select('id, user_id, departure_country, departure_city, arrival_city, departure_date, accepted_categories, status')
    .eq('id', tripId)
    .maybeSingle();
  if (!trip || trip.status !== 'open') return { queued: 0 };

  const nearbyAllowed = NEARBY_COUNTRY_CODES.has(
    findCountryByName(trip.departure_country)?.code ?? ''
  );

  // Same arrival city, still open, and the trip lands before the sender's
  // deadline. The departure side is filtered below so exact and nearby come
  // out of one query.
  let query = admin
    .from('shipping_requests')
    .select('id, user_id, pickup_country, pickup_city, item_category')
    .eq('destination_city', trip.arrival_city)
    .eq('status', 'pending')
    .gte('desired_delivery_date', trip.departure_date)
    .neq('user_id', trip.user_id)
    .limit(100);
  query = nearbyAllowed
    ? query.eq('pickup_country', trip.departure_country)
    : query.eq('pickup_city', trip.departure_city);
  const { data: onTime } = await query;

  // "Better late than never": same exact route, but the trip leaves after the
  // sender's date — by at most LATE_WINDOW_DAYS. Exact cities only: asking
  // someone to wait AND to get their parcel to another city is too much.
  // Queued as tier 'exact'; how late it is is worked out again from the dates
  // when the email is built, so nothing extra needs storing.
  const { data: late } = await admin
    .from('shipping_requests')
    .select('id, user_id, pickup_country, pickup_city, item_category')
    .eq('destination_city', trip.arrival_city)
    .eq('pickup_city', trip.departure_city)
    .eq('status', 'pending')
    .lt('desired_delivery_date', trip.departure_date)
    .gte('desired_delivery_date', shiftDate(trip.departure_date, -LATE_WINDOW_DAYS))
    .neq('user_id', trip.user_id)
    .limit(100);
  const requests = [...(onTime ?? []), ...(late ?? [])];

  const accepted: string[] | null = Array.isArray(trip.accepted_categories) && trip.accepted_categories.length
    ? trip.accepted_categories
    : null;

  const rows = requests
    // A traveller who said "documents only" should not be pitched for keys.
    .filter((r: any) => !accepted || accepted.includes(r.item_category))
    .map((r: any) => ({
      trip_id: trip.id,
      request_id: r.id,
      sender_id: r.user_id,
      tier: sameText(r.pickup_city, trip.departure_city) ? 'exact' : 'nearby',
    }));
  if (!rows.length) return { queued: 0 };

  const { error } = await admin
    .from('trip_match_alerts')
    .upsert(rows, { onConflict: 'trip_id,request_id', ignoreDuplicates: true });
  if (error) {
    console.error('[match-alerts] queue failed:', error.message);
    return { queued: 0 };
  }
  return { queued: rows.length };
}

/**
 * Re-run the pairing for every trip still on the market.
 *
 * Publishing a trip is the only other moment alerts are queued, and that misses
 * two cases: a parcel posted AFTER the trip it could ride on (nothing fires —
 * the trip is already published), and a queue call that failed or never ran.
 * Both leave a sender waiting on a route someone is already flying. Run from
 * the admin list, so whatever the operator sees is current.
 *
 * Idempotent: the upsert ignores pairs already queued, so a dismissed alert
 * stays dismissed and a sent one is never queued twice.
 */
export async function requeueOpenTrips(admin: SupabaseClient): Promise<{ queued: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: trips } = await admin
    .from('traveler_trips')
    .select('id')
    .eq('status', 'open')
    .gte('departure_date', today)
    .limit(200);
  let queued = 0;
  for (const t of trips ?? []) {
    queued += (await queueMatchAlertsForTrip(admin, t.id)).queued;
  }
  return { queued };
}

/**
 * Everything the operator needs to judge one alert, and the exact email that
 * would go out. Used for the preview and for the send, so what is approved is
 * what is sent. `stale` is set when the pairing no longer makes sense (trip
 * cancelled, parcel booked) — those can only be dismissed.
 */
export async function buildMatchAlert(admin: SupabaseClient, alert: any) {
  const [{ data: trip }, { data: request }] = await Promise.all([
    admin
      .from('traveler_trips')
      .select('id, user_id, departure_city, arrival_city, departure_date, status')
      .eq('id', alert.trip_id)
      .maybeSingle(),
    admin
      .from('shipping_requests')
      .select('id, user_id, item_title, item_description, pickup_city, destination_city, desired_delivery_date, status')
      .eq('id', alert.request_id)
      .maybeSingle(),
  ]);
  if (!trip || !request) return null;

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', [trip.user_id, request.user_id]);
  const firstName = (id: string) => {
    const full = (profiles ?? []).find((p: any) => p.id === id)?.full_name;
    return full ? formatName(full).split(' ')[0] : null;
  };

  const { data: userRes } = await admin.auth.admin.getUserById(request.user_id);
  const toEmail = userRes?.user?.email ?? null;

  // > 0 when the trip leaves after the sender's date (see LATE_WINDOW_DAYS).
  const daysLate = Math.max(0, daysBetween(request.desired_delivery_date, trip.departure_date));

  const template = tripMatchSenderEmail({
    senderFirstName: firstName(request.user_id),
    travelerFirstName: firstName(trip.user_id),
    tier: alert.tier,
    daysLate,
    requestDate: request.desired_delivery_date,
    tripDepartureCity: trip.departure_city,
    tripArrivalCity: trip.arrival_city,
    tripDate: trip.departure_date,
    requestPickupCity: request.pickup_city,
    itemLabel: request.item_title?.trim() || request.item_description?.trim() || null,
    bookUrlPath: `/u/${trip.user_id}?book=${trip.id}`,
  });

  const stale =
    trip.status !== 'open' ||
    request.status !== 'pending' ||
    trip.departure_date < new Date().toISOString().slice(0, 10);

  return {
    id: alert.id as string,
    tier: alert.tier as 'exact' | 'nearby',
    daysLate,
    createdAt: alert.created_at as string,
    toEmail,
    stale,
    trip: `${trip.departure_city} → ${trip.arrival_city} · ${trip.departure_date}`,
    request: `${request.pickup_city} → ${request.destination_city} · avant le ${request.desired_delivery_date}`,
    template,
  };
}
