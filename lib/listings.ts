import { getAdminClient } from '@/lib/supabase/server';

// =============================================================================
// Editing and withdrawing a listing
// =============================================================================
// Shared by /api/listing/update and /api/listing/withdraw. Both need the same
// three answers — is this yours, does anyone depend on it, and what did it say
// before — so they are decided here once rather than twice.

export type ListingType = 'traveler_trip' | 'shipping_request';

export const LISTING_TABLE: Record<ListingType, string> = {
  traveler_trip: 'traveler_trips',
  shipping_request: 'shipping_requests',
};

// The column on booking_intents that points back at each listing type.
const BOOKING_FK: Record<ListingType, string> = {
  traveler_trip: 'traveler_trip_id',
  shipping_request: 'shipping_request_id',
};

// What a person may change after posting.
//
// Deliberately not "everything": id, user_id, created_at and status are the
// row's identity and lifecycle, and letting a client set status would turn an
// edit endpoint into a way to mark your own parcel delivered.
export const EDITABLE_FIELDS: Record<ListingType, string[]> = {
  traveler_trip: [
    'departure_country', 'departure_city', 'arrival_country', 'arrival_city',
    'departure_date', 'arrival_date', 'compensation_min', 'compensation_max',
    'available_weight_kg', 'available_space', 'flight_time', 'flight_number',
    'departure_airport', 'arrival_airport', 'notes', 'accepted_categories',
  ],
  shipping_request: [
    'item_title', 'item_category', 'item_description',
    'pickup_country', 'pickup_city', 'destination_country', 'destination_city',
    'recipient_name', 'desired_delivery_date', 'budget', 'weight_kg',
    'urgency_level',
    // Adding or replacing the parcel photo. Only meaningful for a request: a
    // trip is not a thing you can photograph.
    'photo_url',
  ],
};

// Where /api/parcel/photo puts its uploads. The database enforces this too —
// see the check constraint in 2026-09-05-parcel-photo.sql — but catching it
// here turns a constraint violation into a clear refusal rather than a 500.
const PHOTO_PREFIX = '/storage/v1/object/public/parcel-photos/';

/** Is this a URL our own upload route produced? */
export function isOwnParcelPhoto(value: unknown): boolean {
  return typeof value === 'string' && value.includes(PHOTO_PREFIX);
}

/**
 * Payment states that mean somebody has actually committed to this parcel.
 *
 * 'captured' covers a partial refund too, which is right: a parcel that was
 * partly refunded is still being carried. 'canceled' and 'refunded' are the
 * states a booking lands in when it comes apart, and a booking with no payment
 * at all was never a commitment.
 */
const LIVE_PAYMENT_STATUSES = ['authorized', 'captured'];

/**
 * Take a parcel off the market once somebody is carrying it — and put it back
 * if they stop.
 *
 * `listOpenRequests` shows every request whose status is 'pending', and nothing
 * ever moved a request off 'pending': the only writes to that column were
 * account deletion and the stale-date reminder. So a parcel that had been
 * booked and paid for went on being offered to other travellers, who could
 * propose on it, and the sender could accept and pay for the same parcel
 * twice. `RequestStatus` has had a 'matched' value the whole time; nothing set
 * it.
 *
 * RECOMPUTED from the bookings rather than toggled, because the way back
 * matters as much as the way out: a decline, a cancelled trip or a refused
 * payment has to put the parcel back on the market, and a pair of toggles in
 * four different routes is how one of those gets forgotten and a sender's
 * parcel disappears for good.
 *
 * Deliberately keyed on payment state, not on booking_intents.status. The
 * status is written by the browser and the money columns by the server, so in
 * the accept path this function can run before the client's write lands —
 * reading the column the server itself has just set is the only version that
 * does not depend on who won that race.
 *
 * Never throws and never blocks its caller: every call site has just moved
 * money, and a parcel left visible one minute longer is not worth failing a
 * capture over. Safe to call with any booking — one made against a trip has no
 * request behind it and returns immediately.
 */
