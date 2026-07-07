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
    if (error.code === 'PGRST116') return null;
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
    maxDate?: string;
    maxBudget?: number;
    limit?: number;
  }
): Promise<(TravelerTripRow & { profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null })[]> {
  const today = new Date().toISOString().slice(0, 10);

  // Single round-trip: embed the author's public profile via the
  // traveler_trips.user_id -> profiles.id foreign key (PostgREST auto-detects
  // the relationship since it's the only FK to profiles on this table).
  let q = supabase
    .from('traveler_trips')
    .select(
      '*, profile:profiles(id, full_name, avatar_url, verification_level, rating, trips_completed)'
    )
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

  return trips.map((t: any) => ({ ...t, profile: t.profile ?? null }));
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
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('shipping_requests')
    .select('*')
    .eq('status', 'pending')
    .gte('desired_delivery_date', today)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export type ShippingRequestWithProfile = ShippingRequestRow & { profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null; };

export async function listOpenRequestsWithProfile(
  supabase: SB
): Promise<ShippingRequestWithProfile[]> {
  const today = new Date().toISOString().slice(0, 10);

  // Single round-trip via the shipping_requests.user_id -> profiles.id FK.
  const { data: requests, error: reqErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('shipping_requests')
        .select(
          '*, profile:profiles(id, full_name, avatar_url, verification_level, rating, trips_completed)'
        )
        .eq('status', 'pending')
        .gte('desired_delivery_date', today)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    8000,
    'List open requests'
  );
  if (reqErr) throw reqErr;
  if (!requests || requests.length === 0) return [];

  return requests.map((r: any) => ({ ...r, profile: r.profile ?? null }));
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
  return (data ?? { ...input, id: '', created_at: new Date().toISOString() }) as ShippingRequestRow;
}

// ============================================================================
// MATCHES
// ============================================================================

export async function listMyMatches(
  supabase: SB,
  userId: string
): Promise<MatchRow[]> {
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

// STRICT matching: exact pickup_city + destination_city match
export async function listMatchingTripsForRequest(
  supabase: SB,
  pickupCity: string,
  destinationCity: string,
  desiredDeliveryDate: string,
  excludeUserId?: string | null
): Promise<MatchingTrip[]> {
  // Never surface trips whose departure date has already passed.
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('traveler_trips')
    .select(
      'id, user_id, departure_city, arrival_city, departure_date, compensation_min, flight_number, available_space'
    )
    .eq('departure_city', pickupCity)
    .eq('arrival_city', destinationCity)
    .gte('departure_date', today)
    .lte('departure_date', desiredDeliveryDate)
    .eq('status', 'open')
    .order('departure_date', { ascending: false })
    .limit(20);
  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }
  const { data: trips, error } = await withTimeout(
    Promise.resolve(query),
    6000,
    'Matching trips'
  );
  if (error) throw error;
  if (!trips || trips.length === 0) return [];

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

// TIERED matching: a single country->country query, then each trip is
// classified in JS into a proximity tier (closest first):
//   exact         city A -> city B
//   from_country  pays A -> city B   (same arrival city, departure elsewhere in the country)
//   to_country    city A -> pays B   (same departure city, arrival elsewhere in the country)
//   both_country  pays A -> pays B
// All four tiers are subsets of "departure_country = A AND arrival_country = B",
// so one query returns the full candidate set; we tag & order them here.
export type MatchTier = 'exact' | 'from_country' | 'to_country' | 'both_country';
export type TieredMatchingTrip = MatchingTrip & { tier: MatchTier };

export async function listMatchingTripsTiered(
  supabase: SB,
  pickupCountry: string,
  destinationCountry: string,
  pickupCity: string,
  destinationCity: string,
  desiredDeliveryDate: string,
  excludeUserId?: string | null
): Promise<TieredMatchingTrip[]> {
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('traveler_trips')
    .select(
      'id, user_id, departure_city, arrival_city, departure_date, compensation_min, flight_number, available_space'
    )
    .eq('departure_country', pickupCountry)
    .eq('arrival_country', destinationCountry)
    .gte('departure_date', today)
    .lte('departure_date', desiredDeliveryDate)
    .eq('status', 'open')
    .order('departure_date', { ascending: true })
    .limit(40);
  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data: trips, error } = await withTimeout(
    Promise.resolve(query),
    6000,
    'Tiered matching trips'
  );
  if (error) throw error;
  if (!trips || trips.length === 0) return [];

  const userIds = Array.from(new Set(trips.map((t: any) => t.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, trips_completed, verification_level')
        .in('id', userIds)
    ),
    6000,
    'Tiered matching traveler profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const norm = (s: string) => s.trim().toLowerCase();
  const pc = norm(pickupCity);
  const dc = norm(destinationCity);
  const rank: Record<MatchTier, number> = {
    exact: 0,
    from_country: 1,
    to_country: 2,
    both_country: 3,
  };

  return trips
    .map((t: any): TieredMatchingTrip => {
      const dep = norm(t.departure_city);
      const arr = norm(t.arrival_city);
      let tier: MatchTier;
      if (dep === pc && arr === dc) tier = 'exact';
      else if (arr === dc) tier = 'from_country';
      else if (dep === pc) tier = 'to_country';
      else tier = 'both_country';
      return {
        ...(t as MatchingTrip),
        user: (profileById.get(t.user_id) as any) ?? null,
        tier,
      };
    })
    .sort((a, b) => rank[a.tier] - rank[b.tier]);
}

// BROADENED matching: country-level fallback when strict returns nothing
export async function listMatchingTripsForRequestBroadened(
  supabase: SB,
  pickupCountry: string,
  destinationCountry: string,
  pickupCity: string,
  destinationCity: string,
  desiredDeliveryDate: string,
  excludeUserId?: string | null
): Promise<MatchingTrip[]> {
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('traveler_trips')
    .select(
      'id, user_id, departure_city, arrival_city, departure_date, compensation_min, flight_number, available_space'
    )
    .eq('departure_country', pickupCountry)
    .eq('arrival_country', destinationCountry)
    .gte('departure_date', today)
    .lte('departure_date', desiredDeliveryDate)
    .eq('status', 'open')
    .order('departure_date', { ascending: true })
    .limit(20);

  if (pickupCity && destinationCity) {
    query = query.or(
      `departure_city.neq.${pickupCity},arrival_city.neq.${destinationCity}`
    );
  }
  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data: trips, error } = await withTimeout(
    Promise.resolve(query),
    6000,
    'Broadened matching trips'
  );
  if (error) throw error;
  if (!trips || trips.length === 0) return [];

  const userIds = Array.from(new Set(trips.map((t: any) => t.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, trips_completed, verification_level')
        .in('id', userIds)
    ),
    6000,
    'Broadened matching traveler profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return trips.map((t: any) => ({
    ...t,
    user: (profileById.get(t.user_id) as any) ?? null,
  }));
}

// =============================================================================
// MATCHING (mirror) — list shipping requests that fit a freshly-planned trip
// =============================================================================

export type MatchingRequest = {
  id: string;
  user_id: string;
  pickup_city: string;
  destination_city: string;
  desired_delivery_date: string;
  budget: number;
  item_category: string;
  item_description: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    rating: number;
    trips_completed: number;
    verification_level: VerificationLevel;
  } | null;
};

