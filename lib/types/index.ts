// Core domain types mirroring the Supabase schema.
// Kept here so the app compiles even before Supabase is wired up.

// City and country are flexible strings to support any worldwide location.
// The COUNTRIES dataset in lib/countries.ts provides the curated selection.
export type City = string;
export type CountryCode = string;

export type ItemCategory =
  | 'documents'
  | 'cles'
  | 'medicaments'
  | 'petits_objets';

export type Urgency = 'standard' | 'rapide' | 'urgent';

export type AvailableSpace = 'enveloppe' | 'pochette' | 'petit_sac';

export type VerificationLevel = 'none' | 'email' | 'id_verified' | 'trusted';

export type RequestStatus =
  | 'draft'
  | 'pending'
  | 'matched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'flagged';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  verification_level: VerificationLevel;
  rating: number;
  trips_completed: number;
  created_at: string;
}

export interface SenderRequest {
  id: string;
  user_id: string;
  departure_country: CountryCode;
  departure_city: City;
  arrival_country: CountryCode;
  arrival_city: City;
  desired_delivery_date: string;
  category: ItemCategory;
  description: string;
  urgency: Urgency;
  compensation_budget: number; // in EUR
  prescription_url?: string;
  terms_accepted: boolean;
  status: RequestStatus;
  created_at: string;
}

export interface TravelerTrip {
  id: string;
  user_id: string;
  departure_country: CountryCode;
  departure_city: City;
  arrival_country: CountryCode;
  arrival_city: City;
  travel_date: string;
  flight_time?: string;
  available_space: AvailableSpace;
  // Travelers set the minimum compensation they accept.
  // Senders can propose more in their request budget.
  compensation_min: number;
  compensation_max?: number; // deprecated, kept optional for backward compat
  id_verified: boolean;
  responsibility_accepted: boolean;
  status: RequestStatus;
  created_at: string;
}

export interface Match {
  id: string;
  sender_request_id: string;
  traveler_trip_id: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'completed';
  agreed_compensation?: number;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'sender_request' | 'traveler_trip' | 'user';
  target_id: string;
  reason: string;
  details?: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}
