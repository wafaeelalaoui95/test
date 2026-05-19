import type { ItemCategory, Urgency, AvailableSpace } from '@/lib/types';
import type { Translations } from '@/lib/i18n/translations';

export const ITEM_CATEGORIES: {
  value: ItemCategory;
  labelKey: keyof Translations;
  descKey: keyof Translations;
  icon: string;
}[] = [
  { value: 'documents', labelKey: 'cat_documents', descKey: 'cat_documents_desc', icon: '📄' },
  { value: 'cles', labelKey: 'cat_keys', descKey: 'cat_keys_desc', icon: '🔑' },
  { value: 'medicaments', labelKey: 'cat_medication', descKey: 'cat_medication_desc', icon: '💊' },
  { value: 'petits_objets', labelKey: 'cat_small', descKey: 'cat_small_desc', icon: '🎁' },
];

export const FORBIDDEN_CATEGORIES = [
  'Nourriture',
  'Alcool',
  'Luxe',
  'Cash',
  'Bijoux',
  'Électronique',
  'Substances illégales',
  'Armes',
  'Contrefaçons',
  'Commerce',
];

export const URGENCY_LEVELS: {
  value: Urgency;
  labelKey: keyof Translations;
  hintKey: keyof Translations;
}[] = [
  { value: 'standard', labelKey: 'urgency_standard', hintKey: 'urgency_standard_hint' },
  { value: 'rapide', labelKey: 'urgency_fast', hintKey: 'urgency_fast_hint' },
  { value: 'urgent', labelKey: 'urgency_urgent', hintKey: 'urgency_urgent_hint' },
];

export const SPACE_OPTIONS: {
  value: AvailableSpace;
  labelKey: keyof Translations;
  sizeKey: keyof Translations;
  icon: string;
}[] = [
  { value: 'enveloppe', labelKey: 'space_envelope', sizeKey: 'space_envelope_size', icon: '✉️' },
  { value: 'pochette', labelKey: 'space_pouch', sizeKey: 'space_pouch_size', icon: '👝' },
  { value: 'petit_sac', labelKey: 'space_bag', sizeKey: 'space_bag_size', icon: '🎒' },
];

// Demo data — travelers (international)
// Note: travelers only set minimum compensation; no max.
export const DEMO_TRAVELERS = [
  {
    id: 't1',
    name: 'Yasmine B.',
    avatar: 'YB',
    avatar_color: 'lavender',
    departure_country: 'France',
    departure_flag: '🇫🇷',
    departure_city: 'Paris',
    arrival_country: 'Maroc',
    arrival_flag: '🇲🇦',
    arrival_city: 'Casablanca',
    travel_date: '2026-06-04',
    flight_time: '14:30',
    available_space: 'enveloppe' as AvailableSpace,
    compensation_min: 15,
    verification_level: 'id_verified' as const,
    rating: 4.9,
    trips_completed: 12,
    bio: 'Étudiante, je rentre voir ma famille chaque mois.',
  },
  {
    id: 't2',
    name: 'Mehdi A.',
    avatar: 'MA',
    avatar_color: 'butter',
    departure_country: 'Belgique',
    departure_flag: '🇧🇪',
    departure_city: 'Bruxelles',
    arrival_country: 'Maroc',
    arrival_flag: '🇲🇦',
    arrival_city: 'Rabat',
    travel_date: '2026-06-02',
    flight_time: '09:15',
    available_space: 'pochette' as AvailableSpace,
    compensation_min: 20,
    verification_level: 'trusted' as const,
    rating: 5.0,
    trips_completed: 27,
    bio: 'Consultant, trajets réguliers.',
  },
  {
    id: 't3',
    name: 'Sophie L.',
    avatar: 'SL',
    avatar_color: 'mint',
    departure_country: 'France',
    departure_flag: '🇫🇷',
    departure_city: 'Marseille',
    arrival_country: 'Maroc',
    arrival_flag: '🇲🇦',
    arrival_city: 'Marrakech',
    travel_date: '2026-06-07',
    flight_time: '18:45',
    available_space: 'petit_sac' as AvailableSpace,
    compensation_min: 25,
    verification_level: 'id_verified' as const,
    rating: 4.8,
    trips_completed: 8,
    bio: 'Architecte, projet de rénovation.',
  },
  {
    id: 't4',
    name: 'Karim T.',
    avatar: 'KT',
    avatar_color: 'sky',
    departure_country: 'Espagne',
    departure_flag: '🇪🇸',
    departure_city: 'Madrid',
    arrival_country: 'Maroc',
    arrival_flag: '🇲🇦',
    arrival_city: 'Tanger',
    travel_date: '2026-06-09',
    flight_time: '07:00',
    available_space: 'enveloppe' as AvailableSpace,
    compensation_min: 15,
    verification_level: 'email' as const,
    rating: 4.7,
    trips_completed: 4,
    bio: 'Photographe, déplacements pro.',
  },
  {
    id: 't5',
    name: 'Amélie R.',
    avatar: 'AR',
    avatar_color: 'blush',
    departure_country: 'Canada',
    departure_flag: '🇨🇦',
    departure_city: 'Montréal',
    arrival_country: 'France',
    arrival_flag: '🇫🇷',
    arrival_city: 'Paris',
    travel_date: '2026-06-12',
    flight_time: '22:00',
    available_space: 'pochette' as AvailableSpace,
    compensation_min: 30,
    verification_level: 'trusted' as const,
    rating: 4.95,
    trips_completed: 19,
    bio: 'Doctorante, allers-retours fréquents.',
  },
  {
    id: 't6',
    name: 'Hamza K.',
    avatar: 'HK',
    avatar_color: 'lavender',
    departure_country: 'Pays-Bas',
    departure_flag: '🇳🇱',
    departure_city: 'Amsterdam',
    arrival_country: 'Maroc',
    arrival_flag: '🇲🇦',
    arrival_city: 'Casablanca',
    travel_date: '2026-06-14',
    flight_time: '11:30',
    available_space: 'petit_sac' as AvailableSpace,
    compensation_min: 25,
    verification_level: 'id_verified' as const,
    rating: 4.85,
    trips_completed: 11,
    bio: 'Designer, je rentre voir mes parents.',
  },
];

