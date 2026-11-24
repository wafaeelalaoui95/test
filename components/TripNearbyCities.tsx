'use client';

import { MapPin } from 'lucide-react';
import { cityDisplayName } from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';

/**
 * "Also picks up in: Dubai" / "Also drops off in: …" for a trip with nearby
 * cities (see NearbyCitiesOption). Each trip row is one direction, so on a
 * round trip's return leg the lists are already swapped. Renders nothing when
 * the traveller added none.
 */
export function TripNearbyCities({
  trip,
  className = '',
}: {
  trip: { extra_departure_cities?: string[] | null; extra_arrival_cities?: string[] | null };
  className?: string;
}) {
  const { t, locale } = useI18n();
  const pick = trip.extra_departure_cities ?? [];
  const drop = trip.extra_arrival_cities ?? [];
  if (!pick.length && !drop.length) return null;
  const names = (l: string[]) => l.map((c) => cityDisplayName(c, locale)).join(', ');

  return (
    <div className={`space-y-0.5 text-[12px] text-ink-500 ${className}`}>
      {pick.length > 0 && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 mt-[3px] text-lavender-500 flex-shrink-0" />
          <span>
            <span className="text-ink-400">{t.trip_nearby_pickup} </span>
            {names(pick)}
          </span>
        </div>
      )}
      {drop.length > 0 && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 mt-[3px] text-lavender-500 flex-shrink-0" />
          <span>
            <span className="text-ink-400">{t.trip_nearby_dropoff} </span>
            {names(drop)}
          </span>
        </div>
      )}
    </div>
  );
}
