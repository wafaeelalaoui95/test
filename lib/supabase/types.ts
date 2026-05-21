/**
 * Hand-written types matching schema.sql.
 *
 * For pragmatic MVP we don't expose a fully typed Supabase generic; the queries
 * file casts results to these types. This avoids fighting the postgres-js
 * generic type inference for `update` / `insert`. If you want full typing later,
 * regenerate with the Supabase CLI:
 *   supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 */

export type VerificationLevel = 'none' | 'email' | 'id_verified' | 'trusted';
export type ItemCategory = 'documents' | 'cles' | 'medicaments' | 'petits_objets';
export type Urgency = 'standard' | 'rapide' | 'urgent';
export type AvailableSpace = 'enveloppe' | 'pochette' | 'petit_sac';

export type TripStatus = 'draft' | 'open' | 'matched' | 'in_transit' | 'completed' | 'cancelled';
export type RequestStatus = 'draft' | 'pending' | 'matched' | 'in_transit' | 'delivered' | 'cancelled' | 'flagged';
export type MatchStatus = 'proposed' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  verification_level: VerificationLevel;
  rating: number;
  trips_completed: number;
  created_at: string;
  updated_at: string;
}

export interface TravelerTripRow {
  id: string;
  user_id: string;
  departure_country: string;
  departure_city: string;
  arrival_country: string;
  arrival_city: string;
  departure_date: string;
  arrival_date: string | null;
  compensation_min: number;
  compensation_max: number | null;
  available_weight_kg: number | null;
  available_space: AvailableSpace;
  flight_time: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  notes: string | null;
  status: TripStatus;
  created_at: string;
}

export interface ShippingRequestRow {
  id: string;
  user_id: string;
  item_title: string | null;
  item_category: ItemCategory;
  item_description: string;
  pickup_country: string;
  pickup_city: string;
  destination_country: string;
  destination_city: string;
  desired_delivery_date: string;
  budget: number;
  weight_kg: number | null;
  urgency_level: Urgency;
  prescription_url: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface MatchRow {
  id: string;
  traveler_trip_id: string;
  shipping_request_id: string;
  status: MatchStatus;
  agreed_compensation: number | null;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  match_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  target_type: 'user' | 'shipping_request' | 'traveler_trip' | 'message';
  target_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}

/**
 * Untyped Database — we cast in query helpers. Simpler than fighting the
 * SupabaseClient generics for an MVP.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
