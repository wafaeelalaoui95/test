'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Search, Navigation, Check, Pencil } from 'lucide-react';
import {
  cityDisplayName,
  countryDisplayName,
  getAllCities,
  nearestCity,
} from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';

/**
 * Single-field location picker, BlaBlaCar-style. One box: the user types a
 * place ("Ville, pays"); an autocomplete lists matching cities with their
 * country + flag. Picking one fills BOTH country and city. Typing a country
 * name surfaces that country's cities too. A freeform "Use « … »" fallback
 * keeps uncurated places usable. "Me localiser" jumps to the nearest hub.
 *
 * The stored country/city stay canonical (French) for the matching queries;
 * only the displayed labels switch with the locale.
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
  countryPlaceholder,
  enableNearby = false,
}: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allCities = useMemo(() => getAllCities(), []);

  // Cities matching the query (by city OR country name, either language).
  // Empty query → a short list of suggestions so the panel isn't blank.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCities.slice(0, 8);
    return allCities
      .filter(
        (loc) =>
          loc.city.toLowerCase().includes(q) ||
          cityDisplayName(loc.city, 'en').toLowerCase().includes(q) ||
          cityDisplayName(loc.city, 'fr').toLowerCase().includes(q) ||
          loc.countryName.toLowerCase().includes(q) ||
          countryDisplayName(loc.countryName, 'en').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, allCities]);

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

  function openPanel() {
    setGeoError(null);
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function pick(loc: { countryName: string; city: string }) {
    onChange({ country: loc.countryName, city: loc.city });
    setQuery('');
    setOpen(false);
  }

  // Freeform place: we don't know the country, so store the typed city with an
  // empty country (the search falls back to an exact city match).
  function pickCustom() {
    const q = query.trim();
    if (!q) return;
    onChange({ country: '', city: q });
    setQuery('');
    setOpen(false);
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
          setQuery('');
          setOpen(false);
        } else {
          setGeoError(t.picker_geo_denied);
        }
      },
      () => {
        setLocating(false);
        setGeoError(t.picker_geo_denied);
      },
      { timeout: 8000 }
    );
  }

  const placeholder = countryPlaceholder ?? t.picker_place_placeholder;
  const label = city
    ? `${cityDisplayName(city, locale)}${country ? ` · ${countryDisplayName(country, locale)}` : ''}`
    : placeholder;
  const q = query.trim();

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="w-full flex items-center gap-2 ps-5 pe-1 relative text-start"
      >
        <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
        <span className={`flex-1 min-w-0 truncate text-[15px] ${city ? 'text-ink-600' : 'text-ink-300'}`}>
          {label}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-ink-100 shadow-[0_8px_30px_-12px_rgba(24,20,16,0.18)] max-h-[340px] overflow-y-auto z-50 min-w-[240px]">
          <div className="p-2 border-b border-ink-50 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.picker_place_placeholder}
                className="w-full pl-8 pr-3 py-2 bg-cream-100 rounded-lg text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
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
            {geoError && <div className="mt-1.5 px-3 text-[12px] text-butter-600">{geoError}</div>}
          </div>

          {results.map((loc) => {
            const selected = loc.city === city && loc.countryName === country;
            return (
              <button
                key={`${loc.countryCode}-${loc.city}`}
                type="button"
                onClick={() => pick(loc)}
                className={`w-full text-start px-4 py-2.5 text-[14px] hover:bg-cream-50 transition-colors flex items-center gap-2 ${
                  selected ? 'text-lavender-700 font-semibold' : 'text-ink-600'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
                <span className="truncate">{cityDisplayName(loc.city, locale)}</span>
                <span className="text-ink-300 text-[12px] truncate">
                  · {loc.countryFlag} {countryDisplayName(loc.countryName, locale)}
                </span>
                {selected && <Check className="w-3.5 h-3.5 text-lavender-500 ms-auto flex-shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}

          {q && results.length === 0 && (
            <div className="px-4 py-2 text-[13px] text-ink-400">{t.picker_no_place}</div>
          )}

          {/* Freeform fallback — always available while typing, for places not
              in the curated list. */}
          {q && (
            <button
              type="button"
              onClick={pickCustom}
              className="w-full text-start px-4 py-2.5 text-[14px] text-ink-500 hover:bg-cream-50 transition-colors flex items-center gap-2 border-t border-ink-50"
            >
              <Pencil className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
              <span className="truncate">{t.picker_use_custom.replace('{q}', query.trim())}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
