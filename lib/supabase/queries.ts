/**
 * Query helpers for the Jibly app.
 *
 * Two flavors are exported for each query:
 *   - <name>(supabase, ...args)       — accepts a pre-built client, works on both server & browser
 *   - <name>Browser(...args)          — convenience wrapper that uses the browser client
 *
 * In Server Components / Server Actions, import getServerClient() yourself and pass it in.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getBrowserClient } from './client';
import { withTimeout } from './timeout';
import type {
  Database,
  Profile,
  TravelerTripRow,
  ShippingRequestRow,
  MatchRow,
  ReviewRow,
  AvailableSpace,
  VerificationLevel,
} from './types';


type SB = SupabaseClient<Database>;

// ============================================================================
// PROFILES
// ============================================================================

export async function getProfile(supabase: SB, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no row
    throw error;
  }
  return data;
}

export async function updateProfile(
  supabase: SB,
  userId: string,
  patch: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// TRAVELER TRIPS
// ============================================================================

export async function listOpenTrips(
  supabase: SB,
  filters?: {
    departureCity?: string;
    arrivalCity?: string;
    /** ISO date string — only trips on or before this date */
    maxDate?: string;
    /** Only trips with compensation_min <= this budget */
    maxBudget?: number;
    limit?: number;
  }
): Promise<(TravelerTripRow & { profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null })[]> {
  // Step 1: load trips (no join — joins trigger nested RLS evaluation that
  // can stall the request indefinitely on Supabase free tier).
  // Hide trips whose departure date has already passed (server-side).
  // We compute "today" as an ISO date in UTC; small mismatch with local
  // timezones is acceptable — at worst a same-day trip stays visible a
  // few extra hours after departure, which is fine for a discovery feed.
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from('traveler_trips')
    .select('*')
    .eq('status', 'open')
    .gte('departure_date', today)
    .order('departure_date', { ascending: true })
    .limit(filters?.limit ?? 30);

  if (filters?.departureCity) q = q.ilike('departure_city', `%${filters.departureCity}%`);
  if (filters?.arrivalCity) q = q.ilike('arrival_city', `%${filters.arrivalCity}%`);
  if (filters?.maxDate) q = q.lte('departure_date', filters.maxDate);
  if (filters?.maxBudget != null) q = q.lte('compensation_min', filters.maxBudget);

  const { data: trips, error: tripsError } = await withTimeout(Promise.resolve(q), 8000, 'List trips');
  if (tripsError) throw tripsError;
  if (!trips || trips.length === 0) return [];

  // Step 2: load the profiles for these trips in one batch query.
  const userIds = Array.from(new Set(trips.map((t) => t.user_id)));
  const { data: profiles, error: profilesError } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, verification_level, rating, trips_completed')
        .in('id', userIds)
    ),
    8000,
    'List trip profiles'
  );
  if (profilesError) throw profilesError;

  // Step 3: stitch together. Trips without a matching profile just get null.
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return trips.map((t) => ({
    ...t,
    profile: (profileById.get(t.user_id) as any) ?? null,
  }));
}

