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
  nearestCity,
} from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';

/**
 * Country-first location picker, shown as ONE compact field ("Pays · Ville").
 * Clicking it opens a single panel with two steps:
 *   1. Pays — short list of countries (with flags + search + "Me localiser").
 *   2. Ville — only the cities of the chosen country, so the list stays tiny.
 *
 * A returning value opens straight on the city step (with a back arrow to
 * change country). Each list ends with an "Autre" entry that flips to a
 * freeform text input, so we never block a user whose location isn't curated.
 * A custom country implies a custom city (we have no city list for it).
 *
 * "Me localiser" geolocates and lands on the nearest hub city, leaving the
 * city step open so the user can adjust.
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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'country' | 'city'>('country');
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Freeform overrides. These only force a field ON (never off): the persisted
  // custom case is derived from the data, while these handle the transient
  // moment right after tapping "Autre" but before anything is typed.
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

  // Close on click-outside or Escape.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('mousedown', onClickOutside);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [open]);

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

  function openPanel() {
    setGeoError(null);
    setCountryQuery('');
    setCityQuery('');
    setStep(knownCountry && !isCustomCountry ? 'city' : 'country');
    setOpen(true);
  }

  function pickCountry(name: string) {
    onChange({ country: name, city: '' });
    setWantCustomCountry(false);
    setWantCustomCity(false);
    setCountryQuery('');
    setCityQuery('');
    setGeoError(null);
    setStep('city');
  }

  function chooseCustomCountry() {
    setWantCustomCountry(true);
    setWantCustomCity(true);
    onChange({ country: '', city: '' });
    setStep('country');
    setTimeout(() => countryInputRef.current?.focus(), 0);
  }

  function exitCustomCountry() {
    setWantCustomCountry(false);
    setWantCustomCity(false);
    onChange({ country: '', city: '' });
    setCountryQuery('');
    setStep('country');
  }

  function pickCity(name: string) {
    onChange({ country, city: name });
    setWantCustomCity(false);
    setCityQuery('');
    setOpen(false);
  }

  function chooseCustomCity() {
    setWantCustomCity(true);
    onChange({ country, city: '' });
    setTimeout(() => cityInputRef.current?.focus(), 0);
  }

  function exitCustomCity() {
    setWantCustomCity(false);
    onChange({ country, city: '' });
    setCityQuery('');
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
        setLocating(false);
        const loc = nearestCity(pos.coords.latitude, pos.coords.longitude);
        if (loc) {
          onChange({ country: loc.countryName, city: loc.city });
          setWantCustomCountry(false);
          setWantCustomCity(false);
          setCountryQuery('');
          setCityQuery('');
          setGeoError(null);
          setStep('city');
        } else {
          pickCountry(nearestCountry(pos.coords.latitude, pos.coords.longitude).name_fr);
        }
      },
      () => {
        setLocating(false);
        setGeoError(t.picker_geo_denied);
      },
      { timeout: 8000 },
    );
  }

  // ---- Trigger label ----
  const hasAny = !!country || !!city;
  const countryLabel = isCustomCountry
    ? country || (countryPlaceholder ?? t.picker_country_placeholder)
    : knownCountry
      ? `${knownCountry.flag} ${knownCountry.name_fr}`
      : countryPlaceholder ?? t.picker_country_placeholder;
  const cityLabel = city || t.picker_city_placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="w-full flex items-center gap-2 ps-5 pe-1 relative text-start"
      >
        <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
        {hasAny ? (
          <span className="flex-1 min-w-0 truncate text-[15px]">
            <span className={country ? 'text-ink-600' : 'text-ink-300'}>{countryLabel}</span>
            <span className="text-ink-300"> · </span>
            <span className={city ? 'text-ink-600' : 'text-ink-300'}>{cityLabel}</span>
          </span>
        ) : (
          <span className="flex-1 min-w-0 truncate text-[15px] text-ink-300">
            {countryPlaceholder ?? `${t.picker_country_placeholder} · ${t.picker_city_placeholder}`}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-ink-100 shadow-[0_8px_30px_-12px_rgba(24,20,16,0.18)] max-h-[340px] overflow-y-auto z-50 min-w-[240px]">
          {isCustomCountry ? (
            /* ---- Freeform country + city ---- */
            <div className="p-3 space-y-2">
              <button
                type="button"
                onClick={exitCustomCountry}
                className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.picker_back_countries}</span>
              </button>
              <div className="relative">
                <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                <input
                  ref={countryInputRef}
                  type="text"
                  value={country}
                  onChange={(e) => onChange({ country: e.target.value, city })}
                  placeholder={t.picker_country_input_placeholder}
                  className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => onChange({ country, city: e.target.value })}
                  placeholder={t.picker_city_input_placeholder}
                  className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-2 rounded-lg bg-lavender-500 text-white text-[14px] font-medium hover:bg-lavender-600 transition-colors disabled:opacity-50"
                disabled={!country || !city}
              >
                OK
              </button>
            </div>
          ) : step === 'country' ? (
            /* ---- Step 1: country list ---- */
            <>
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
            </>
          ) : (
            /* ---- Step 2: city of the chosen country ---- */
            <>
              <div className="px-3 py-2.5 border-b border-ink-50 sticky top-0 bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('country')}
                  className="p-0.5 rounded-full hover:bg-ink-50 text-ink-400 hover:text-ink-600 transition-colors"
                  aria-label={t.picker_back_countries}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[14px] font-semibold text-ink-600 flex items-center gap-1.5">
                  <span>{knownCountry?.flag}</span>
                  <span>{knownCountry?.name_fr}</span>
                </span>
              </div>

              {isCustomCity ? (
                <div className="p-3 space-y-2">
                  <button
                    type="button"
                    onClick={exitCustomCity}
                    className="flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t.picker_back_cities}</span>
                  </button>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                    <input
                      ref={cityInputRef}
                      type="text"
                      value={city}
                      onChange={(e) => onChange({ country, city: e.target.value })}
                      placeholder={t.picker_city_input_placeholder}
                      className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full py-2 rounded-lg bg-lavender-500 text-white text-[14px] font-medium hover:bg-lavender-600 transition-colors disabled:opacity-50"
                    disabled={!city}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  {cityList.length > 6 && (
                    <div className="p-2 border-b border-ink-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
                        <input
                          autoFocus
                          type="text"
                          value={cityQuery}
                          onChange={(e) => setCityQuery(e.target.value)}
                          placeholder={t.picker_search_city}
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
                    <span>{t.picker_other_city}</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
