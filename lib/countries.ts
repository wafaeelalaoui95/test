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
  name_en: string;     // display name for the English locale
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
    name_en: 'Morocco',
    flag: '🇲🇦',
    cities: ['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Oujda', 'Nador'],
    lat: 31.8, lng: -7.1,
  },
  {
    code: 'FR',
    name_fr: 'France',
    name_en: 'France',
    flag: '🇫🇷',
    cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Montpellier'],
    lat: 46.6, lng: 2.5,
  },
  {
    code: 'BE',
    name_fr: 'Belgique',
    name_en: 'Belgium',
    flag: '🇧🇪',
    cities: ['Bruxelles', 'Anvers', 'Charleroi', 'Liège'],
    lat: 50.6, lng: 4.6,
  },
  {
    code: 'ES',
    name_fr: 'Espagne',
    name_en: 'Spain',
    flag: '🇪🇸',
    cities: ['Madrid', 'Barcelone', 'Valence', 'Séville', 'Málaga', 'Bilbao'],
    lat: 40.2, lng: -3.7,
  },
  {
    code: 'NL',
    name_fr: 'Pays-Bas',
    name_en: 'Netherlands',
    flag: '🇳🇱',
    cities: ['Amsterdam', 'Rotterdam', 'Eindhoven'],
    lat: 52.2, lng: 5.3,
  },
  {
    code: 'IT',
    name_fr: 'Italie',
    name_en: 'Italy',
    flag: '🇮🇹',
    cities: ['Rome', 'Milan', 'Naples', 'Venise', 'Florence', 'Bologne', 'Vérone'],
    lat: 42.8, lng: 12.6,
  },
  {
    code: 'DE',
    name_fr: 'Allemagne',
    name_en: 'Germany',
    flag: '🇩🇪',
    cities: ['Berlin', 'Munich', 'Hambourg', 'Francfort', 'Düsseldorf', 'Cologne', 'Stuttgart'],
    lat: 51.2, lng: 10.4,
  },
  {
    code: 'GB',
    name_fr: 'Royaume-Uni',
    name_en: 'United Kingdom',
    flag: '🇬🇧',
    cities: ['Londres', 'Manchester', 'Birmingham', 'Édimbourg'],
    lat: 54.0, lng: -2.0,
  },
  { code: 'PT', name_fr: 'Portugal', name_en: 'Portugal', flag: '🇵🇹', cities: ['Lisbonne'], lat: 39.6, lng: -8.0 },
  { code: 'IE', name_fr: 'Irlande', name_en: 'Ireland', flag: '🇮🇪', cities: ['Dublin'], lat: 53.2, lng: -8.0 },
  { code: 'GR', name_fr: 'Grèce', name_en: 'Greece', flag: '🇬🇷', cities: ['Athènes'], lat: 39.1, lng: 22.0 },
  { code: 'AT', name_fr: 'Autriche', name_en: 'Austria', flag: '🇦🇹', cities: ['Vienne'], lat: 47.6, lng: 14.1 },
  { code: 'DK', name_fr: 'Danemark', name_en: 'Denmark', flag: '🇩🇰', cities: ['Copenhague'], lat: 56.0, lng: 10.0 },
  { code: 'NO', name_fr: 'Norvège', name_en: 'Norway', flag: '🇳🇴', cities: ['Oslo'], lat: 61.0, lng: 9.0 },
  { code: 'SE', name_fr: 'Suède', name_en: 'Sweden', flag: '🇸🇪', cities: ['Stockholm'], lat: 62.0, lng: 15.0 },
  { code: 'PL', name_fr: 'Pologne', name_en: 'Poland', flag: '🇵🇱', cities: ['Varsovie'], lat: 52.0, lng: 19.4 },
  { code: 'HU', name_fr: 'Hongrie', name_en: 'Hungary', flag: '🇭🇺', cities: ['Budapest'], lat: 47.2, lng: 19.5 },
  { code: 'FI', name_fr: 'Finlande', name_en: 'Finland', flag: '🇫🇮', cities: ['Helsinki'], lat: 64.0, lng: 26.0 },
  { code: 'RO', name_fr: 'Roumanie', name_en: 'Romania', flag: '🇷🇴', cities: ['Bucarest'], lat: 45.9, lng: 25.0 },
  { code: 'CZ', name_fr: 'République tchèque', name_en: 'Czech Republic', flag: '🇨🇿', cities: ['Prague'], lat: 49.8, lng: 15.5 },
  { code: 'BG', name_fr: 'Bulgarie', name_en: 'Bulgaria', flag: '🇧🇬', cities: ['Sofia'], lat: 42.7, lng: 25.5 },
  { code: 'HR', name_fr: 'Croatie', name_en: 'Croatia', flag: '🇭🇷', cities: ['Zagreb'], lat: 45.1, lng: 15.2 },
  { code: 'LU', name_fr: 'Luxembourg', name_en: 'Luxembourg', flag: '🇱🇺', cities: ['Luxembourg'], lat: 49.8, lng: 6.1 },
  { code: 'CH', name_fr: 'Suisse', name_en: 'Switzerland', flag: '🇨🇭', cities: ['Genève', 'Zurich', 'Bâle'], lat: 46.8, lng: 8.2 },
  {
    code: 'CA',
    name_fr: 'Canada',
    name_en: 'Canada',
    flag: '🇨🇦',
    cities: ['Montréal', 'Toronto', 'Vancouver', 'Calgary', 'Ottawa'],
    lat: 56.1, lng: -106.3,
  },
  {
    code: 'US',
    name_fr: 'États-Unis',
    name_en: 'United States',
    flag: '🇺🇸',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Boston', 'Washington', 'San Francisco', 'Houston'],
    lat: 39.8, lng: -98.6,
  },
  {
    code: 'DZ',
    name_fr: 'Algérie',
    name_en: 'Algeria',
    flag: '🇩🇿',
    cities: ['Alger', 'Oran', 'Constantine', 'Annaba'],
    lat: 28.0, lng: 2.6,
  },
  {
    code: 'TN',
    name_fr: 'Tunisie',
    name_en: 'Tunisia',
    flag: '🇹🇳',
    cities: ['Tunis', 'Sfax', 'Djerba', 'Monastir'],
    lat: 34.0, lng: 9.6,
  },
  {
    code: 'EG',
    name_fr: 'Égypte',
    name_en: 'Egypt',
    flag: '🇪🇬',
    cities: ['Le Caire', 'Alexandrie', 'Charm el-Cheikh', 'Hurghada'],
    lat: 26.8, lng: 30.8,
  },
  {
    code: 'LB',
    name_fr: 'Liban',
    name_en: 'Lebanon',
    flag: '🇱🇧',
    cities: ['Beyrouth'],
    lat: 33.9, lng: 35.9,
  },
  {
    code: 'AE',
    name_fr: 'Émirats arabes unis',
    name_en: 'United Arab Emirates',
    flag: '🇦🇪',
    cities: ['Dubaï', 'Abu Dhabi'],
    lat: 23.4, lng: 53.8,
  },
  {
    code: 'QA',
    name_fr: 'Qatar',
    name_en: 'Qatar',
    flag: '🇶🇦',
    cities: ['Doha'],
    lat: 25.3, lng: 51.2,
  },
  {
    code: 'SA',
    name_fr: 'Arabie saoudite',
    name_en: 'Saudi Arabia',
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

/**
 * Lookup a country by name. We always STORE the French name (it's the
 * canonical value used by the matching queries), but we accept the English
 * name too so display/search work in either locale.
 */
export function findCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name_fr === name || c.name_en === name);
}