export async function listMyTrips(supabase: SB, userId: string): Promise<TravelerTripRow[]> {
  const { data, error } = await supabase
    .from('traveler_trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTrip(
  supabase: SB,
  input: Omit<TravelerTripRow, 'id' | 'created_at'>
): Promise<TravelerTripRow> {
  const query = supabase
    .from('traveler_trips')
    .insert(input)
    .select('*')
    .maybeSingle();
  const { data, error } = await withTimeout(Promise.resolve(query), 10000, 'Create trip');
  if (error) throw error;
  return (data ?? { ...input, id: '', created_at: new Date().toISOString() }) as TravelerTripRow;
}

// ============================================================================
// SHIPPING REQUESTS
// ============================================================================

export async function listOpenRequests(supabase: SB): Promise<ShippingRequestRow[]> {
  const { data, error } = await supabase
    .from('shipping_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

/**
 * Same as listOpenRequests but each row is enriched with its sender profile,
 * so the home page can render the sender's name, avatar, and verification.
 * Two-query approach (instead of join) to dodge nested RLS stalls.
 */
export type ShippingRequestWithProfile = ShippingRequestRow & {
  profile: Pick<
    Profile,
    'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'
  > | null;
};

export async function listOpenRequestsWithProfile(
  supabase: SB
): Promise<ShippingRequestWithProfile[]> {
  // 1. Get the requests
  const { data: requests, error: reqErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('shipping_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    8000,
    'List open requests'
  );
  if (reqErr) throw reqErr;
  if (!requests || requests.length === 0) return [];

  // 2. Batch-load all the unique senders' profiles
  const senderIds = Array.from(new Set(requests.map((r: ShippingRequestRow) => r.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, verification_level, rating, trips_completed')
        .in('id', senderIds)
    ),
    8000,
    'List sender profiles'
  );

  const profileMap = new Map<string, Profile>();
  (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));

  return requests.map((r: ShippingRequestRow) => ({
    ...r,
    profile: (profileMap.get(r.user_id) as any) ?? null,
  }));
}

export async function listMyRequests(supabase: SB, userId: string): Promise<ShippingRequestRow[]> {
  const { data, error } = await supabase
    .from('shipping_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createShippingRequest(
  supabase: SB,
  input: Omit<ShippingRequestRow, 'id' | 'created_at'>
): Promise<ShippingRequestRow> {
  const query = supabase
    .from('shipping_requests')
    .insert(input)
    .select('*')
    .maybeSingle();
  const { data, error } = await withTimeout(Promise.resolve(query), 10000, 'Create request');
  if (error) throw error;
  // RLS may sometimes hide the just-inserted row from the select. If so,
  // we still succeeded — return a synthetic row using the input.
  return (data ?? { ...input, id: '', created_at: new Date().toISOString() }) as ShippingRequestRow;
}

// ============================================================================
// MATCHES
// ============================================================================

export async function listMyMatches(
  supabase: SB,
  userId: string
): Promise<MatchRow[]> {
  // Note: with the simplified RLS policy (any authenticated user can read
  // matches), this returns ALL matches. The /me page filters client-side
  // by checking if the related trip or request belongs to the user.
  // We deliberately avoid joins here because they can trigger nested RLS
  // policy evaluation and stall the request.
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function createMatch(
  supabase: SB,
  travelerTripId: string,
  shippingRequestId: string,
  agreedCompensation?: number
): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      traveler_trip_id: travelerTripId,
      shipping_request_id: shippingRequestId,
      status: 'proposed',
      agreed_compensation: agreedCompensation ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
// =============================================================================
// MATCHING — list trips that fit a freshly-published shipping request
// =============================================================================
// Called right after createShippingRequest so we can surface "✨ 3 voyageurs
// sur votre route" instead of just a thank-you screen. The criteria are
// intentionally generous (any trip departing on/before the desired delivery
// date) — we'd rather surface a few near-fits than show zero matches when
// a perfectly viable traveler is leaving a day early.

export type MatchingTrip = {
  id: string;
  user_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  compensation_min: number;
  flight_number: string | null;
  available_space: AvailableSpace;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating: number;
    trips_completed: number;
    verification_level: VerificationLevel;
  } | null;
};

export async function listMatchingTripsForRequest(
  supabase: SB,
  pickupCity: string,
  destinationCity: string,
  desiredDeliveryDate: string
): Promise<MatchingTrip[]> {
  // 1) Trips on the same route, departing on/before the desired date, still
  //    open. We sort by departure_date desc so the soonest-but-still-in-time
  //    trips come first — those are the most actionable.
  const { data: trips, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .select(
          'id, user_id, departure_city, arrival_city, departure_date, compensation_min, flight_number, available_space'
        )
        .eq('departure_city', pickupCity)
        .eq('arrival_city', destinationCity)
        .lte('departure_date', desiredDeliveryDate)
        .eq('status', 'open')
        .order('departure_date', { ascending: false })
        .limit(20)
    ),
    6000,
    'Matching trips'
  );
  if (error) throw error;
  if (!trips || trips.length === 0) return [];

  // 2) Hydrate traveler profiles in one batch (avoids the RLS-join stall
  //    pattern we use everywhere else).
  const userIds = Array.from(new Set(trips.map((t: any) => t.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, trips_completed, verification_level')
        .in('id', userIds)
    ),
    6000,
    'Matching traveler profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return trips.map((t: any) => ({
    ...t,
    user: (profileById.get(t.user_id) as any) ?? null,
  }));
}

// ============================================================================
// REVIEWS
// ============================================================================

export async function listReviewsForUser(supabase: SB, userId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('reviewed_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// REPORTS
// ============================================================================

export async function createReport(
  supabase: SB,
  input: {
    reporterId: string;
    reportedUserId?: string;
    targetType: 'user' | 'shipping_request' | 'traveler_trip' | 'message';
    targetId?: string;
    reason: string;
    details?: string;
  }
) {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId ?? null,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      reason: input.reason,
      details: input.details ?? null,
      status: 'open',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// Public profile (lightweight, for /u/[id] pages)
// ============================================================================

export async function getPublicProfile(
  supabase: SB,
  userId: string
): Promise<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed' | 'city' | 'country'> | null> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, verification_level, rating, trips_completed, city, country')
        .eq('id', userId)
        .maybeSingle()
    ),
    8000,
    'Public profile'
  );
  if (error) throw error;
  return data as any;
}

export async function listTripsByUser(
  supabase: SB,
  userId: string
): Promise<TravelerTripRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .gte('departure_date', today)
        .order('departure_date', { ascending: true })
    ),
    8000,
    'Trips by user'
  );
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Booking intents — sender expresses interest in a trip
// ============================================================================