export async function listMatchingRequestsForTrip(
  supabase: SB,
  departureCity: string,
  arrivalCity: string,
  departureDate: string,
  excludeUserId?: string | null
): Promise<MatchingRequest[]> {
  let query = supabase
    .from('shipping_requests')
    .select(
      'id, user_id, pickup_city, destination_city, desired_delivery_date, budget, item_category, item_description, created_at'
    )
    .eq('pickup_city', departureCity)
    .eq('destination_city', arrivalCity)
    .gte('desired_delivery_date', departureDate)
    .eq('status', 'pending')
    .order('desired_delivery_date', { ascending: true })
    .limit(20);
  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }
  const { data: requests, error } = await withTimeout(
    Promise.resolve(query),
    6000,
    'Matching requests'
  );
  if (error) throw error;
  if (!requests || requests.length === 0) return [];

  const userIds = Array.from(new Set(requests.map((r: any) => r.user_id)));
  const { data: profiles } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, rating, trips_completed, verification_level')
        .in('id', userIds)
    ),
    6000,
    'Matching sender profiles'
  );
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return requests.map((r: any) => ({
    ...r,
    user: (profileById.get(r.user_id) as any) ?? null,
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

export async function confirmBookingReceipt(
  supabase: SB,
  bookingIntentId: string
): Promise<void> {
  const { error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .update({ received_confirmed_at: new Date().toISOString() })
        .eq('id', bookingIntentId)
    ),
    8000,
    'Confirm receipt'
  );
  if (error) throw error;
}

export async function createReview(
  supabase: SB,
  input: {
    booking_intent_id: string;
    reviewer_id: string;
    reviewed_user_id: string;
    rating: number;
    comment?: string | null;
  }
) {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('reviews')
        .insert({
          booking_intent_id: input.booking_intent_id,
          reviewer_id: input.reviewer_id,
          reviewed_user_id: input.reviewed_user_id,
          rating: input.rating,
          comment: input.comment ?? null,
        })
        .select('*')
        .maybeSingle()
    ),
    8000,
    'Create review'
  );
  if (error) throw error;
  return data;
}