/**
 * Localised country name for display. `value` is the stored (French) name;
 * we return the English label when the locale is 'en'. Unknown/freeform
 * countries are returned unchanged.
 */
export function countryDisplayName(value: string, locale: string): string {
  const c = findCountryByName(value);
  if (!c) return value;
  if (locale === 'fr') return c.name_fr;
  if (locale === 'en') return c.name_en;
  // Other UI languages: the browser's own country names, keyed by ISO code.
  return regionName(c.code, locale) ?? c.name_en;
}

const regionNames = new Map<string, Intl.DisplayNames | null>();
function regionName(code: string, locale: string): string | undefined {
  if (!regionNames.has(locale)) {
    try {
      regionNames.set(locale, new Intl.DisplayNames([locale], { type: 'region' }));
    } catch {
      regionNames.set(locale, null);
    }
  }
  return regionNames.get(locale)?.of(code) ?? undefined;
}

/**
 * English display names for the curated hub cities whose English spelling
 * differs from the stored French one. Cities not listed here are identical
 * in both languages (Paris, Madrid, Doha…) and fall through unchanged.
 * The KEY is the canonical (stored) French name — never change those, the
 * matching queries depend on them.
 */
const CITY_EN: Record<string, string> = {
  // Maroc
  Marrakech: 'Marrakesh', Tanger: 'Tangier', 'Fès': 'Fez',
  // Belgique
  Bruxelles: 'Brussels', Anvers: 'Antwerp',
  // Espagne
  Barcelone: 'Barcelona', Valence: 'Valencia', 'Séville': 'Seville', 'Málaga': 'Malaga',
  // Italie
  Venise: 'Venice', Bologne: 'Bologna', 'Vérone': 'Verona',
  // Allemagne
  Hambourg: 'Hamburg', Francfort: 'Frankfurt',
  // Royaume-Uni
  Londres: 'London', 'Édimbourg': 'Edinburgh',
  // Autres capitales européennes
  Lisbonne: 'Lisbon', 'Athènes': 'Athens', Vienne: 'Vienna', Copenhague: 'Copenhagen',
  Varsovie: 'Warsaw', Bucarest: 'Bucharest',
  // Suisse
  'Genève': 'Geneva', 'Bâle': 'Basel',
  // Canada
  'Montréal': 'Montreal',
  // Algérie
  Alger: 'Algiers',
  // Égypte
  'Le Caire': 'Cairo', Alexandrie: 'Alexandria', 'Charm el-Cheikh': 'Sharm El Sheikh',
  // Liban
  Beyrouth: 'Beirut',
  // Émirats
  'Dubaï': 'Dubai',
  // Arabie saoudite
  Djeddah: 'Jeddah', 'Médine': 'Medina', Riyad: 'Riyadh',
};