export type BookingIntentInput = {
  sender_id: string;
  traveler_trip_id: string | null;
  item_category: string;
  item_description?: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  payment_intent_id?: string | null;
  payment_status?: 'unpaid' | 'authorized' | 'captured' | 'canceled' | 'failed';
  payment_amount?: number | null;
  // New for traveler→sender flow:
  shipping_request_id?: string | null;
  traveler_message?: string | null;
  initiated_by?: 'sender' | 'traveler';
  traveler_user_id?: string | null;
};

export async function createBookingIntent(
  supabase: SB,
  input: BookingIntentInput
) {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .insert({
          sender_id: input.sender_id,
          traveler_trip_id: input.traveler_trip_id,
          item_category: input.item_category,
          item_description: input.item_description ?? null,
          proposed_price: input.proposed_price,
          pickup_city: input.pickup_city,
          destination_city: input.destination_city,
          status: 'pending',
          payment_intent_id: input.payment_intent_id ?? null,
          payment_status: input.payment_status ?? 'unpaid',
          payment_amount: input.payment_amount ?? null,
          shipping_request_id: input.shipping_request_id ?? null,
          traveler_message: input.traveler_message ?? null,
          initiated_by: input.initiated_by ?? 'sender',
          traveler_user_id: input.traveler_user_id ?? null,
        })
        .select('*')
        .maybeSingle()
    ),
    8000,
    'Create booking intent'
  );
  if (error) throw error;
  return data ?? input;
}

export type BookingIntentRow = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
  item_category: string;
  item_description: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  payment_intent_id: string | null;
  payment_status: 'unpaid' | 'authorized' | 'captured' | 'canceled' | 'failed';
  payment_amount: number | null;
  delivery_proof_url: string | null;
  delivery_proof_uploaded_at: string | null;
  delivery_proof_receiver_name: string | null;
  delivery_proof_notes: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  traveler_user_id: string | null;
};

/**
 * List booking intents that target trips owned by `travelerId`.
 * RLS already enforces this; we still filter client-side defensively.
 *
 * We do TWO queries instead of one with a join, to avoid the nested-RLS
 * stalls that bit us before:
 *   1) get the traveler's trip IDs
 *   2) get all intents pointing at those IDs
 *   3) optionally fetch sender profiles in a single batch
 */
export async function listIncomingBookingIntents(
  supabase: SB,
  travelerId: string
): Promise<
  Array<
    BookingIntentRow & {
      sender_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'rating' | 'trips_completed' | 'verification_level'> | null;
      traveler_trip: Pick<TravelerTripRow, 'id' | 'departure_city' | 'arrival_city' | 'departure_date'> | null;
    }
  >
> {
  // 1) Trip IDs owned by this traveler
  const { data: trips, error: tripsErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .select('id, departure_city, arrival_city, departure_date')
        .eq('user_id', travelerId)
    ),
    8000,
    'Traveler trips'
  );
  if (tripsErr) throw tripsErr;
  if (!trips || trips.length === 0) return [];

  const tripIds = trips.map((t) => t.id);
  const tripById = new Map(trips.map((t) => [t.id, t]));

  // 2) Intents pointing at those trip IDs
  const { data: intents, error: intentsErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('*')
        .in('traveler_trip_id', tripIds)
        .order('created_at', { ascending: false })
    ),
    8000,
    'Incoming intents'
  );
  if (intentsErr) throw intentsErr;
  if (!intents || intents.length === 0) return [];

  // 3) Sender profiles in one batch
  const senderIds = Array.from(new Set(intents.map((i: any) => i.sender_id)));
  const { data: senders } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, trips_completed, verification_level')
        .in('id', senderIds)
    ),
    8000,
    'Sender profiles'
  );
  const senderById = new Map((senders ?? []).map((s: any) => [s.id, s]));

  return intents.map((i: any) => ({
    ...i,
    sender_profile: (senderById.get(i.sender_id) as any) ?? null,
    traveler_trip: (tripById.get(i.traveler_trip_id) as any) ?? null,
  }));
}