export type ReviewForBooking = {
  id: string;
  booking_intent_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export async function listReviewsByBookingIds(
  supabase: SB,
  bookingIds: string[]
): Promise<ReviewForBooking[]> {
  if (bookingIds.length === 0) return [];
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('reviews')
        .select('id, booking_intent_id, reviewer_id, reviewed_user_id, rating, comment, created_at')
        .in('booking_intent_id', bookingIds)
    ),
    8000,
    'Reviews by booking ids'
  );
  if (error) throw error;
  return (data ?? []) as ReviewForBooking[];
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  related_booking_id: string | null;
  related_trip_id: string | null;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(
  supabase: SB,
  userId: string,
  limit = 20,
  before?: string
): Promise<Notification[]> {
  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('created_at', before);
  const { data, error } = await withTimeout(
    Promise.resolve(q),
    8000,
    'Notifications list'
  );
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function countUnreadNotifications(
  supabase: SB,
  userId: string
): Promise<number> {
  const { count, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null)
    ),
    8000,
    'Notifications unread count'
  );
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SB,
  notificationId: string
): Promise<void> {
  const { error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .is('read_at', null)
    ),
    8000,
    'Mark notification read'
  );
  if (error) throw error;
}

export async function markAllNotificationsRead(
  supabase: SB,
  userId: string
): Promise<void> {
  const { error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
    ),
    8000,
    'Mark all read'
  );
  if (error) throw error;
}

// ============================================================================
// TRUST & SAFETY — confirmation codes, pickup state, disputes
// ============================================================================

export function generateConfirmationCode(): string {
  // Cryptographically-strong: these 6-digit codes gate pickup/delivery (and
  // thus payment capture), so they must not be predictable like Math.random.
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const n = arr[0] % 10_000;
  return n.toString().padStart(4, '0');
}

export async function confirmPickupWithCode(
  supabase: SB,
  bookingId: string,
  code: string,
  travelerId: string
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('id, pickup_code, traveler_user_id, traveler_trip_id, pickup_confirmed_at, status')
        .eq('id', bookingId)
        .maybeSingle()
    ),
    8000,
    'Confirm pickup fetch'
  );
  if (error || !data) return { ok: false, reason: 'unknown' };

  // The traveler can be identified two ways: directly via traveler_user_id
  // (traveler-initiated proposals), OR — for the common sender-books-a-trip
  // flow — only the trip is linked and traveler_user_id is null. In that case
  // the real traveler is the trip owner. Resolve both so the handover works
  // regardless of how the booking was created (and before the flight happens).
  let authorizedTravelerId: string | null = data.traveler_user_id ?? null;
  if (!authorizedTravelerId && data.traveler_trip_id) {
    const { data: trip } = await withTimeout(
      Promise.resolve(
        supabase
          .from('traveler_trips')
          .select('user_id')
          .eq('id', data.traveler_trip_id)
          .maybeSingle()
      ),
      8000,
      'Confirm pickup trip lookup'
    );
    authorizedTravelerId = trip?.user_id ?? null;
  }

  if (authorizedTravelerId !== travelerId) {
    return { ok: false, reason: 'not_traveler' };
  }
  if (data.pickup_confirmed_at) {
    return { ok: false, reason: 'already_confirmed' };
  }
  if (data.pickup_code !== code) {
    return { ok: false, reason: 'invalid_code' };
  }

  const { error: updateErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .update({
          pickup_confirmed_at: new Date().toISOString(),
          pickup_confirmed_by: travelerId,
        })
        .eq('id', bookingId)
    ),
    8000,
    'Confirm pickup update'
  );
  if (updateErr) return { ok: false, reason: 'unknown' };
  return { ok: true };
}

