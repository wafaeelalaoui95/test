'use client';

import { X } from 'lucide-react';
import { Checkbox } from '@/components/ui/Form';
import { CountryCityPicker } from '@/components/ui/CountryCityPicker';
import { cityDisplayName } from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';

/** Cities per side. Enough for "the towns around me", not a whole country. */
export const MAX_EXTRA_CITIES = 5;

/**
 * "I can pick up / drop off in nearby cities" — the checkbox under the
 * From / To fields on /voyager. Ticked, it opens two lists where the traveller
 * adds the cities around their departure and their arrival. Senders in those
 * cities then see the trip as a match for their route.
 *
 * Stored as canonical (French) city names, like departure_city / arrival_city,
 * so the matching queries compare like with like.
 */
export function NearbyCitiesOption({
  enabled,
  onEnabledChange,
  fromCity,
  toCity,
  extraFrom,
  extraTo,
  onExtraFromChange,
  onExtraToChange,
  roundTrip = false,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  fromCity: string;
  toCity: string;
  extraFrom: string[];
  extraTo: string[];
  onExtraFromChange: (v: string[]) => void;
  onExtraToChange: (v: string[]) => void;
  // Round trip: the same lists serve both flights, swapped on the way back
  // (picked up near X going out = dropped off near X coming back). Each list
  // is named after its city and says what happens there on each flight.
  roundTrip?: boolean;
}) {
  const { t, locale } = useI18n();
  const title = (city: string, fallback: string) =>
    city ? t.voy_nearby_around.replace('{city}', cityDisplayName(city, locale)) : fallback;

  return (
    <div>
      <Checkbox
        name="nearby-cities"
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        label={
          <span>
            <span className="font-medium text-ink-600">{t.voy_nearby_toggle}</span>
            <span className="block text-[12px] text-ink-400">{t.voy_nearby_hint}</span>
          </span>
        }
      />

      {enabled && (
        <div className="mt-4 grid sm:grid-cols-2 gap-4 ps-7">
          <CityList
            title={title(fromCity, t.voy_nearby_pickup_label)}
            note={roundTrip ? t.voy_nearby_note_from_rt : t.voy_nearby_note_from}
            mainCity={fromCity}
            cities={extraFrom}
            onChange={onExtraFromChange}
          />
          <CityList
            title={title(toCity, t.voy_nearby_dropoff_label)}
            note={roundTrip ? t.voy_nearby_note_to_rt : t.voy_nearby_note_to}
            mainCity={toCity}
            cities={extraTo}
            onChange={onExtraToChange}
          />
        </div>
      )}
    </div>
  );
}

function CityList({
  title,
  note,
  mainCity,
  cities,
  onChange,
}: {
  title: string;
  note: string;
  mainCity: string;
  cities: string[];
  onChange: (v: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  function add(city: string) {
    const c = city.trim();
    if (!c || same(c, mainCity) || cities.some((x) => same(x, c))) return;
    onChange([...cities, c].slice(0, MAX_EXTRA_CITIES));
  }

  return (
    <div>
      <div className="text-[12px] font-semibold text-ink-500">{title}</div>
      <div className="text-[11px] text-ink-400 mb-2">{note}</div>
      <div className="flex flex-wrap items-center gap-2">
        {cities.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 ps-3 pe-1.5 py-1 rounded-full bg-lavender-50 border border-lavender-200 text-[13px] text-lavender-700"
          >
            {cityDisplayName(c, locale)}
            <button
              type="button"
              onClick={() => onChange(cities.filter((x) => x !== c))}
              className="p-0.5 rounded-full hover:bg-lavender-100"
              aria-label={t.voy_nearby_remove.replace('{city}', cityDisplayName(c, locale))}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {cities.length < MAX_EXTRA_CITIES && (
          <div className="min-w-[180px] flex-1 rounded-xl border border-dashed border-ink-200 px-3 py-1.5 hover:border-ink-300 transition-colors">
            {/* Always empty: picking a city adds a chip and resets the field. */}
            <CountryCityPicker
              country=""
              city=""
              countryPlaceholder={t.voy_nearby_add}
              onChange={({ city }) => add(city)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