/**
 * Update a booking intent's status. Used by the traveler to accept or decline.
 */
export async function updateBookingIntentStatus(
  supabase: SB,
  intentId: string,
  status: 'confirmed' | 'cancelled'
): Promise<void> {
  const { error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .update({ status })
        .eq('id', intentId)
    ),
    8000,
    'Update intent status'
  );
  if (error) throw error;
}

/**
 * List booking intents created by `senderId` (the user's outgoing
 * reservations), enriched with the traveler's public info so the sender
 * can contact them once accepted.
 *
 * We do 3 queries instead of 1 with joins, for the same reason as everywhere
 * else: nested-RLS evaluation stalls. Plain selects + client-side merge are
 * boring but reliable.
 */
export async function listMyBookings(
  supabase: SB,
  senderId: string
): Promise<
  Array<
    BookingIntentRow & {
      traveler_trip: Pick<TravelerTripRow, 'id' | 'departure_city' | 'arrival_city' | 'departure_date' | 'user_id'> | null;
      traveler_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'phone' | 'verification_level' | 'rating' | 'trips_completed'> | null;
    }
  >
> {
  // 1) my booking intents
  const { data: intents, error: intentsErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('*')
        .eq('sender_id', senderId)
        .order('created_at', { ascending: false })
    ),
    8000,
    'My bookings'
  );
  if (intentsErr) throw intentsErr;
  if (!intents || intents.length === 0) return [];

  // 2) the trips referenced (only those with trips set)
  const tripIds = Array.from(
    new Set(intents.map((i: any) => i.traveler_trip_id).filter(Boolean))
  );
  const { data: trips } = tripIds.length > 0
    ? await withTimeout(
        Promise.resolve(
          supabase
            .from('traveler_trips')
            .select('id, departure_city, arrival_city, departure_date, user_id')
            .in('id', tripIds)
        ),
        8000,
        'Bookings trips'
      )
    : { data: [] as any[] };
  const tripById = new Map((trips ?? []).map((t: any) => [t.id, t]));

  // 3) the traveler profiles. Two sources to merge:
  //    - owners of the referenced trips (sender→traveler flow)
  //    - traveler_user_id directly when set (traveler→sender flow,
  //      where there's no trip yet)
  const travelerIds = Array.from(
    new Set([
      ...(trips ?? []).map((t: any) => t.user_id),
      ...intents.map((i: any) => i.traveler_user_id).filter(Boolean),
    ])
  );
  const { data: profiles } = travelerIds.length > 0
    ? await withTimeout(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, phone, verification_level, rating, trips_completed')
            .in('id', travelerIds)
        ),
        8000,
        'Traveler profiles'
      )
    : { data: [] as any[] };
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return intents.map((i: any) => {
    const trip = i.traveler_trip_id ? (tripById.get(i.traveler_trip_id) as any) : null;
    // Prefer trip owner's profile (sender→traveler) but fall back to
    // traveler_user_id directly (traveler→sender flow)
    const travelerProfileId = trip?.user_id ?? i.traveler_user_id;
    return {
      ...i,
      traveler_trip: trip ?? null,
      traveler_profile: (travelerProfileId ? profileById.get(travelerProfileId) : null) as any,
    };
  });
}

/**
 * List the proposals a traveler has made on public shipping requests.
 * These are booking_intents where initiated_by='traveler' and the
 * traveler_user_id matches.
 *
 * Returns each row enriched with the SENDER's profile so the traveler
 * can see who they offered to help.
 */
export async function listMyTravelerProposals(
  supabase: SB,
  travelerId: string
): Promise<
  Array<
    BookingIntentRow & {
      sender_profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'phone' | 'verification_level' | 'rating' | 'trips_completed'> | null;
    }
  >
