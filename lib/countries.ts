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
};

export const COUNTRIES: Country[] = [
  {
    code: 'MA',
    name_fr: 'Maroc',
    flag: '🇲🇦',
    cities: ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Oujda', 'Nador'],
  },
  {
    code: 'FR',
    name_fr: 'France',
    flag: '🇫🇷',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Montpellier'],
  },
  {
    code: 'BE',
    name_fr: 'Belgique',
    flag: '🇧🇪',
    cities: ['Bruxelles', 'Anvers', 'Charleroi', 'Liège'],
  },
  {
    code: 'ES',
    name_fr: 'Espagne',
    flag: '🇪🇸',
    cities: ['Madrid', 'Barcelone', 'Valence', 'Séville', 'Málaga', 'Bilbao'],
  },
  {
    code: 'NL',
    name_fr: 'Pays-Bas',
    flag: '🇳🇱',
    cities: ['Amsterdam', 'Rotterdam', 'Eindhoven'],
  },
  {
    code: 'IT',
    name_fr: 'Italie',
    flag: '🇮🇹',
    cities: ['Rome', 'Milan', 'Naples', 'Venise', 'Florence', 'Bologne'],
  },
  {
    code: 'DE',
    name_fr: 'Allemagne',
    flag: '🇩🇪',
    cities: ['Berlin', 'Munich', 'Hambourg', 'Francfort', 'Düsseldorf', 'Cologne', 'Stuttgart'],
  },
  {
    code: 'GB',
    name_fr: 'Royaume-Uni',
    flag: '🇬🇧',
    cities: ['Londres', 'Manchester', 'Birmingham', 'Édimbourg'],
  },
  {
    code: 'CA',
    name_fr: 'Canada',
    flag: '🇨🇦',
    cities: ['Montréal', 'Toronto', 'Vancouver', 'Calgary', 'Ottawa'],
  },
  {
    code: 'US',
    name_fr: 'États-Unis',
    flag: '🇺🇸',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Boston', 'Washington', 'San Francisco', 'Houston'],
  },
  {
    code: 'DZ',
    name_fr: 'Algérie',
    flag: '🇩🇿',
    cities: ['Alger', 'Oran', 'Constantine', 'Annaba'],
  },
  {
    code: 'TN',
    name_fr: 'Tunisie',
    flag: '🇹🇳',
    cities: ['Tunis', 'Sfax', 'Djerba', 'Monastir'],
  },
  {
    code: 'EG',
    name_fr: 'Égypte',
    flag: '🇪🇬',
    cities: ['Le Caire', 'Alexandrie', 'Charm el-Cheikh', 'Hurghada'],
  },
  {
    code: 'LB',
    name_fr: 'Liban',
    flag: '🇱🇧',
    cities: ['Beyrouth'],
  },
  {
    code: 'AE',
    name_fr: 'Émirats arabes unis',
    flag: '🇦🇪',
    cities: ['Dubaï', 'Abu Dhabi'],
  },
  {
    code: 'QA',
    name_fr: 'Qatar',
    flag: '🇶🇦',
    cities: ['Doha'],
  },
  {
    code: 'SA',
    name_fr: 'Arabie saoudite',
    flag: '🇸🇦',
    cities: ['Riyad', 'Djeddah', 'Médine'],
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
