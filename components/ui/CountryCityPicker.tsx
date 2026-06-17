'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  Navigation,
  Check,
  Pencil,
  ArrowLeft,
} from 'lucide-react';
import {
  COUNTRIES,
  findCountryByName,
  nearestCountry,
} from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';

/**
 * Country-first location picker. Two fields side by side:
 *   1. Pays  — short list of countries (with flags + search).
 *   2. Ville — only the cities of the chosen country, so the list stays tiny.
 *
 * Both lists end with an "Autre" entry that flips the field to a freeform
 * text input, so we never block a user whose country/city isn't curated yet.
 * A custom country implies a custom city (we have no city list for it).
 *
 * Optional "Me localiser" shortcut geolocates the user and pre-selects the
 * nearest country (city is then picked from the list). Country-level only —
 * we don't store city coordinates.
 */
type Props = {
  country: string;
  city: string;
  onChange: (next: { country: string; city: string }) => void;
  cityPlaceholder?: string;
  countryPlaceholder?: string;
  enableNearby?: boolean;
};

export function CountryCityPicker({
  country,
  city,
  onChange,
  cityPlaceholder,
  countryPlaceholder,
  enableNearby = false,
}: Props) {
  const { t } = useI18n();
  const [panel, setPanel] = useState<null | 'country' | 'city'>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Freeform overrides. These can only force a field ON (never off): the
  // "persisted custom" case is derived from the data, while these handle the
  // transient moment after tapping "Autre" but before anything is typed.
  const [wantCustomCountry, setWantCustomCountry] = useState(false);
  const [wantCustomCity, setWantCustomCity] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const knownCountry = useMemo(() => findCountryByName(country), [country]);
  const cityList = knownCountry?.cities ?? [];

  const isCustomCountry = wantCustomCountry || (!!country && !knownCountry);
  const isCustomCity =
    wantCustomCity ||
    isCustomCountry ||
    (!!city && !!knownCountry && !cityList.includes(city));

  // Close any open panel on click-outside.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanel(null);
      }
    }
    if (panel) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [panel]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name_fr.toLowerCase().includes(q));
  }, [countryQuery]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cityList;
    return cityList.filter((c) => c.toLowerCase().includes(q));
  }, [cityQuery, cityList]);

  function pickCountry(name: string) {
    onChange({ country: name, city: '' });
    setWantCustomCountry(false);
    setWantCustomCity(false);
    setCountryQuery('');
    setCityQuery('');
    setGeoError(null);
    setPanel('city');
  }

  function chooseCustomCountry() {
    setWantCustomCountry(true);
    setWantCustomCity(true);
    onChange({ country: '', city: '' });
    setPanel(null);
    setTimeout(() => countryInputRef.current?.focus(), 0);
  }

  function pickCity(name: string) {
    onChange({ country, city: name });
    setWantCustomCity(false);
    setCityQuery('');
    setPanel(null);
  }

  function chooseCustomCity() {
    setWantCustomCity(true);
    onChange({ country, city: '' });
    setPanel(null);
    setTimeout(() => cityInputRef.current?.focus(), 0);
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeoError(t.picker_geo_unavailable);
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = nearestCountry(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        pickCountry(c.name_fr);
      },
      () => {
        setLocating(false);
        setGeoError(t.picker_geo_denied);
      },
      { timeout: 8000 },
    );
  }

  function backToCountryList() {
    setWantCustomCountry(false);
    setWantCustomCity(false);
    onChange({ country: '', city: '' });
    setPanel('country');
    setCountryQuery('');
  }

  function backToCityList() {
    setWantCustomCity(false);
    onChange({ country, city: '' });
    setPanel('city');
    setCityQuery('');
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-stretch gap-2">
        {/* ---- Pays ---- */}
        <div className="relative flex-1 min-w-0">
          {isCustomCountry ? (
            <div className="relative">
              <Pencil className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
              <input
                ref={countryInputRef}
                type="text"
                value={country}
                onChange={(e) => onChange({ country: e.target.value, city })}
                placeholder={t.picker_country_input_placeholder}
                className="w-full ps-5 pe-6 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  backToCountryList();
                }}
                className="absolute right-0 top-0.5 p-0.5 rounded-full hover:bg-ink-50 text-ink-300 hover:text-ink-500 transition-colors"
                aria-label={t.picker_back_countries}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPanel(panel === 'country' ? null : 'country')}
              className="w-full flex items-center gap-1.5 ps-5 pe-1 relative text-start"
            >
              <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
              <span
                className={`flex-1 min-w-0 truncate text-[15px] ${
                  knownCountry ? 'text-ink-600' : 'text-ink-300'
                }`}
              >
                {knownCountry
                  ? `${knownCountry.flag} ${knownCountry.name_fr}`
                  : countryPlaceholder ?? t.picker_country_placeholder}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
            </button>
          )}

          {panel === 'country' && (
            <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-ink-100 shadow-[0_8px_30px_-12px_rgba(24,20,16,0.18)] max-h-[320px] overflow-y-auto z-50 min-w-[220px]">
              <div className="p-2 border-b border-ink-50 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                  <input
                    autoFocus
                    type="text"
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    placeholder={t.picker_search_country}
                    className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[13px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                  />
                </div>
                {enableNearby && (
                  <button
                    type="button"
                    onClick={locate}
                    disabled={locating}
                    className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium text-lavender-700 hover:bg-lavender-50 transition-colors disabled:opacity-60"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    {locating ? t.picker_locating : t.picker_locate}
                  </button>
                )}
                {geoError && (
                  <div className="mt-1.5 px-3 text-[12px] text-butter-600">{geoError}</div>
                )}
              </div>
              {filteredCountries.map((c) => {
                const selected = c.name_fr === country;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => pickCountry(c.name_fr)}
                    className={`w-full text-start px-4 py-2 text-[14px] hover:bg-cream-50 transition-colors flex items-center justify-between ${
                      selected ? 'text-lavender-700 font-semibold' : 'text-ink-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.name_fr}</span>
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 text-lavender-500" strokeWidth={2.5} />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={chooseCustomCountry}
                className="w-full text-start px-4 py-2.5 text-[14px] text-ink-500 hover:bg-cream-50 transition-colors flex items-center gap-2 border-t border-ink-50"
              >
                <Pencil className="w-3.5 h-3.5 text-ink-300" />
                <span>{t.picker_other_country}</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-px bg-ink-50 flex-shrink-0 self-stretch" />

        {/* ---- Ville ---- */}
        <div className="relative flex-1 min-w-0">
          {isCustomCity ? (
            <div className="relative">
              <Pencil className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
              <input
                ref={cityInputRef}
                type="text"
                value={city}
                onChange={(e) => onChange({ country, city: e.target.value })}
                placeholder={t.picker_city_input_placeholder}
                className="w-full ps-5 pe-6 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none"
              />
              {!isCustomCountry && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    backToCityList();
                  }}
                  className="absolute right-0 top-0.5 p-0.5 rounded-full hover:bg-ink-50 text-ink-300 hover:text-ink-500 transition-colors"
                  aria-label={t.picker_back_cities}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={!knownCountry}
              onClick={() => setPanel(panel === 'city' ? null : 'city')}
              className="w-full flex items-center gap-1.5 ps-5 pe-1 relative text-start disabled:cursor-not-allowed"
            >
              <MapPin
                className={`absolute left-0 top-1 w-3.5 h-3.5 pointer-events-none ${
                  knownCountry ? 'text-ink-300' : 'text-ink-200'
                }`}
              />
              <span
                className={`flex-1 min-w-0 truncate text-[15px] ${
                  city ? 'text-ink-600' : knownCountry ? 'text-ink-300' : 'text-ink-200'
                }`}
              >
                {city || cityPlaceholder}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 flex-shrink-0 ${knownCountry ? 'text-ink-300' : 'text-ink-200'}`}
              />
            </button>
          )}

          {panel === 'city' && knownCountry && (
            <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-ink-100 shadow-[0_8px_30px_-12px_rgba(24,20,16,0.18)] max-h-[320px] overflow-y-auto z-50 min-w-[200px]">
              {cityList.length > 6 && (
                <div className="p-2 border-b border-ink-50 sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                    <input
                      autoFocus
                      type="text"
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      placeholder="Rechercher une ville…"
                      className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[13px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                    />
                  </div>
                </div>
              )}
              {filteredCities.map((c) => {
                const selected = c === city;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pickCity(c)}
                    className={`w-full text-start px-4 py-2 text-[14px] hover:bg-cream-50 transition-colors flex items-center justify-between ${
                      selected ? 'text-lavender-700 font-semibold' : 'text-ink-600'
                    }`}
                  >
                    <span>{c}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-lavender-500" strokeWidth={2.5} />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={chooseCustomCity}
                className="w-full text-start px-4 py-2.5 text-[14px] text-ink-500 hover:bg-cream-50 transition-colors flex items-center gap-2 border-t border-ink-50"
              >
                <Pencil className="w-3.5 h-3.5 text-ink-300" />
                <span>Autre ville — saisir manuellement</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