/**
 * Localised city name for display. `value` is the stored (French) city name;
 * returns the English spelling when locale is 'en', otherwise the value as-is.
 */
export function cityDisplayName(value: string, locale: string): string {
  if (locale === 'fr') return value;
  if (locale === 'en') return CITY_EN[value] ?? value;
  return CITY_L10N[locale]?.[value] ?? CITY_EN[value] ?? value;
}

/**
 * Spanish, German and Dutch spellings, same rule as CITY_EN: keyed by the
 * stored French name, only where the spelling differs. Anything missing
 * falls back to the English spelling, then to the stored name.
 */
const CITY_L10N: Record<string, Record<string, string>> = {
  es: {
    Paris: 'París', Marseille: 'Marsella', Nice: 'Niza', Bordeaux: 'Burdeos', Strasbourg: 'Estrasburgo',
    Marrakech: 'Marrakech', Tanger: 'Tánger', 'Fès': 'Fez', Oujda: 'Uchda',
    Bruxelles: 'Bruselas', Anvers: 'Amberes', 'Liège': 'Lieja',
    Barcelone: 'Barcelona', Valence: 'Valencia', 'Séville': 'Sevilla', 'Málaga': 'Málaga',
    Amsterdam: 'Ámsterdam', Rotterdam: 'Róterdam',
    Rome: 'Roma', Milan: 'Milán', Naples: 'Nápoles', Venise: 'Venecia', Florence: 'Florencia', Bologne: 'Bolonia', 'Vérone': 'Verona',
    Munich: 'Múnich', Hambourg: 'Hamburgo', Francfort: 'Fráncfort', Cologne: 'Colonia',
    Londres: 'Londres', 'Édimbourg': 'Edimburgo',
    Lisbonne: 'Lisboa', Dublin: 'Dublín', 'Athènes': 'Atenas', Vienne: 'Viena', Copenhague: 'Copenhague',
    Stockholm: 'Estocolmo', Varsovie: 'Varsovia', Bucarest: 'Bucarest', Prague: 'Praga', Sofia: 'Sofía',
    Luxembourg: 'Luxemburgo', 'Genève': 'Ginebra', Zurich: 'Zúrich', 'Bâle': 'Basilea',
    'Montréal': 'Montreal', 'New York': 'Nueva York',
    Alger: 'Argel', Oran: 'Orán', Constantine: 'Constantina', Tunis: 'Túnez', Djerba: 'Yerba',
    'Le Caire': 'El Cairo', Alexandrie: 'Alejandría', 'Charm el-Cheikh': 'Sharm el-Sheij',
    Beyrouth: 'Beirut', 'Dubaï': 'Dubái', 'Abu Dhabi': 'Abu Dabi',
    Riyad: 'Riad', Djeddah: 'Yeda', 'Médine': 'Medina',
  },
  de: {
    Nice: 'Nizza', Strasbourg: 'Straßburg',
    Marrakech: 'Marrakesch', Tanger: 'Tanger', 'Fès': 'Fès',
    Bruxelles: 'Brüssel', Anvers: 'Antwerpen', 'Liège': 'Lüttich',
    Barcelone: 'Barcelona', Valence: 'Valencia', 'Séville': 'Sevilla', 'Málaga': 'Málaga',
    Rome: 'Rom', Milan: 'Mailand', Naples: 'Neapel', Venise: 'Venedig', Florence: 'Florenz', Bologne: 'Bologna', 'Vérone': 'Verona',
    Munich: 'München', Hambourg: 'Hamburg', Francfort: 'Frankfurt', Cologne: 'Köln',
    Londres: 'London', 'Édimbourg': 'Edinburgh',
    Lisbonne: 'Lissabon', 'Athènes': 'Athen', Vienne: 'Wien', Copenhague: 'Kopenhagen',
    Varsovie: 'Warschau', Bucarest: 'Bukarest', Prague: 'Prag',
    Luxembourg: 'Luxemburg', 'Genève': 'Genf', Zurich: 'Zürich', 'Bâle': 'Basel',
    'Montréal': 'Montreal',
    Alger: 'Algier', 'Le Caire': 'Kairo', Alexandrie: 'Alexandria', 'Charm el-Cheikh': 'Scharm el-Scheich',
    Beyrouth: 'Beirut', 'Dubaï': 'Dubai',
    Riyad: 'Riad', Djeddah: 'Dschidda', 'Médine': 'Medina',
  },
  nl: {
    Strasbourg: 'Straatsburg',
    Marrakech: 'Marrakesh', Tanger: 'Tanger', 'Fès': 'Fez',
    Bruxelles: 'Brussel', Anvers: 'Antwerpen', 'Liège': 'Luik',
    Barcelone: 'Barcelona', Valence: 'Valencia', 'Séville': 'Sevilla', 'Málaga': 'Málaga',
    Rome: 'Rome', Milan: 'Milaan', Naples: 'Napels', Venise: 'Venetië', Florence: 'Florence', Bologne: 'Bologna', 'Vérone': 'Verona',
    Munich: 'München', Hambourg: 'Hamburg', Francfort: 'Frankfurt', Cologne: 'Keulen',
    Londres: 'Londen', 'Édimbourg': 'Edinburgh',
    Lisbonne: 'Lissabon', 'Athènes': 'Athene', Vienne: 'Wenen', Copenhague: 'Kopenhagen',
    Varsovie: 'Warschau', Bucarest: 'Boekarest', Prague: 'Praag',
    Luxembourg: 'Luxemburg', 'Genève': 'Genève', Zurich: 'Zürich', 'Bâle': 'Bazel',
    'Montréal': 'Montreal',
    Alger: 'Algiers', 'Le Caire': 'Caïro', Alexandrie: 'Alexandrië', 'Charm el-Cheikh': 'Sharm-el-Sheikh',
    Beyrouth: 'Beiroet', 'Dubaï': 'Dubai',
    Riyad: 'Riyad', Djeddah: 'Djedda', 'Médine': 'Medina',
  },
  // Italian and Portuguese: same rule. Some entries repeat the stored name
  // (Bruxelles, Londres…) only to stop the English fallback from kicking in.
  it: {
    Paris: 'Parigi', Marseille: 'Marsiglia', Lyon: 'Lione', Toulouse: 'Tolosa', Nice: 'Nizza', Strasbourg: 'Strasburgo',
    Marrakech: 'Marrakech', Tanger: 'Tangeri', 'Fès': 'Fès',
    Bruxelles: 'Bruxelles', Anvers: 'Anversa', 'Liège': 'Liegi',
    Barcelone: 'Barcellona', Valence: 'Valencia', 'Séville': 'Siviglia', 'Málaga': 'Malaga',
    Rome: 'Roma', Milan: 'Milano', Naples: 'Napoli', Venise: 'Venezia', Florence: 'Firenze', Bologne: 'Bologna', 'Vérone': 'Verona',
    Munich: 'Monaco di Baviera', Hambourg: 'Amburgo', Francfort: 'Francoforte', Cologne: 'Colonia', Stuttgart: 'Stoccarda',
    Londres: 'Londra', 'Édimbourg': 'Edimburgo',
    Lisbonne: 'Lisbona', Dublin: 'Dublino', 'Athènes': 'Atene', Vienne: 'Vienna', Copenhague: 'Copenaghen',
    Stockholm: 'Stoccolma', Varsovie: 'Varsavia', Bucarest: 'Bucarest', Prague: 'Praga', Zagreb: 'Zagabria',
    Luxembourg: 'Lussemburgo', 'Genève': 'Ginevra', Zurich: 'Zurigo', 'Bâle': 'Basilea',
    'Montréal': 'Montréal',
    Alger: 'Algeri', Oran: 'Orano', Constantine: 'Costantina', Tunis: 'Tunisi', Djerba: 'Gerba',
    'Le Caire': 'Il Cairo', Alexandrie: 'Alessandria d’Egitto', 'Charm el-Cheikh': 'Sharm el-Sheikh',
    Beyrouth: 'Beirut', 'Dubaï': 'Dubai',
    Riyad: 'Riad', Djeddah: 'Gedda', 'Médine': 'Medina',
  },
  pt: {
    Marseille: 'Marselha', Bordeaux: 'Bordéus', Strasbourg: 'Estrasburgo',
    Marrakech: 'Marraquexe', Tanger: 'Tânger', 'Fès': 'Fez',
    Bruxelles: 'Bruxelas', Anvers: 'Antuérpia',
    Barcelone: 'Barcelona', Valence: 'Valência', 'Séville': 'Sevilha', 'Málaga': 'Málaga', Bilbao: 'Bilbau',
    Amsterdam: 'Amesterdão', Rotterdam: 'Roterdão',
    Rome: 'Roma', Milan: 'Milão', Naples: 'Nápoles', Venise: 'Veneza', Florence: 'Florença', Bologne: 'Bolonha', 'Vérone': 'Verona',
    Berlin: 'Berlim', Munich: 'Munique', Hambourg: 'Hamburgo', Francfort: 'Frankfurt', Cologne: 'Colónia', Stuttgart: 'Estugarda',
    Londres: 'Londres', 'Édimbourg': 'Edimburgo',
    Lisbonne: 'Lisboa', 'Athènes': 'Atenas', Vienne: 'Viena', Copenhague: 'Copenhaga',
    Stockholm: 'Estocolmo', Varsovie: 'Varsóvia', Budapest: 'Budapeste', Helsinki: 'Helsínquia',
    Bucarest: 'Bucareste', Prague: 'Praga', Zagreb: 'Zagrebe',
    Luxembourg: 'Luxemburgo', 'Genève': 'Genebra', Zurich: 'Zurique', 'Bâle': 'Basileia',
    'New York': 'Nova Iorque', 'San Francisco': 'São Francisco',
    Alger: 'Argel', Oran: 'Orão', Constantine: 'Constantina', Tunis: 'Tunes',
    'Le Caire': 'Cairo', Alexandrie: 'Alexandria', 'Charm el-Cheikh': 'Sharm el-Sheikh',
    Beyrouth: 'Beirute', 'Dubaï': 'Dubai',
    Riyad: 'Riade', Djeddah: 'Jidá', 'Médine': 'Medina',
  },
  // Arabic: every city, since a Latin-script name in an Arabic sentence
  // reads badly.
  ar: {
    Casablanca: 'الدار البيضاء', Rabat: 'الرباط', Marrakech: 'مراكش', Tanger: 'طنجة',
    'Fès': 'فاس', Agadir: 'أكادير', Oujda: 'وجدة', Nador: 'الناظور',
    Paris: 'باريس', Marseille: 'مرسيليا', Lyon: 'ليون', Toulouse: 'تولوز', Nice: 'نيس',
    Bordeaux: 'بوردو', Lille: 'ليل', Nantes: 'نانت', Strasbourg: 'ستراسبورغ', Montpellier: 'مونبلييه',
    Bruxelles: 'بروكسل', Anvers: 'أنتويرب', Charleroi: 'شارلروا', 'Liège': 'لييج',
    Madrid: 'مدريد', Barcelone: 'برشلونة', Valence: 'فالنسيا', 'Séville': 'إشبيلية', 'Málaga': 'مالقة', Bilbao: 'بلباو',
    Amsterdam: 'أمستردام', Rotterdam: 'روتردام', Eindhoven: 'آيندهوفن',
    Rome: 'روما', Milan: 'ميلانو', Naples: 'نابولي', Venise: 'البندقية', Florence: 'فلورنسا', Bologne: 'بولونيا', 'Vérone': 'فيرونا',
    Berlin: 'برلين', Munich: 'ميونخ', Hambourg: 'هامبورغ', Francfort: 'فرانكفورت', 'Düsseldorf': 'دوسلدورف',
    Cologne: 'كولونيا', Stuttgart: 'شتوتغارت',
    Londres: 'لندن', Manchester: 'مانشستر', Birmingham: 'برمنغهام', 'Édimbourg': 'إدنبرة',
    Lisbonne: 'لشبونة', Dublin: 'دبلن', 'Athènes': 'أثينا', Vienne: 'فيينا', Copenhague: 'كوبنهاغن',
    Oslo: 'أوسلو', Stockholm: 'ستوكهولم', Varsovie: 'وارسو', Budapest: 'بودابست', Helsinki: 'هلسنكي',
    Bucarest: 'بوخارست', Prague: 'براغ', Sofia: 'صوفيا', Zagreb: 'زغرب', Luxembourg: 'لوكسمبورغ',
    'Genève': 'جنيف', Zurich: 'زيورخ', 'Bâle': 'بازل',
    'Montréal': 'مونتريال', Toronto: 'تورونتو', Vancouver: 'فانكوفر', Calgary: 'كالغاري', Ottawa: 'أوتاوا',
    'New York': 'نيويورك', 'Los Angeles': 'لوس أنجلوس', Chicago: 'شيكاغو', Miami: 'ميامي',
    Boston: 'بوسطن', Washington: 'واشنطن', 'San Francisco': 'سان فرانسيسكو', Houston: 'هيوستن',
    Alger: 'الجزائر العاصمة', Oran: 'وهران', Constantine: 'قسنطينة', Annaba: 'عنابة',
    Tunis: 'تونس', Sfax: 'صفاقس', Djerba: 'جربة', Monastir: 'المنستير',
    'Le Caire': 'القاهرة', Alexandrie: 'الإسكندرية', 'Charm el-Cheikh': 'شرم الشيخ', Hurghada: 'الغردقة',
    Beyrouth: 'بيروت',
    'Dubaï': 'دبي', 'Abu Dhabi': 'أبوظبي',
    Doha: 'الدوحة',
    Riyad: 'الرياض', Djeddah: 'جدة', 'Médine': 'المدينة المنورة',
  },
};

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
  'Vérone': { lat: 45.4, lng: 11.0 },
  // Allemagne
  Berlin: { lat: 52.5, lng: 13.4 }, Munich: { lat: 48.1, lng: 11.6 },
  Hambourg: { lat: 53.6, lng: 10.0 }, Francfort: { lat: 50.1, lng: 8.7 },
  'Düsseldorf': { lat: 51.2, lng: 6.8 }, Cologne: { lat: 50.9, lng: 6.9 },
  Stuttgart: { lat: 48.8, lng: 9.2 },
  // Royaume-Uni
  Londres: { lat: 51.5, lng: -0.1 }, Manchester: { lat: 53.5, lng: -2.2 },
  Birmingham: { lat: 52.5, lng: -1.9 }, 'Édimbourg': { lat: 55.9, lng: -3.2 },
  // Autres capitales européennes
  Lisbonne: { lat: 38.7, lng: -9.1 }, Dublin: { lat: 53.3, lng: -6.3 },
  'Athènes': { lat: 38.0, lng: 23.7 }, Vienne: { lat: 48.2, lng: 16.4 },
  Copenhague: { lat: 55.7, lng: 12.6 }, Oslo: { lat: 59.9, lng: 10.8 },
  Stockholm: { lat: 59.3, lng: 18.1 }, Varsovie: { lat: 52.2, lng: 21.0 },
  Budapest: { lat: 47.5, lng: 19.0 }, Helsinki: { lat: 60.2, lng: 24.9 },
  Bucarest: { lat: 44.4, lng: 26.1 }, Prague: { lat: 50.1, lng: 14.4 },
  Sofia: { lat: 42.7, lng: 23.3 }, Zagreb: { lat: 45.8, lng: 16.0 },
  Luxembourg: { lat: 49.6, lng: 6.1 },
  // Suisse
  'Genève': { lat: 46.2, lng: 6.1 }, Zurich: { lat: 47.4, lng: 8.5 },
  'Bâle': { lat: 47.6, lng: 7.6 },
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
