'use client';

// Live trips on a route landing page, rendered with the home page's card so
// both look identical and follow the visitor's language.
import { TripCard, type TripWithProfile } from '@/components/TripCard';
import { useI18n } from '@/lib/i18n/context';

export function RouteTrips({ trips }: { trips: TripWithProfile[] }) {
  const { t } = useI18n();
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map((trip, i) => (
        <TripCard key={trip.id} trip={trip} delay={(i % 6) * 0.04} t={t} />
      ))}
    </div>
  );
}