export async function confirmDeliveryWithCode(
  supabase: SB,
  bookingId: string,
  code: string,
  senderId: string
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('id, delivery_code, sender_id, received_confirmed_at, delivery_proof_url')
        .eq('id', bookingId)
        .maybeSingle()
    ),
    8000,
    'Confirm delivery fetch'
  );
  if (error || !data) return { ok: false, reason: 'unknown' };

  if (data.sender_id !== senderId) {
    return { ok: false, reason: 'not_sender' };
  }
  if (data.received_confirmed_at) {
    return { ok: false, reason: 'already_confirmed' };
  }
  if (!data.delivery_proof_url) {
    return { ok: false, reason: 'no_proof' };
  }
  if (data.delivery_code !== code) {
    return { ok: false, reason: 'invalid_code' };
  }
  return { ok: true };
}

// Lightweight stage read for the chat: just the two confirmation timestamps,
// used to decide which code-handoff hint to show in the conversation.
export async function getBookingStage(
  supabase: SB,
  bookingId: string
): Promise<{ pickup_confirmed_at: string | null; received_confirmed_at: string | null } | null> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('pickup_confirmed_at, received_confirmed_at')
        .eq('id', bookingId)
        .maybeSingle()
    ),
    8000,
    'Booking stage'
  );
  if (error || !data) return null;
  return {
    pickup_confirmed_at: data.pickup_confirmed_at ?? null,
    received_confirmed_at: data.received_confirmed_at ?? null,
  };
}

// -----------------------------------------------------------------------------
// DISPUTES
// -----------------------------------------------------------------------------

export type Dispute = {
  id: string;
  booking_intent_id: string;
  reporter_id: string;
  reported_user_id: string;
  category: 'not_delivered' | 'damaged' | 'wrong_item' | 'late_delivery' | 'other';
  description: string | null;
  photos_urls: string[];
  status: 'open' | 'investigating' | 'resolved_for_reporter' | 'resolved_for_reported' | 'closed';
  admin_notes: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
};

export async function createDispute(
  supabase: SB,
  input: {
    bookingId: string;
    reporterId: string;
    reportedUserId: string;
    category: Dispute['category'];
    description?: string;
    photosUrls?: string[];
  }
): Promise<Dispute> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('disputes')
        .insert({
          booking_intent_id: input.bookingId,
          reporter_id: input.reporterId,
          reported_user_id: input.reportedUserId,
          category: input.category,
          description: input.description ?? null,
          photos_urls: input.photosUrls ?? [],
        })
        .select('*')
        .single()
    ),
    8000,
    'Create dispute'
  );
  if (error) throw error;
  return data as Dispute;
}

export async function listDisputesForUser(
  supabase: SB,
  userId: string
): Promise<Dispute[]> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('disputes')
        .select('*')
        .or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
    ),
    8000,
    'List disputes'
  );
  if (error) throw error;
  return (data ?? []) as Dispute[];
}

export async function getOpenDisputeForBooking(
  supabase: SB,
  bookingId: string,
  reporterId: string
): Promise<Dispute | null> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('disputes')
        .select('*')
        .eq('booking_intent_id', bookingId)
        .eq('reporter_id', reporterId)
        .in('status', ['open', 'investigating'])
        .maybeSingle()
    ),
    8000,
    'Get open dispute'
  );
  if (error) throw error;
  return (data ?? null) as Dispute | null;
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
// Public profile
// ============================================================================

export async function getPublicProfile(
  supabase: SB,
  userId: string
): Promise<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed' | 'city' | 'country'> | null> {
  const { data, error } = await withTimeout(
    Promise.resolve(
      supabase
        .from('profiles')
       .select('id, full_name, avatar_url, verification_level, rating, trips_completed, city, country, identity_verified_at, created_at')
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
// Booking intents
// ============================================================================

export type BookingIntentInput = {
  sender_id: string;
  traveler_trip_id: string | null;
  item_category: string;
  item_title?: string | null;
  item_description?: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  payment_intent_id?: string | null;
  payment_status?: 'unpaid' | 'authorized' | 'captured' | 'canceled' | 'failed';
  payment_amount?: number | null;
  shipping_request_id?: string | null;
  traveler_message?: string | null;
  initiated_by?: 'sender' | 'traveler';
  traveler_user_id?: string | null;
  // Timestamp proving the sender ticked the "I certify..." box at booking.
  user_certified_at?: string | null;
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
          item_title: input.item_title ?? null,
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
          pickup_code: generateConfirmationCode(),
          delivery_code: generateConfirmationCode(),
        })
        .select('*')
        .maybeSingle()
    ),
    8000,
    'Create booking intent'
  );
  if (error) throw error;

  // Fire-and-forget email notification.
  if (data?.id) {
    const event =
      (input.initiated_by ?? 'sender') === 'sender'
        ? 'traveler-got-booking'
        : 'sender-got-proposal';
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, bookingId: data.id }),
    }).catch((err) => {
      console.warn('[createBookingIntent] notify call failed:', err);
    });
  }

  return data ?? input;
}

