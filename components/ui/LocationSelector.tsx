'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { COUNTRIES, getAllCities, type CityLocation } from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export type LocationValue = {
  country: string;
  city: string;
  flag: string;
} | null;

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  placeholder?: string;
  label?: string;
  icon?: 'departure' | 'arrival';
}

export function LocationSelector({
  value,
  onChange,
  placeholder,
  label,
  icon = 'departure',
}: LocationSelectorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allCities = useMemo(() => getAllCities(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show ALL countries by default, with up to 5 cities each.
      // This way users can spot London, New York, etc. without having to
      // know they need to type them.
      const initial: CityLocation[] = [];
      COUNTRIES.forEach((c) => {
        c.cities.slice(0, 5).forEach((city) =>
          initial.push({
            countryCode: c.code,
            countryName: c.name_fr,
            countryFlag: c.flag,
            city,
          })
        );
      });
      return initial;
    }
    return allCities
      .filter(
        (loc) =>
          loc.city.toLowerCase().includes(q) ||
          loc.countryName.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [query, allCities]);

  const grouped = useMemo(() => {
    const map = new Map<string, { country: string; flag: string; cities: CityLocation[] }>();
    filtered.forEach((loc) => {
      const existing = map.get(loc.countryCode);
      if (existing) {
        existing.cities.push(loc);
      } else {
        map.set(loc.countryCode, {
          country: loc.countryName,
          flag: loc.countryFlag,
          cities: [loc],
        });
      }
    });
    return Array.from(map.values());
  }, [filtered]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [open]);

  function selectCity(loc: CityLocation) {
    onChange({
      country: loc.countryName,
      city: loc.city,
      flag: loc.countryFlag,
    });
    setOpen(false);
    setQuery('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  }

  const IconComp = icon === 'departure' ? ArrowUpRight : ArrowDownLeft;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[13px] font-medium text-ink-500 mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative w-full text-start px-4 py-3.5 rounded-xl transition-all',
          'border border-transparent hover:bg-cream-100/70',
          open && 'bg-cream-100/70',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ink-50 flex items-center justify-center text-ink-400">
            <IconComp className="w-3.5 h-3.5" strokeWidth={2} />
          </div>

          {value ? (
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-ink-600 truncate flex items-center gap-2">
                <span>{value.city}</span>
                <span>{value.flag}</span>
              </div>
              <div className="text-[12px] text-ink-400 mt-0.5">{value.country}</div>
            </div>
          ) : (
            <div className="flex-1 text-ink-400 text-[15px]">
              {placeholder}
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={clear}
              className="flex-shrink-0 w-6 h-6 rounded-full text-ink-300 hover:text-ink-500 hover:bg-ink-50 flex items-center justify-center transition-colors"
              aria-label={t.common_clear}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 inset-x-0 mt-2 bg-white border border-ink-100 rounded-2xl shadow-float overflow-hidden"
          >
            <div className="p-3 border-b border-ink-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.common_search_placeholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-cream-100 border-0 rounded-lg text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:bg-white focus:ring-1 focus:ring-ink-200"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {grouped.length === 0 ? (
                <div className="px-4 py-10 text-center text-[14px] text-ink-300">
                  {t.common_no_results}
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.country}>
                    <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-ink-300 uppercase tracking-[0.08em] flex items-center gap-2">
                      <span>{group.flag}</span>
                      <span>{group.country}</span>
                    </div>
                    {group.cities.map((loc) => (
                      <button
                        key={`${loc.countryCode}-${loc.city}`}
                        type="button"
                        onClick={() => selectCity(loc)}
                        className="w-full text-start px-4 py-2.5 hover:bg-cream-100 flex items-center gap-3 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
                        <span className="text-[14px] text-ink-600 font-medium">{loc.city}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
