'use client';

// A traveller's trip as a card. Its own file (not inside HomeClient) so the
// route and guide pages can show trips without loading the whole home page.
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Plane, Calendar, MapPin } from 'lucide-react';
import { VerificationBadge } from '@/components/ui/Badge';
import { cityDisplayName } from '@/lib/countries';
import { nameInitial, displayName, priceBreakdown, formatEuros } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import type { TravelerTripRow, Profile } from '@/lib/supabase/types';

export type TripWithProfile = TravelerTripRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

export function TripCard({ trip, delay, t }: { trip: TripWithProfile; delay: number; t: any }) {
  const { locale } = useI18n();
  const name = displayName(trip.profile?.full_name);
  const initial = nameInitial(trip.profile?.full_name);

  // What the traveller accepts is deliberately not on the card — it is on
  // their profile page, one tap away, and the list stays about where and when.

  return (
    <Link href={`/u/${trip.user_id}?book=${trip.id}`} className="block group h-full">
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.4, delay }}
        className="bg-white rounded-2xl border border-ink-50 group-hover:border-ink-200 group-hover:shadow-[0_8px_30px_-12px_rgba(24,20,16,0.12)] transition-all flex flex-col h-full overflow-hidden"
      >
        {/* Ticket body. Order follows what a sender scans for: when, where,
            then who. */}
        <div className="p-4 flex-1 flex flex-col">
          {/* When — date always, time and flight number when the traveller
              gave them (they are also what tells two otherwise identical
              trips apart). */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream-100 text-[13px] font-semibold text-ink-600 num-display whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-ink-400" />
              {formatTripDate(trip.departure_date, locale)}
              {trip.flight_time && (
                <span className="text-ink-400 font-medium">· {trip.flight_time}</span>
              )}
            </span>
            {trip.flight_number && (
              <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-300 num-display truncate">
                {trip.flight_number}
              </span>
            )}
          </div>

          {/* Where — the headline of the card. */}
          <div className="flex items-center gap-2 mb-3 text-[18px] font-extrabold text-ink-600 tracking-[-0.02em] leading-tight min-w-0">
            <span className="truncate">{cityDisplayName(trip.departure_city, locale)}</span>
            {/* Dotted flight path with the plane centred between the cities. */}
            <span className="flex-1 min-w-[40px] flex items-center gap-1 text-lavender-500" aria-hidden>
              <span className="flex-1 border-t-2 border-dotted border-ink-200" />
              <Plane className="w-4 h-4 rotate-45 flex-shrink-0" />
              <span className="flex-1 border-t-2 border-dotted border-ink-200" />
            </span>
            <span className="truncate">{cityDisplayName(trip.arrival_city, locale)}</span>
          </div>

          {/* The nearby cities themselves are on the profile, where the card
              leads: here, only that there are some. */}
          {((trip.extra_departure_cities?.length ?? 0) > 0 || (trip.extra_arrival_cities?.length ?? 0) > 0) && (
            <div className="-mt-1.5 mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-lavender-600">
              <MapPin className="w-3 h-3" />
              {t.trip_nearby_badge}
            </div>
          )}

          {/* Who — secondary, pinned to the bottom of the body. */}
          <div className="flex items-center gap-2 mt-auto">
            <div className="w-8 h-8 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[12px] text-lavender-700 flex-shrink-0">
              {initial}
            </div>
            {/* Name and badge side by side; the badge wraps under a long name
                instead of squeezing it down to "Zak…". */}
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-ink-600 truncate max-w-full text-[14px] tracking-[-0.005em]">
                {name || '-'}
              </span>
              {trip.profile?.verification_level && (
                <VerificationBadge level={trip.profile.verification_level} />
              )}
            </div>
            {/* Rating and trip count hidden until they are real. Neither
                profiles.rating nor profiles.trips_completed is computed from
                anything — the migration that revoked them from clients left
                the trigger to write them "TODO", so every star on the site
                showed a number nobody earned. Verification badges carry trust
                in the meantime; they at least mean something. */}
          </div>
        </div>

        {/* Boarding-pass stub — dashed perforation + notches + price + CTA.
            Always the last row, so price and button line up across a grid row. */}
        <div className="relative border-t-2 border-dashed border-ink-100 bg-lavender-50/60 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cream-50" />
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cream-50" />
          <div className="min-w-0 leading-tight">
            <div className="font-extrabold text-ink-600 text-[18px] num-display tracking-[-0.02em]">
              {formatEuros(priceBreakdown(trip.compensation_min).total)}
            </div>
            <div className="text-[11px] text-ink-400 whitespace-nowrap">{t.disc_protection_included}</div>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 sm:px-3.5 py-2 rounded-full bg-lavender-600 group-hover:bg-lavender-700 text-cream-50 text-[12px] sm:text-[13px] font-semibold transition-colors">
            {t.disc_book_trip}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </motion.article>
    </Link>
  );
}

/** "sam. 22 nov." / "Sat 22 Nov". Parsed at noon so no timezone shifts the day. */
function formatTripDate(date: string, locale: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  if (isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}
