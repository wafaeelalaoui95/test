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
// Keep in sync with lib/types/index.ts. The Supabase typings layer needs
// the same union or the createShippingRequest call site won't compile.
export type ItemCategory =
  | 'documents'
  | 'cles'
  | 'petits_objets'
  | 'vetements'
  | 'electronique'
  | 'otc';
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
  // Stripe Identity verification — null if never started. Set by the
  // webhook /api/identity/webhook.
  identity_verification_id: string | null;
  identity_verification_status: string | null; // 'processing' | 'verified' | 'requires_input' | 'canceled'
  identity_verified_at: string | null;
  // Set when the user anonymises their account (soft delete). NULL = active.
  deleted_at: string | null;
  // Stripe Connect (Express) payout account. Null for anyone who has never
  // travelled — senders never need one. The two flags are mirrored from Stripe
  // by /api/stripe/webhook on account.updated, and are revoked from the client
  // role so a user cannot mark themselves payable.
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_onboarded_at?: string | null;
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
  notes: string | null;
  status: TripStatus;
  created_at: string;
  // Flight details — surfaced on the boarding-pass card in /me and used
  // by the matching screens. Nullable: flight_number is required at
  // creation in the new flow, but legacy trips may not have one.
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  // Audit / persistence: accepted categories in a queryable column (also kept
  // as JSON in `notes` for backward-compatible reads), and a timestamp proving
  // the traveler ticked the terms box at creation. Optional so legacy rows and
  // other insert paths don't need to set them.
  accepted_categories?: string[] | null;
  terms_agreed_at?: string | null;
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
  // Who collects the parcel at the destination. null = the sender themselves;
  // a name = a third party the traveler hands it to.
  recipient_name: string | null;
  desired_delivery_date: string;
  budget: number;
  weight_kg: number | null;
  urgency_level: Urgency;
  prescription_url: string | null;
  status: RequestStatus;
  created_at: string;
  // Timestamp proving the sender ticked the terms box when posting the request.
  terms_agreed_at?: string | null;
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