export type BookingIntentRow = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
  item_category: string;
  item_title: string | null;
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
  pickup_code: string | null;
  delivery_code: string | null;
  pickup_confirmed_at: string | null;
  pickup_confirmed_by: string | null;
  received_confirmed_at: string | null;
};

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

  const { data: intents, error: intentsErr } = await withTimeout(
    Promise.resolve(
      supabase
        .from('booking_intents')
        .select('*')
        .eq('initiated_by', 'sender')
        .in('traveler_trip_id', tripIds)
        .order('created_at', { ascending: false })
    ),
    8000,
    'Incoming intents'
  );
  if (intentsErr) throw intentsErr;
  if (!intents || intents.length === 0) return [];

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

  // Fire-and-forget: confirmation emails with respective codes.
  if (status === 'confirmed') {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking-confirmed-sender', bookingId: intentId }),
    }).catch((err) => {
      console.warn('[updateBookingIntentStatus] notify sender failed:', err);
    });
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking-confirmed-traveler', bookingId: intentId }),
    }).catch((err) => {
      console.warn('[updateBookingIntentStatus] notify traveler failed:', err);
    });
  }
}
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
    const travelerProfileId = trip?.user_id ?? i.traveler_user_id;
    return {
      ...i,
      traveler_trip: trip ?? null,
      traveler_profile: (travelerProfileId ? profileById.get(travelerProfileId) : null) as any,
    };
  });
}

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

// ============================================================================
// WALLET
// ============================================================================

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

export async function getWalletBalance(supabase: SB, travelerId: string): Promise<number> {
  const txs = await listWalletTransactions(supabase, travelerId);
  const incoming = txs.filter((t) => t.sender_id !== travelerId);
  const captured = incoming.filter((t) => t.payment_status === 'captured');
  const totalCents = captured.reduce((sum, t) => sum + (t.payment_amount ?? 0), 0);
  return totalCents / 100 / 1.15;
}

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

export async function cancelTrip(supabase: SB, tripId: string): Promise<void> {
  const { intents } = await countActiveBookingsForTrip(supabase, tripId);

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

  await Promise.allSettled(
    intents.map(async (intent) => {
      await supabase
        .from('booking_intents')
        .update({ status: 'cancelled' })
        .eq('id', intent.id);

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
          // Best-effort
        }
      }
    })
  );
}

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