> {
  const { data: intents, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('*')
        .eq('traveler_user_id', travelerId)
        .eq('initiated_by', 'traveler')
        .order('created_at', { ascending: false })
    ),
    8000,
    'My traveler proposals'
  );
  if (error) throw error;
  if (!intents || intents.length === 0) return [];

  const senderIds = Array.from(new Set(intents.map((i: any) => i.sender_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, verification_level, rating, trips_completed')
        .in('id', senderIds)
    ),
    8000,
    'Sender profiles for proposals'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return intents.map((i: any) => ({
    ...i,
    sender_profile: (profileById.get(i.sender_id) as any) ?? null,
  }));
}

/**
 * List all wallet transactions for a traveler — bookings where I'm the
 * traveler, with their full payment lifecycle info. We don't filter by
 * payment_status so the wallet page can show all states (captured,
 * authorized, canceled, failed).
 *
 * Each row is enriched with the SENDER's profile (to display who paid).
 *
 * "Available now" = captured (real money for the traveler)
 * "Pending"        = authorized (held by Stripe, not yet released)
 * "Cancelled"      = canceled or failed
 */
export type WalletTransaction = BookingIntentRow & {
  sender_profile: Pick<
    Profile,
    'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating'
  > | null;
};

export async function listWalletTransactions(
  supabase: SB,
  travelerId: string
): Promise<WalletTransaction[]> {
  // 1) Find every booking where I'm the traveler — either set directly,
  //    or inferred from the trip I own.
  //
  //    To keep things simple we do TWO queries and merge: one by
  //    traveler_user_id, one via trip owner. We dedupe by booking id.
  const [byUser, byTrip] = await Promise.all([
    withTimeout(
      Promise.resolve(
        supabase
          .from('booking_intents')
          .select('*')
          .eq('traveler_user_id', travelerId)
      ),
      8000,
      'Wallet by user'
    ),
    withTimeout(
      (async () => {
        // First get my trip IDs, then fetch bookings on them
        const { data: trips } = await supabase
          .from('traveler_trips')
          .select('id')
          .eq('user_id', travelerId);
        const tripIds = (trips ?? []).map((t: any) => t.id);
        if (tripIds.length === 0) return { data: [] as any[], error: null };
        return supabase
          .from('booking_intents')
          .select('*')
          .in('traveler_trip_id', tripIds);
      })(),
      8000,
      'Wallet by trip'
    ),
  ]);

  const all = new Map<string, BookingIntentRow>();
  (byUser.data ?? []).forEach((b: BookingIntentRow) => all.set(b.id, b));
  (byTrip.data ?? []).forEach((b: BookingIntentRow) => all.set(b.id, b));

  const bookings = Array.from(all.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (bookings.length === 0) return [];

  // 2) Hydrate with sender profiles
  const senderIds = Array.from(new Set(bookings.map((b) => b.sender_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, verification_level, rating')
        .in('id', senderIds)
    ),
    8000,
    'Wallet sender profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return bookings.map((b) => ({
    ...b,
    sender_profile: (profileById.get(b.sender_id) as any) ?? null,
  }));
}

/**
 * Get the traveler's wallet balance — net amount of captured payments
 * where I'm the traveler RECIPIENT (not the sender). Used by the Navbar
 * to display the wallet pill. Returns the amount in euros, net of fees.
 *
 * Uses the same data source as the /wallet page so both numbers match.
 */
export async function getWalletBalance(supabase: SB, travelerId: string): Promise<number> {
  const txs = await listWalletTransactions(supabase, travelerId);
  // Exclude bookings where I'm the SENDER (= I paid out, I didn't earn).
  const incoming = txs.filter((t) => t.sender_id !== travelerId);
  // Only count captured bookings (money actually moved).
  const captured = incoming.filter((t) => t.payment_status === 'captured');
  const totalCents = captured.reduce((sum, t) => sum + (t.payment_amount ?? 0), 0);
  return totalCents / 100 / 1.15;
}

/**
 * Count the active booking intents on a trip — used to show a warning
 * before canceling. "Active" = pending or confirmed/authorized, i.e. not
 * already cancelled.
 */
export async function countActiveBookingsForTrip(
  supabase: SB,
  tripId: string
): Promise<{ count: number; intents: BookingIntentRow[] }> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('*')
        .eq('traveler_trip_id', tripId)
        .neq('status', 'cancelled')
    ),
    8000,
    'Count active bookings'
  );
  if (error) throw error;
  const intents = (data ?? []) as BookingIntentRow[];
  return { count: intents.length, intents };
}

/**
 * Cancel a trip. Marks the trip as `cancelled` so it disappears from the
 * search results, and triggers a cancel/refund on any pending or
 * authorized booking_intents pointing at it.
 *
 * Stripe payments still in `authorized` state are released (no funds moved).
 * Captured payments are NOT touched here — those would need a refund
 * operation, which has different rules (window, fees, etc.). For now we
 * just mark them and the operator handles them out-of-band.
 */
