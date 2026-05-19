/**
 * Pays et villes — scope diaspora marocaine
 *
 * Sélection optimisée pour le lancement Jibly.
 * Pays choisis selon la présence de la diaspora marocaine + flux Maroc principaux.
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
    cities: [
      'Casablanca',
      'Rabat',
      'Marrakech',
      'Tanger',
      'Fès',
      'Agadir',
      'Oujda',
      'Tétouan',
      'Nador',
      'Kénitra',
      'Salé',
      'Meknès',
      'Al Hoceïma',
      'Beni Mellal',
      'Essaouira',
      'Ouarzazate',
      'Errachidia',
      'Laâyoune',
    ],
  },
  {
    code: 'FR',
    name_fr: 'France',
    flag: '🇫🇷',
    cities: [
      'Paris',
      'Marseille',
      'Lyon',
      'Toulouse',
      'Nice',
      'Bordeaux',
      'Lille',
      'Nantes',
      'Strasbourg',
      'Montpellier',
      'Rennes',
      'Grenoble',
      'Aix-en-Provence',
      'Nîmes',
      'Saint-Étienne',
      'Le Havre',
      'Tours',
      'Reims',
    ],
  },
  {
    code: 'BE',
    name_fr: 'Belgique',
    flag: '🇧🇪',
    cities: [
      'Bruxelles',
      'Anvers',
      'Liège',
      'Gand',
      'Charleroi',
      'Namur',
      'Mons',
      'Bruges',
      'Louvain',
    ],
  },
  {
    code: 'ES',
    name_fr: 'Espagne',
    flag: '🇪🇸',
    cities: [
      'Madrid',
      'Barcelone',
      'Valence',
      'Séville',
      'Málaga',
      'Bilbao',
      'Saragosse',
      'Murcie',
      'Grenade',
      'Alicante',
    ],
  },
  {
    code: 'NL',
    name_fr: 'Pays-Bas',
    flag: '🇳🇱',
    cities: [
      'Amsterdam',
      'Rotterdam',
      'La Haye',
      'Utrecht',
      'Eindhoven',
      'Groningue',
      'Tilbourg',
    ],
  },
  {
    code: 'IT',
    name_fr: 'Italie',
    flag: '🇮🇹',
    cities: [
      'Rome',
      'Milan',
      'Naples',
      'Turin',
      'Bologne',
      'Florence',
      'Venise',
      'Gênes',
      'Palerme',
      'Vérone',
    ],
  },
  {
    code: 'DE',
    name_fr: 'Allemagne',
    flag: '🇩🇪',
    cities: [
      'Berlin',
      'Munich',
      'Hambourg',
      'Francfort',
      'Cologne',
      'Stuttgart',
      'Düsseldorf',
      'Leipzig',
    ],
  },
  {
    code: 'GB',
    name_fr: 'Royaume-Uni',
    flag: '🇬🇧',
    cities: [
      'Londres',
      'Manchester',
      'Birmingham',
      'Liverpool',
      'Édimbourg',
      'Glasgow',
      'Leeds',
      'Bristol',
    ],
  },
  {
    code: 'CA',
    name_fr: 'Canada',
    flag: '🇨🇦',
    cities: [
      'Montréal',
      'Toronto',
      'Vancouver',
      'Ottawa',
      'Québec',
      'Calgary',
      'Edmonton',
    ],
  },
  {
    code: 'US',
    name_fr: 'États-Unis',
    flag: '🇺🇸',
    cities: [
      'New York',
      'Los Angeles',
      'Chicago',
      'Miami',
      'Boston',
      'Washington',
      'San Francisco',
      'Houston',
    ],
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
