import { findCountryByName } from '@/lib/countries';

// =============================================================================
// Has a trip already left?
// =============================================================================
// A trip stays listed until its departure time, then disappears from every
// public list. departure_date + flight_time are the LOCAL time at the
// departure airport, so they are read in that country's time zone — a 02:00
// departure from Dubai is 22:00 UTC the day before.
//
// A trip saved before the time became required has no flight_time: it stays
// listed until the end of its departure day.

const COUNTRY_ZONE: Record<string, string> = {
  MA: 'Africa/Casablanca', FR: 'Europe/Paris', BE: 'Europe/Brussels', ES: 'Europe/Madrid',
  NL: 'Europe/Amsterdam', IT: 'Europe/Rome', DE: 'Europe/Berlin', GB: 'Europe/London',
  PT: 'Europe/Lisbon', IE: 'Europe/Dublin', GR: 'Europe/Athens', AT: 'Europe/Vienna',
  DK: 'Europe/Copenhagen', NO: 'Europe/Oslo', SE: 'Europe/Stockholm', PL: 'Europe/Warsaw',
  HU: 'Europe/Budapest', FI: 'Europe/Helsinki', RO: 'Europe/Bucharest', CZ: 'Europe/Prague',
  BG: 'Europe/Sofia', HR: 'Europe/Zagreb', LU: 'Europe/Luxembourg', CH: 'Europe/Zurich',
  DZ: 'Africa/Algiers', TN: 'Africa/Tunis', EG: 'Africa/Cairo', LB: 'Asia/Beirut',
  AE: 'Asia/Dubai', QA: 'Asia/Qatar', SA: 'Asia/Riyadh',
};

// Countries spanning several zones: decided by the hub city.
const CITY_ZONE: Record<string, string> = {
  'Montréal': 'America/Toronto', Toronto: 'America/Toronto', Ottawa: 'America/Toronto',
  Vancouver: 'America/Vancouver', Calgary: 'America/Edmonton',
  'New York': 'America/New_York', Boston: 'America/New_York', Washington: 'America/New_York',
  Miami: 'America/New_York', Chicago: 'America/Chicago', Houston: 'America/Chicago',
  'Los Angeles': 'America/Los_Angeles', 'San Francisco': 'America/Los_Angeles',
};

function zoneFor(country?: string | null, city?: string | null): string {
  if (city && CITY_ZONE[city]) return CITY_ZONE[city];
  const code = country ? findCountryByName(country)?.code : undefined;
  return (code && COUNTRY_ZONE[code]) || 'Europe/Paris';
}

/** Minutes between UTC and `zone` at the instant `at` (positive east of UTC). */
function offsetMinutes(zone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

type TripTiming = {
  departure_date: string;
  flight_time?: string | null;
  departure_country?: string | null;
  departure_city?: string | null;
};

/** The UTC instant the trip leaves (end of day when no time was given). */
export function tripDepartureInstant(trip: TripTiming): Date {
  const [y, m, d] = trip.departure_date.slice(0, 10).split('-').map(Number);
  const [hh, mm] = trip.flight_time ? trip.flight_time.split(':').map(Number) : [23, 59];
  const wallAsUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const zone = zoneFor(trip.departure_country, trip.departure_city);
  // Two passes so a departure right after a DST change lands on the right offset.
  let instant = wallAsUtc - offsetMinutes(zone, new Date(wallAsUtc)) * 60_000;
  instant = wallAsUtc - offsetMinutes(zone, new Date(instant)) * 60_000;
  return new Date(instant);
}

export function hasTripDeparted(trip: TripTiming, now: Date = new Date()): boolean {
  if (!trip.departure_date) return false;
  return tripDepartureInstant(trip).getTime() <= now.getTime();
}

/** Drop trips that have already left. Rows without date fields pass through. */
export function withoutDepartedTrips<T>(trips: T[], now: Date = new Date()): T[] {
  return trips.filter((t) => !hasTripDeparted(t as unknown as TripTiming, now));
}

/**
 * The earliest departure_date that can still be listed anywhere in the world
 * right now (UTC today minus one day covers zones behind UTC). Use as the SQL
 * lower bound, then withoutDepartedTrips() for the exact cut.
 */
export function earliestListableDate(now: Date = new Date()): string {
  return new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
}
