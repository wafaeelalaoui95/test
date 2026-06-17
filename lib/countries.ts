/**
 * Pays et villes — scope Jibly MVP
 *
 * Cible : transport en avion, donc on liste UNIQUEMENT les villes avec un
 * aéroport international utilisé par la diaspora. Pas de villes secondaires
 * sans hub aérien — ça pollue le dropdown sans servir personne.
 *
 * Quand on ajoutera le train/bus plus tard, on étendra avec d'autres
 * destinations.
 */

export type Country = {
  code: string;        // ISO 3166-1 alpha-2
  name_fr: string;
  flag: string;        // emoji
  cities: string[];
  // Approximate geographic centroid, used only to pre-select the closest
  // country when the user taps "Me localiser". Country-level is enough for
  // an MVP: we just need to land on the right country, the user then picks
  // their hub city from the (now short) list.
  lat: number;
  lng: number;
};

export const COUNTRIES: Country[] = [
  {
    code: 'MA',
    name_fr: 'Maroc',
    flag: '🇲🇦',
    cities: ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Oujda', 'Nador'],
    lat: 31.8, lng: -7.1,
  },
  {
    code: 'FR',
    name_fr: 'France',
    flag: '🇫🇷',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Montpellier'],
    lat: 46.6, lng: 2.5,
  },
  {
    code: 'BE',
    name_fr: 'Belgique',
    flag: '🇧🇪',
    cities: ['Bruxelles', 'Anvers', 'Charleroi', 'Liège'],
    lat: 50.6, lng: 4.6,
  },
  {
    code: 'ES',
    name_fr: 'Espagne',
    flag: '🇪🇸',
    cities: ['Madrid', 'Barcelone', 'Valence', 'Séville', 'Málaga', 'Bilbao'],
    lat: 40.2, lng: -3.7,
  },
  {
    code: 'NL',
    name_fr: 'Pays-Bas',
    flag: '🇳🇱',
    cities: ['Amsterdam', 'Rotterdam', 'Eindhoven'],
    lat: 52.2, lng: 5.3,
  },
  {
    code: 'IT',
    name_fr: 'Italie',
    flag: '🇮🇹',
    cities: ['Rome', 'Milan', 'Naples', 'Venise', 'Florence', 'Bologne'],
    lat: 42.8, lng: 12.6,
  },
  {
    code: 'DE',
    name_fr: 'Allemagne',
    flag: '🇩🇪',
    cities: ['Berlin', 'Munich', 'Hambourg', 'Francfort', 'Düsseldorf', 'Cologne', 'Stuttgart'],
    lat: 51.2, lng: 10.4,
  },
  {
    code: 'GB',
    name_fr: 'Royaume-Uni',
    flag: '🇬🇧',
    cities: ['Londres', 'Manchester', 'Birmingham', 'Édimbourg'],
    lat: 54.0, lng: -2.0,
  },
  {
    code: 'CA',
    name_fr: 'Canada',
    flag: '🇨🇦',
    cities: ['Montréal', 'Toronto', 'Vancouver', 'Calgary', 'Ottawa'],
    lat: 56.1, lng: -106.3,
  },
  {
    code: 'US',
    name_fr: 'États-Unis',
    flag: '🇺🇸',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Boston', 'Washington', 'San Francisco', 'Houston'],
    lat: 39.8, lng: -98.6,
  },
  {
    code: 'DZ',
    name_fr: 'Algérie',
    flag: '🇩🇿',
    cities: ['Alger', 'Oran', 'Constantine', 'Annaba'],
    lat: 28.0, lng: 2.6,
  },
  {
    code: 'TN',
    name_fr: 'Tunisie',
    flag: '🇹🇳',
    cities: ['Tunis', 'Sfax', 'Djerba', 'Monastir'],
    lat: 34.0, lng: 9.6,
  },
  {
    code: 'EG',
    name_fr: 'Égypte',
    flag: '🇪🇬',
    cities: ['Le Caire', 'Alexandrie', 'Charm el-Cheikh', 'Hurghada'],
    lat: 26.8, lng: 30.8,
  },
  {
    code: 'LB',
    name_fr: 'Liban',
    flag: '🇱🇧',
    cities: ['Beyrouth'],
    lat: 33.9, lng: 35.9,
  },
  {
    code: 'AE',
    name_fr: 'Émirats arabes unis',
    flag: '🇦🇪',
    cities: ['Dubaï', 'Abu Dhabi'],
    lat: 23.4, lng: 53.8,
  },
  {
    code: 'QA',
    name_fr: 'Qatar',
    flag: '🇶🇦',
    cities: ['Doha'],
    lat: 25.3, lng: 51.2,
  },
  {
    code: 'SA',
    name_fr: 'Arabie saoudite',
    flag: '🇸🇦',
    cities: ['Riyad', 'Djeddah', 'Médine'],
    lat: 23.9, lng: 45.1,
  },
];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export type CityLocation = {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  city: string;
};