export async function cancelTrip(supabase: SB, tripId: string): Promise<void> {
  // 1. Find all non-cancelled booking intents on this trip
  const { intents } = await countActiveBookingsForTrip(supabase, tripId);

  // 2. Mark the trip itself as cancelled
  const { error: tripErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .update({ status: 'cancelled' })
        .eq('id', tripId)
    ),
    8000,
    'Cancel trip'
  );
  if (tripErr) throw tripErr;

  // 3. For each booking intent, mark it cancelled and try to release its
  //    Stripe authorization. We do these in parallel with allSettled so
  //    one failing call doesn't block the rest — the trip is already
  //    cancelled in DB, that's the important bit.
  await Promise.allSettled(
    intents.map(async (intent) => {
      // Update DB row
      await supabase
        .from('booking_intents')
        .update({ status: 'cancelled' })
        .eq('id', intent.id);

      // If there's a Stripe authorization still standing, cancel it.
      // Captured payments need a different operation (refund) we don't
      // handle automatically — flag them for manual reconciliation.
      if (intent.payment_intent_id && intent.payment_status === 'authorized') {
        try {
          await fetch('/api/stripe/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: intent.payment_intent_id,
              bookingIntentId: intent.id,
            }),
          });
        } catch {
          // Best-effort; the booking is already cancelled in DB.
        }
      }
    })
  );
}

// ============================================================================
// Browser convenience wrappers
// ============================================================================

// =============================================================================
// CHAT (conversations + messages)
// =============================================================================

export type ConversationRow = {
  id: string;
  booking_intent_id: string;
  sender_id: string;
  traveler_id: string;
  last_email_to_sender_at: string | null;
  last_email_to_traveler_at: string | null;
  created_at: string;
};

export type MessageRowChat = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

/**
 * Get or create the conversation for a given booking. The conversation
 * is auto-created the first time anyone opens the chat after the booking
 * is confirmed. Returns the conversation row.
 *
 * Note: relies on the unique(booking_intent_id) constraint to handle
 * concurrent creation gracefully — if two clients race, one wins and
 * the other receives an error which we recover from by re-selecting.
 */
export async function getOrCreateConversation(
  supabase: SB,
  bookingIntentId: string,
  senderId: string,
  travelerId: string
): Promise<ConversationRow> {
  // Try select first — most calls after the first are read-only.
  const { data: existing } = await withTimeout(
    Promise.resolve(
      supabase
        .from('conversations')
        .select('*')
        .eq('booking_intent_id', bookingIntentId)
        .maybeSingle()
    ),
    6000,
    'Get conversation'
  );
  if (existing) return existing as ConversationRow;

  // Doesn't exist yet — create. The unique constraint protects against
  // races; if INSERT fails because someone else created it just now, we
  // re-select.
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      booking_intent_id: bookingIntentId,
      sender_id: senderId,
      traveler_id: travelerId,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    // Likely race — re-select. If it's another error, throw.
    const { data: retry } = await supabase
      .from('conversations')
      .select('*')
      .eq('booking_intent_id', bookingIntentId)
      .maybeSingle();
    if (retry) return retry as ConversationRow;
    throw error;
  }
  return created as ConversationRow;
}

/**
 * List messages in a conversation, oldest first (chat-style).
 */
export async function listMessages(
  supabase: SB,
  conversationId: string
): Promise<MessageRowChat[]> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200)
    ),
    8000,
    'List messages'
  );
  if (error) throw error;
  return (data ?? []) as MessageRowChat[];
}

/**
 * Mark all messages from the OTHER user as read in this conversation.
 * Called when the user opens the modal — we set read_at = now() on every
 * message they didn't write themselves and which is still unread.
 */
