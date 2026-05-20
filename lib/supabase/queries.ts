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
  MessageRow,
  ReviewRow,
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
  let q = supabase
    .from('traveler_trips')
    .select('*')
    .eq('status', 'open')
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

// ============================================================================
// MESSAGES
// ============================================================================

export async function listMessagesForMatch(supabase: SB, matchId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  supabase: SB,
  input: { senderId: string; receiverId: string; matchId?: string; message: string }
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      match_id: input.matchId ?? null,
      message: input.message,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
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
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
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
  traveler_trip_id: string;
  item_category: string;
  item_description?: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
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
  traveler_trip_id: string;
  item_category: string;
  item_description: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
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

  // 2) the trips referenced
  const tripIds = Array.from(new Set(intents.map((i: any) => i.traveler_trip_id)));
  const { data: trips } = await withTimeout(
    Promise.resolve(
      supabase
        .from('traveler_trips')
        .select('id, departure_city, arrival_city, departure_date, user_id')
        .in('id', tripIds)
    ),
    8000,
    'Bookings trips'
  );
  const tripById = new Map((trips ?? []).map((t: any) => [t.id, t]));

  // 3) the traveler profiles (only the owners of those trips)
  const travelerIds = Array.from(new Set((trips ?? []).map((t: any) => t.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, verification_level, rating, trips_completed')
        .in('id', travelerIds)
    ),
    8000,
    'Traveler profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return intents.map((i: any) => {
    const trip = tripById.get(i.traveler_trip_id) as any;
    return {
      ...i,
      traveler_trip: trip ?? null,
      traveler_profile: (trip ? profileById.get(trip.user_id) : null) as any,
    };
  });
}

// ============================================================================
// Browser convenience wrappers
// ============================================================================

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
  createMatch: (travelerTripId: string, shippingRequestId: string, agreedCompensation?: number) =>
    createMatch(getBrowserClient(), travelerTripId, shippingRequestId, agreedCompensation),
  listMessagesForMatch: (matchId: string) => listMessagesForMatch(getBrowserClient(), matchId),
  sendMessage: (input: Parameters<typeof sendMessage>[1]) => sendMessage(getBrowserClient(), input),
  listReviewsForUser: (userId: string) => listReviewsForUser(getBrowserClient(), userId),
  createReport: (input: Parameters<typeof createReport>[1]) => createReport(getBrowserClient(), input),
  getPublicProfile: (userId: string) => getPublicProfile(getBrowserClient(), userId),
  listTripsByUser: (userId: string) => listTripsByUser(getBrowserClient(), userId),
  createBookingIntent: (input: BookingIntentInput) => createBookingIntent(getBrowserClient(), input),
  listIncomingBookingIntents: (travelerId: string) => listIncomingBookingIntents(getBrowserClient(), travelerId),
  updateBookingIntentStatus: (intentId: string, status: 'confirmed' | 'cancelled') =>
    updateBookingIntentStatus(getBrowserClient(), intentId, status),
  listMyBookings: (senderId: string) => listMyBookings(getBrowserClient(), senderId),
};