export function getAllCities(): CityLocation[] {
  return COUNTRIES.flatMap((country) =>
    country.cities.map((city) => ({
      countryCode: country.code,
      countryName: country.name_fr,
      countryFlag: country.flag,
      city,
    }))
  );
}

/** Lookup a country by its French name (the value we store/display). */
export function findCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name_fr === name);
}

/** Cities of a country, looked up by French name. Empty if unknown. */
export function getCitiesForCountry(name: string): string[] {
  return findCountryByName(name)?.cities ?? [];
}

/** Great-circle distance between two GPS points (monotonic, good for ranking). */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Closest country to a GPS position (distance to centroid). Fallback for
 * "Me localiser" when no city coordinate is available.
 */
export function nearestCountry(lat: number, lng: number): Country {
  return COUNTRIES.reduce((best, c) =>
    haversine(lat, lng, c.lat, c.lng) < haversine(lat, lng, best.lat, best.lng) ? c : best
  );
}

/**
 * Approximate coordinates of each hub city, used by "Me localiser" to land on
 * the nearest airport city directly. Keyed by city name (unique across our
 * curated list). Hand-entered — accurate to ~city level, fine for ranking.
 */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  // Maroc
  Casablanca: { lat: 33.6, lng: -7.6 }, Rabat: { lat: 34.0, lng: -6.8 },
  Marrakech: { lat: 31.6, lng: -8.0 }, Tanger: { lat: 35.8, lng: -5.8 },
  'Fès': { lat: 34.0, lng: -5.0 }, Agadir: { lat: 30.4, lng: -9.6 },
  Oujda: { lat: 34.7, lng: -1.9 }, Nador: { lat: 35.2, lng: -2.9 },
  // France
  Paris: { lat: 48.9, lng: 2.4 }, Marseille: { lat: 43.3, lng: 5.4 },
  Lyon: { lat: 45.8, lng: 4.8 }, Toulouse: { lat: 43.6, lng: 1.4 },
  Nice: { lat: 43.7, lng: 7.3 }, Bordeaux: { lat: 44.8, lng: -0.6 },
  Lille: { lat: 50.6, lng: 3.1 }, Nantes: { lat: 47.2, lng: -1.6 },
  Strasbourg: { lat: 48.6, lng: 7.8 }, Montpellier: { lat: 43.6, lng: 3.9 },
  // Belgique
  Bruxelles: { lat: 50.8, lng: 4.4 }, Anvers: { lat: 51.2, lng: 4.4 },
  Charleroi: { lat: 50.4, lng: 4.4 }, 'Liège': { lat: 50.6, lng: 5.6 },
  // Espagne
  Madrid: { lat: 40.4, lng: -3.7 }, Barcelone: { lat: 41.4, lng: 2.2 },
  Valence: { lat: 39.5, lng: -0.4 }, 'Séville': { lat: 37.4, lng: -6.0 },
  'Málaga': { lat: 36.7, lng: -4.4 }, Bilbao: { lat: 43.3, lng: -2.9 },
  // Pays-Bas
  Amsterdam: { lat: 52.4, lng: 4.9 }, Rotterdam: { lat: 51.9, lng: 4.5 },
  Eindhoven: { lat: 51.4, lng: 5.5 },
  // Italie
  Rome: { lat: 41.9, lng: 12.5 }, Milan: { lat: 45.5, lng: 9.2 },
  Naples: { lat: 40.9, lng: 14.3 }, Venise: { lat: 45.4, lng: 12.3 },
  Florence: { lat: 43.8, lng: 11.3 }, Bologne: { lat: 44.5, lng: 11.3 },
  // Allemagne
  Berlin: { lat: 52.5, lng: 13.4 }, Munich: { lat: 48.1, lng: 11.6 },
  Hambourg: { lat: 53.6, lng: 10.0 }, Francfort: { lat: 50.1, lng: 8.7 },
  'Düsseldorf': { lat: 51.2, lng: 6.8 }, Cologne: { lat: 50.9, lng: 6.9 },
  Stuttgart: { lat: 48.8, lng: 9.2 },
  // Royaume-Uni
  Londres: { lat: 51.5, lng: -0.1 }, Manchester: { lat: 53.5, lng: -2.2 },
  Birmingham: { lat: 52.5, lng: -1.9 }, 'Édimbourg': { lat: 55.9, lng: -3.2 },
  // Canada
  'Montréal': { lat: 45.5, lng: -73.6 }, Toronto: { lat: 43.7, lng: -79.4 },
  Vancouver: { lat: 49.3, lng: -123.1 }, Calgary: { lat: 51.0, lng: -114.1 },
  Ottawa: { lat: 45.4, lng: -75.7 },
  // États-Unis
  'New York': { lat: 40.7, lng: -74.0 }, 'Los Angeles': { lat: 34.1, lng: -118.2 },
  Chicago: { lat: 41.9, lng: -87.6 }, Miami: { lat: 25.8, lng: -80.2 },
  Boston: { lat: 42.4, lng: -71.1 }, Washington: { lat: 38.9, lng: -77.0 },
  'San Francisco': { lat: 37.8, lng: -122.4 }, Houston: { lat: 29.8, lng: -95.4 },
  // Algérie
  Alger: { lat: 36.8, lng: 3.1 }, Oran: { lat: 35.7, lng: -0.6 },
  Constantine: { lat: 36.4, lng: 6.6 }, Annaba: { lat: 36.9, lng: 7.8 },
  // Tunisie
  Tunis: { lat: 36.8, lng: 10.2 }, Sfax: { lat: 34.7, lng: 10.8 },
  Djerba: { lat: 33.8, lng: 10.9 }, Monastir: { lat: 35.8, lng: 10.8 },
  // Égypte
  'Le Caire': { lat: 30.0, lng: 31.2 }, Alexandrie: { lat: 31.2, lng: 29.9 },
  'Charm el-Cheikh': { lat: 28.0, lng: 34.3 }, Hurghada: { lat: 27.3, lng: 33.8 },
  // Liban
  Beyrouth: { lat: 33.9, lng: 35.5 },
  // Émirats arabes unis
  'Dubaï': { lat: 25.2, lng: 55.3 }, 'Abu Dhabi': { lat: 24.5, lng: 54.4 },
  // Qatar
  Doha: { lat: 25.3, lng: 51.5 },
  // Arabie saoudite
  Riyad: { lat: 24.7, lng: 46.7 }, Djeddah: { lat: 21.5, lng: 39.2 },
  'Médine': { lat: 24.5, lng: 39.6 },
};

/**
 * Closest hub city to a GPS position. Returns null only if no city has
 * coordinates (shouldn't happen for our curated list). Used by "Me localiser".
 */
export function nearestCity(lat: number, lng: number): CityLocation | null {
  let best: CityLocation | null = null;
  let bestDist = Infinity;
  for (const loc of getAllCities()) {
    const coords = CITY_COORDS[loc.city];
    if (!coords) continue;
    const d = haversine(lat, lng, coords.lat, coords.lng);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best;
}