export async function markMessagesRead(
  supabase: SB,
  conversationId: string,
  userId: string
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

/**
 * Count unread messages across all conversations the user is part of.
 * Returns a map of conversation_id → unread count, used to show badges
 * on each booking card and a global badge in the navbar.
 */
export async function listUnreadCountsByConversation(
  supabase: SB,
  userId: string
): Promise<Record<string, number>> {
  // 1. Get all conversations I'm in
  const { data: convs } = await withTimeout(
    Promise.resolve(
      supabase
        .from('conversations')
        .select('id')
        .or(`sender_id.eq.${userId},traveler_id.eq.${userId}`)
    ),
    6000,
    'My conversations'
  );
  const ids = (convs ?? []).map((c: any) => c.id);
  if (ids.length === 0) return {};

  // 2. Count unread messages from the OTHER user per conversation. We
  //    fetch the messages (just id + conversation_id) and tally locally
  //    — keeps RLS simple, no aggregate function needed.
  const { data: unread } = await withTimeout(
    Promise.resolve(
      supabase
        .from('messages')
        .select('id, conversation_id')
        .in('conversation_id', ids)
        .neq('sender_id', userId)
        .is('read_at', null)
    ),
    6000,
    'Unread messages'
  );

  const map: Record<string, number> = {};
  (unread ?? []).forEach((m: any) => {
    map[m.conversation_id] = (map[m.conversation_id] ?? 0) + 1;
  });
  return map;
}

/**
 * List all my conversations, enriched with: the OTHER user's profile,
 * the last message (for the preview), the unread count, and the
 * booking's pickup/destination cities for context. Sorted by most
 * recent activity (last message timestamp, falling back to conversation
 * creation time).
 *
 * This is what the /messages inbox renders.
 */
export type ConversationListItem = {
  id: string;
  booking_intent_id: string;
  // The two participants — useful to open the ChatModal without re-querying
  sender_id: string;
  traveler_id: string;
  pickup_city: string;
  destination_city: string;
  other_user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  last_message: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread_count: number;
  // For sorting and display
  last_activity_at: string;
};

export async function listMyConversations(
  supabase: SB,
  userId: string
): Promise<ConversationListItem[]> {
  // 1. Get all conversations I'm in
  const { data: convs, error: convsErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('conversations')
        .select('id, booking_intent_id, sender_id, traveler_id, created_at')
        .or(`sender_id.eq.${userId},traveler_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    ),
    8000,
    'My conversations'
  );
  if (convsErr) throw convsErr;
  if (!convs || convs.length === 0) return [];

  const convIds = convs.map((c: any) => c.id);
  const bookingIds = convs.map((c: any) => c.booking_intent_id);
  // The other user is whichever participant isn't me.
  const otherUserIds = Array.from(
    new Set(
      convs.map((c: any) => (c.sender_id === userId ? c.traveler_id : c.sender_id))
    )
  );

  // 2. Get all messages for these conversations in one shot. We'll
  //    derive the "last message" per conv and the unread count locally.
  const { data: msgs } = await withTimeout(
    Promise.resolve(
      supabase
        .from('messages')
        .select('conversation_id, sender_id, body, read_at, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
    ),
    8000,
    'Conversation messages'
  );

  // 3. Get the bookings to surface pickup/destination
  const { data: bookings } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('id, pickup_city, destination_city')
        .in('id', bookingIds)
    ),
    8000,
    'Conversation bookings'
  );
  const bookingById = new Map((bookings ?? []).map((b: any) => [b.id, b]));

  // 4. Get the other users' profiles
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', otherUserIds)
    ),
    8000,
    'Conversation profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  // 5. Per-conversation aggregation
  const lastMsgByConv = new Map<string, any>();
  const unreadByConv = new Map<string, number>();
  (msgs ?? []).forEach((m: any) => {
    // first message we see for a conv is the most recent (we ordered desc)
    if (!lastMsgByConv.has(m.conversation_id)) {
      lastMsgByConv.set(m.conversation_id, m);
    }
    // Unread if sent by the OTHER user AND not yet read
    if (m.sender_id !== userId && !m.read_at) {
      unreadByConv.set(
        m.conversation_id,
        (unreadByConv.get(m.conversation_id) ?? 0) + 1
      );
    }
  });

  const items: ConversationListItem[] = convs.map((c: any) => {
    const otherId = c.sender_id === userId ? c.traveler_id : c.sender_id;
    const other = profileById.get(otherId) as any;
    const booking = bookingById.get(c.booking_intent_id) as any;
    const lastMsg = lastMsgByConv.get(c.id);
    return {
      id: c.id,
      booking_intent_id: c.booking_intent_id,
      sender_id: c.sender_id,
      traveler_id: c.traveler_id,
      pickup_city: booking?.pickup_city ?? '',
      destination_city: booking?.destination_city ?? '',
      other_user: other
        ? {
            id: other.id,
            full_name: other.full_name,
            avatar_url: other.avatar_url,
          }
        : null,
      last_message: lastMsg
        ? {
            body: lastMsg.body,
            created_at: lastMsg.created_at,
            sender_id: lastMsg.sender_id,
          }
        : null,
      unread_count: unreadByConv.get(c.id) ?? 0,
      last_activity_at: lastMsg?.created_at ?? c.created_at,
    };
  });

  // Sort by last_activity_at desc
  items.sort(
    (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
  );
  return items;
}

/**
 * Quick "do I have any unread message?" check used by the Navbar inbox
 * icon to decide whether to show the red dot. Returns true if any
 * unread exists in any of my conversations.
 */
export async function hasUnreadMessages(
  supabase: SB,
  userId: string
): Promise<boolean> {
  // First get my conversation ids
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`sender_id.eq.${userId},traveler_id.eq.${userId}`);
  const ids = (convs ?? []).map((c: any) => c.id);
  if (ids.length === 0) return false;

  // Then check if any unread message exists from someone other than me.
  // Use head:true to skip data return — we only care about existence.
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);
  return (count ?? 0) > 0;
}

export const browser = {
  getProfile: (userId: string) => getProfile(getBrowserClient(), userId),
  updateProfile: (userId: string, patch: Partial<Profile>) => updateProfile(getBrowserClient(), userId, patch),
  listOpenTrips: (filters?: Parameters<typeof listOpenTrips>[1]) => listOpenTrips(getBrowserClient(), filters),
  listMyTrips: (userId: string) => listMyTrips(getBrowserClient(), userId),
  createTrip: (input: Parameters<typeof createTrip>[1]) => createTrip(getBrowserClient(), input),
  listOpenRequests: () => listOpenRequests(getBrowserClient()),
  listMyRequests: (userId: string) => listMyRequests(getBrowserClient(), userId),
  createShippingRequest: (input: Parameters<typeof createShippingRequest>[1]) => createShippingRequest(getBrowserClient(), input),
  listMyMatches: (userId: string) => listMyMatches(getBrowserClient(), userId),
  listMatchingTripsForRequest: (pickupCity: string, destinationCity: string, desiredDeliveryDate: string) =>
    listMatchingTripsForRequest(getBrowserClient(), pickupCity, destinationCity, desiredDeliveryDate),
  createMatch: (travelerTripId: string, shippingRequestId: string, agreedCompensation?: number) =>
    createMatch(getBrowserClient(), travelerTripId, shippingRequestId, agreedCompensation),
  listReviewsForUser: (userId: string) => listReviewsForUser(getBrowserClient(), userId),
  createReport: (input: Parameters<typeof createReport>[1]) => createReport(getBrowserClient(), input),
  getPublicProfile: (userId: string) => getPublicProfile(getBrowserClient(), userId),
  listTripsByUser: (userId: string) => listTripsByUser(getBrowserClient(), userId),
  createBookingIntent: (input: BookingIntentInput) => createBookingIntent(getBrowserClient(), input),
  listIncomingBookingIntents: (travelerId: string) => listIncomingBookingIntents(getBrowserClient(), travelerId),
  updateBookingIntentStatus: (intentId: string, status: 'confirmed' | 'cancelled') =>
    updateBookingIntentStatus(getBrowserClient(), intentId, status),
  listMyBookings: (senderId: string) => listMyBookings(getBrowserClient(), senderId),
  countActiveBookingsForTrip: (tripId: string) => countActiveBookingsForTrip(getBrowserClient(), tripId),
  cancelTrip: (tripId: string) => cancelTrip(getBrowserClient(), tripId),
  listOpenRequestsWithProfile: () => listOpenRequestsWithProfile(getBrowserClient()),
  listMyTravelerProposals: (travelerId: string) => listMyTravelerProposals(getBrowserClient(), travelerId),
  getWalletBalance: (travelerId: string) => getWalletBalance(getBrowserClient(), travelerId),
  listWalletTransactions: (travelerId: string) => listWalletTransactions(getBrowserClient(), travelerId),
  // Chat
  getOrCreateConversation: (bookingIntentId: string, senderId: string, travelerId: string) =>
    getOrCreateConversation(getBrowserClient(), bookingIntentId, senderId, travelerId),
  listMessages: (conversationId: string) => listMessages(getBrowserClient(), conversationId),
  markMessagesRead: (conversationId: string, userId: string) =>
    markMessagesRead(getBrowserClient(), conversationId, userId),
  listUnreadCountsByConversation: (userId: string) =>
    listUnreadCountsByConversation(getBrowserClient(), userId),
  listMyConversations: (userId: string) => listMyConversations(getBrowserClient(), userId),
  hasUnreadMessages: (userId: string) => hasUnreadMessages(getBrowserClient(), userId),
};
