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
  let q = supabase
    .from('traveler_trips')
    .select(`
      *,
      profile:profiles!traveler_trips_user_id_fkey ( id, full_name, avatar_url, verification_level, rating, trips_completed )
    `)
    .eq('status', 'open')
    .order('departure_date', { ascending: true })
    .limit(filters?.limit ?? 30);

  if (filters?.departureCity) q = q.ilike('departure_city', `%${filters.departureCity}%`);
  if (filters?.arrivalCity) q = q.ilike('arrival_city', `%${filters.arrivalCity}%`);
  if (filters?.maxDate) q = q.lte('departure_date', filters.maxDate);
  if (filters?.maxBudget != null) q = q.lte('compensation_min', filters.maxBudget);

  const { data, error } = await q;
  if (error) throw error;
  return (data as any) ?? [];
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
};