export async function syncRequestVisibility(bookingIntentId: string): Promise<void> {
  try {
    const admin = getAdminClient();

    const { data: booking } = await admin
      .from('booking_intents')
      .select('shipping_request_id')
      .eq('id', bookingIntentId)
      .maybeSingle();

    const requestId = booking?.shipping_request_id;
    if (!requestId) return;

    const { data: request } = await admin
      .from('shipping_requests')
      .select('status')
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return;

    // Only ever moves between these two. A request that was withdrawn,
    // delivered or flagged has been decided by somebody, and a visibility
    // recompute is not entitled to overrule them.
    if (request.status !== 'pending' && request.status !== 'matched') return;

    const { data: live, error } = await admin
      .from('booking_intents')
      .select('id')
      .eq('shipping_request_id', requestId)
      .neq('status', 'cancelled')
      .in('payment_status', LIVE_PAYMENT_STATUSES)
      .limit(1);

    if (error) {
      console.error('[listings] visibility check failed for', requestId, error.message);
      return;
    }

    const next = live?.length ? 'matched' : 'pending';
    if (next === request.status) return;

    const { error: updErr } = await admin
      .from('shipping_requests')
      .update({ status: next })
      .eq('id', requestId);
    if (updErr) {
      console.error('[listings] could not set', requestId, 'to', next, updErr.message);
    }
  } catch (e: any) {
    console.error('[listings] visibility sync threw for booking', bookingIntentId, e?.message);
  }
}

export type ListingGuard =
  | { ok: true; row: Record<string, any> }
  | { ok: false; code: 'not_found' | 'not_owner' | 'has_bookings' | 'already_cancelled'; status: number };

/**
 * May this user still change this listing?
 *
 * "No correspondent yet" is the rule, and it is stricter than the cancel button
 * that already exists on a trip card, which only blocks on a *confirmed*
 * booking. A pending request is a correspondent too: someone has read the
 * listing and acted on it, and moving the price under them is exactly what
 * this must not allow. Editing once a booking exists is a separate problem —
 * it needs the other party told, and possibly agreeing.
 */
export async function guardListing(
  type: ListingType,
  listingId: string,
  userId: string
): Promise<ListingGuard> {
  const admin = getAdminClient();

  const { data: row } = await admin
    .from(LISTING_TABLE[type])
    .select('*')
    .eq('id', listingId)
    .maybeSingle();

  if (!row) return { ok: false, code: 'not_found', status: 404 };
  if (row.user_id !== userId) return { ok: false, code: 'not_owner', status: 403 };
  if (row.status === 'cancelled') {
    return { ok: false, code: 'already_cancelled', status: 409 };
  }

  const { data: bookings } = await admin
    .from('booking_intents')
    .select('id')
    .eq(BOOKING_FK[type], listingId)
    .neq('status', 'cancelled')
    .limit(1);

  if (bookings?.length) return { ok: false, code: 'has_bookings', status: 409 };

  return { ok: true, row };
}

/**
 * Record what the listing said before, then apply the change.
 *
 * The revision is written FIRST. If the update then fails we are left with a
 * history entry for an edit that did not happen, which is confusing; if the
 * order were reversed and the revision failed, we would have silently lost the
 * previous version, which is worse. Confusing beats lost.
 */
export async function applyListingEdit(params: {
  type: ListingType;
  listingId: string;
  userId: string;
  before: Record<string, any>;
  patch: Record<string, any>;
}): Promise<{ changed: string[] } | { error: string }> {
  const { type, listingId, userId, before, patch } = params;
  const admin = getAdminClient();

  // Only fields that actually differ. Re-saving a form without touching
  // anything should not manufacture a revision.
  const changed = Object.keys(patch).filter(
    (k) => JSON.stringify(before[k] ?? null) !== JSON.stringify(patch[k] ?? null)
  );
  if (!changed.length) return { changed: [] };

  const { error: revErr } = await admin.from('listing_revisions').insert({
    listing_type: type,
    listing_id: listingId,
    edited_by: userId,
    previous: before,
    changed,
  });
  if (revErr) {
    // Refuse the edit rather than lose the previous version. The whole promise
    // of this feature is that nothing is thrown away.
    console.error('[listings] could not record revision:', revErr.message);
    return { error: 'history_failed' };
  }

  const { error: updErr } = await admin
    .from(LISTING_TABLE[type])
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', listingId);

  if (updErr) {
    console.error('[listings] update failed:', updErr.message);
    return { error: 'update_failed' };
  }

  return { changed };
}