export async function getOrCreateConversation(
  supabase: SB,
  bookingIntentId: string,
  senderId: string,
  travelerId: string
): Promise<ConversationRow> {
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

export async function listUnreadCountsByConversation(
  supabase: SB,
  userId: string
): Promise<Record<string, number>> {
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

export type ConversationListItem = {
  id: string;
  booking_intent_id: string;
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
  last_activity_at: string;
};

export async function listMyConversations(
  supabase: SB,
  userId: string
): Promise<ConversationListItem[]> {
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
  const otherUserIds = Array.from(
    new Set(
      convs.map((c: any) => (c.sender_id === userId ? c.traveler_id : c.sender_id))
    )
  );

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

  const lastMsgByConv = new Map<string, any>();
  const unreadByConv = new Map<string, number>();
  (msgs ?? []).forEach((m: any) => {
    if (!lastMsgByConv.has(m.conversation_id)) {
      lastMsgByConv.set(m.conversation_id, m);
    }
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

  items.sort(
    (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
  );
  return items;
}

export async function hasUnreadMessages(
  supabase: SB,
  userId: string
): Promise<boolean> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`sender_id.eq.${userId},traveler_id.eq.${userId}`);
  const ids = (convs ?? []).map((c: any) => c.id);
  if (ids.length === 0) return false;

  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);
  return (count ?? 0) > 0;
}

// Total number of unread messages across all of the user's conversations.
// Powers the unread badge on the navbar Messages icon.
export async function countUnreadMessages(
  supabase: SB,
  userId: string
): Promise<number> {
  const { data: convs } = await withTimeout(
    Promise.resolve(
      supabase
        .from('conversations')
        .select('id')
        .or(`sender_id.eq.${userId},traveler_id.eq.${userId}`)
    ),
    8000,
    'Unread messages count (conversations)'
  );
  const ids = (convs ?? []).map((c: any) => c.id);
  if (ids.length === 0) return 0;

  const { count } = await withTimeout(
    Promise.resolve(
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .neq('sender_id', userId)
        .is('read_at', null)
    ),
    8000,
    'Unread messages count'
  );
  return count ?? 0;
}

// ============================================================================
// Browser convenience wrappers
// ============================================================================

export const browser = {
  getProfile: (userId: string) => getProfile(getBrowserClient(), userId),
  updateProfile: (userId: string, patch: Partial<Profile>) =>
    updateProfile(getBrowserClient(), userId, patch),
  listOpenTrips: (filters?: Parameters<typeof listOpenTrips>[1]) =>
    listOpenTrips(getBrowserClient(), filters),
  listMyTrips: (userId: string) => listMyTrips(getBrowserClient(), userId),
  createTrip: (input: Parameters<typeof createTrip>[1]) =>
    createTrip(getBrowserClient(), input),
  listOpenRequests: () => listOpenRequests(getBrowserClient()),
  listOpenRequestsWithProfile: () =>
    listOpenRequestsWithProfile(getBrowserClient()),
  listMyRequests: (userId: string) => listMyRequests(getBrowserClient(), userId),
  createShippingRequest: (input: Parameters<typeof createShippingRequest>[1]) =>
    createShippingRequest(getBrowserClient(), input),
  listMyMatches: (userId: string) => listMyMatches(getBrowserClient(), userId),
  createMatch: (travelerTripId: string, shippingRequestId: string, agreedCompensation?: number) =>
    createMatch(getBrowserClient(), travelerTripId, shippingRequestId, agreedCompensation),

  listMatchingTripsForRequest: (
    pickupCity: string,
    destinationCity: string,
    desiredDeliveryDate: string,
    excludeUserId?: string | null
  ) =>
    listMatchingTripsForRequest(
      getBrowserClient(),
      pickupCity,
      destinationCity,
      desiredDeliveryDate,
      excludeUserId
    ),
  listMatchingRequestsForTrip: (
    departureCity: string,
    arrivalCity: string,
    departureDate: string,
    excludeUserId?: string | null
  ) =>
    listMatchingRequestsForTrip(
      getBrowserClient(),
      departureCity,
      arrivalCity,
      departureDate,
      excludeUserId
    ),
  listMatchingTripsForRequestBroadened: (
    pickupCountry: string,
    destinationCountry: string,
    pickupCity: string,
    destinationCity: string,
    desiredDeliveryDate: string,
    excludeUserId?: string | null
  ) =>
    listMatchingTripsForRequestBroadened(
      getBrowserClient(),
      pickupCountry,
      destinationCountry,
      pickupCity,
      destinationCity,
      desiredDeliveryDate,
      excludeUserId
    ),
  listMatchingTripsTiered: (
    pickupCountry: string,
    destinationCountry: string,
    pickupCity: string,
    destinationCity: string,
    desiredDeliveryDate: string,
    excludeUserId?: string | null
  ) =>
    listMatchingTripsTiered(
      getBrowserClient(),
      pickupCountry,
      destinationCountry,
      pickupCity,
      destinationCity,
      desiredDeliveryDate,
      excludeUserId
    ),
  listReviewsForUser: (userId: string) =>
    listReviewsForUser(getBrowserClient(), userId),
  confirmBookingReceipt: (bookingIntentId: string) =>
    confirmBookingReceipt(getBrowserClient(), bookingIntentId),
  createReview: (input: Parameters<typeof createReview>[1]) =>
    createReview(getBrowserClient(), input),
  listReviewsByBookingIds: (bookingIds: string[]) =>
    listReviewsByBookingIds(getBrowserClient(), bookingIds),

  listNotifications: (userId: string, limit?: number, before?: string) =>
    listNotifications(getBrowserClient(), userId, limit, before),
  countUnreadNotifications: (userId: string) =>
    countUnreadNotifications(getBrowserClient(), userId),
  markNotificationRead: (notificationId: string) =>
    markNotificationRead(getBrowserClient(), notificationId),
  markAllNotificationsRead: (userId: string) =>
    markAllNotificationsRead(getBrowserClient(), userId),

  getBookingStage: (bookingId: string) =>
    getBookingStage(getBrowserClient(), bookingId),
  // Handover-code confirmation now goes through server routes that verify the
  // code and write the confirmation columns with the service-role client (the
  // browser can't write them). The id args are kept for signature
  // compatibility but ignored — the server derives identity from the session.
  confirmPickupWithCode: async (
    bookingId: string,
    code: string,
    _travelerId: string
  ): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const res = await fetch('/api/booking/confirm-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, code }),
      });
      const json = await res.json().catch(() => ({}));
      return json?.ok ? { ok: true } : { ok: false, reason: json?.reason ?? 'unexpected' };
    } catch {
      return { ok: false, reason: 'unexpected' };
    }
  },
  confirmDeliveryWithCode: async (
    bookingId: string,
    code: string,
    _senderId: string
  ): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const res = await fetch('/api/confirm-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIntentId: bookingId, code }),
      });
      const json = await res.json().catch(() => ({}));
      // Success, or receipt recorded but capture pending (reconciles later) —
      // either way the handover is done from the sender's perspective.
      if (json?.ok || json?.receiptRecorded) return { ok: true };
      return { ok: false, reason: json?.reason ?? 'unexpected' };
    } catch {
      return { ok: false, reason: 'unexpected' };
    }
  },
  createDispute: (input: Parameters<typeof createDispute>[1]) =>
    createDispute(getBrowserClient(), input),
  listDisputesForUser: (userId: string) =>
    listDisputesForUser(getBrowserClient(), userId),
  getOpenDisputeForBooking: (bookingId: string, reporterId: string) =>
    getOpenDisputeForBooking(getBrowserClient(), bookingId, reporterId),

  createReport: (input: Parameters<typeof createReport>[1]) =>
    createReport(getBrowserClient(), input),
  getPublicProfile: (userId: string) =>
    getPublicProfile(getBrowserClient(), userId),
  listTripsByUser: (userId: string) =>
    listTripsByUser(getBrowserClient(), userId),

  createBookingIntent: (input: BookingIntentInput) =>
    createBookingIntent(getBrowserClient(), input),
  listIncomingBookingIntents: (travelerId: string) =>
    listIncomingBookingIntents(getBrowserClient(), travelerId),
  updateBookingIntentStatus: (intentId: string, status: 'confirmed' | 'cancelled') =>
    updateBookingIntentStatus(getBrowserClient(), intentId, status),
  listMyBookings: (senderId: string) =>
    listMyBookings(getBrowserClient(), senderId),
  listMyTravelerProposals: (travelerId: string) =>
    listMyTravelerProposals(getBrowserClient(), travelerId),
  countActiveBookingsForTrip: (tripId: string) =>
    countActiveBookingsForTrip(getBrowserClient(), tripId),
  cancelTrip: (tripId: string) => cancelTrip(getBrowserClient(), tripId),

  getWalletBalance: (travelerId: string) =>
    getWalletBalance(getBrowserClient(), travelerId),
  listWalletTransactions: (travelerId: string) =>
    listWalletTransactions(getBrowserClient(), travelerId),

  getOrCreateConversation: (bookingIntentId: string, senderId: string, travelerId: string) =>
    getOrCreateConversation(getBrowserClient(), bookingIntentId, senderId, travelerId),
  listMessages: (conversationId: string) =>
    listMessages(getBrowserClient(), conversationId),
  markMessagesRead: (conversationId: string, userId: string) =>
    markMessagesRead(getBrowserClient(), conversationId, userId),
  listUnreadCountsByConversation: (userId: string) =>
    listUnreadCountsByConversation(getBrowserClient(), userId),
  listMyConversations: (userId: string) =>
    listMyConversations(getBrowserClient(), userId),
  hasUnreadMessages: (userId: string) => hasUnreadMessages(getBrowserClient(), userId),
  countUnreadMessages: (userId: string) => countUnreadMessages(getBrowserClient(), userId),
};
