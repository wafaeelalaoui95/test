'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Check, X as XIcon } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';

/**
 * Combobox for picking a city. UX goals:
 *   - Click/focus the input → dropdown opens showing ALL cities,
 *     grouped by country with flags.
 *   - Start typing → list filters live by city name OR country name.
 *   - Click a row → city selected, dropdown closes.
 *   - Click outside → dropdown closes; the typed text is kept as the
 *     city value (we trust freeform too for cities not in our dataset).
 *
 * Props:
 *   - value:        current city string
 *   - onChange:     called with the picked or typed city name
 *   - placeholder:  shown when value is empty
 */
type Props = {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
};

type Row = {
  city: string;
  countryName: string;
  countryFlag: string;
};

export function CityCombobox({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local query when parent value changes externally (e.g. reset).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on click-outside.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // On close, treat whatever's in the input as the chosen value.
        if (query !== value) onChange(query);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [open, query, value, onChange]);

  // Flatten cities to a single grouped structure for rendering, applying
  // the search query if any. Filtering is permissive: a match on city OR
  // country name keeps the row.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COUNTRIES.map((country) => {
      const matching = country.cities.filter((city) => {
        if (!q) return true;
        return (
          city.toLowerCase().includes(q) ||
          country.name_fr.toLowerCase().includes(q)
        );
      });
      return {
        countryName: country.name_fr,
        countryFlag: country.flag,
        countryCode: country.code,
        cities: matching,
      };
    }).filter((g) => g.cities.length > 0);
  }, [query]);

  function pickCity(row: Row) {
    onChange(row.city);
    setQuery(row.city);
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setQuery('');
    onChange('');
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Choisir une ville…'}
          className="w-full ps-5 pe-7 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onMouseDown={clear}
            className="absolute right-0 top-0.5 p-0.5 rounded-full hover:bg-ink-50 text-ink-300 hover:text-ink-500 transition-colors"
            aria-label="Effacer"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl border border-ink-100 shadow-[0_8px_30px_-12px_rgba(24,20,16,0.18)] max-h-[320px] overflow-y-auto z-50">
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-ink-400">
              Aucune ville trouvée pour « {query} ».
              <div className="text-[12px] text-ink-300 mt-2">
                Vous pouvez aussi taper le nom manuellement.
              </div>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.countryCode} className="py-1">
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-2 text-[11px] font-semibold text-ink-400 tracking-[0.06em] uppercase">
                  <span>{group.countryFlag}</span>
                  <span>{group.countryName}</span>
                </div>
                {group.cities.map((city) => {
                  const isSelected = value === city;
                  return (
                    <button
                      key={`${group.countryCode}-${city}`}
                      type="button"
                      onClick={() => pickCity({ city, countryName: group.countryName, countryFlag: group.countryFlag })}
                      className={`w-full text-start px-4 py-2 text-[14px] hover:bg-cream-50 transition-colors flex items-center justify-between ${
                        isSelected ? 'text-lavender-700 font-semibold' : 'text-ink-600'
                      }`}
                    >
                      <span>{city}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-lavender-500" strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
