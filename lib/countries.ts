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

/**
 * Closest country to a GPS position, by great-circle distance to the country
 * centroid. Used by the "Me localiser" shortcut. Country-level only — we don't
 * store city coordinates, so the user still picks their hub from the list.
 */
export function nearestCountry(lat: number, lng: number): Country {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const distance = (c: Country) => {
    const dLat = toRad(c.lat - lat);
    const dLng = toRad(c.lng - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(c.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return COUNTRIES.reduce((best, c) =>
    distance(c) < distance(best) ? c : best
  );
}
