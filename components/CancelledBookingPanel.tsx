'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Plane, ArrowRight } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { formatEuros, formatShortDate, formatName } from '@/lib/utils';
import { cityDisplayName } from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { MatchingTrip } from '@/lib/supabase/queries';
import type { ItemCategory } from '@/lib/supabase/types';

// =============================================================================
// CancelledBookingPanel — what the sender sees when their traveller pulls out
// =============================================================================
// The screen this replaces was one line: "✕ refusée". Wrong on both counts —
// "declined" is what a traveller does to a request they never accepted, and
// one word is not an answer to "so where is my parcel, and where is my money".
//
// Three questions, in the order a sender asks them:
//   1. is anyone carrying my parcel?   → no, and here is why they stopped
//   2. what happened to my money?      → read off payment_status, not promised
//   3. what do I do now?               → other travellers on the same route
//
// (2) reads the row rather than asserting an outcome. The server tries to
// refund before it cancels, but a Stripe failure must not be able to turn into
// a screen that tells someone their money is back when it is not.

type CancelledBooking = {
  id: string;
  item_title: string | null;
  item_category: string;
  pickup_city: string;
  destination_city: string;
  payment_status: string;
  payment_amount: number | null;
  cancellation_reason?: string | null;
  cancellation_note?: string | null;
  traveler_profile?: { full_name: string | null } | null;
};

// The reason codes that mean "the trip stopped", as opposed to a traveller
// turning down a request they had not accepted.
const TRIP_REASONS = new Set([
  'flight_cancelled',
  'plans_changed',
  'no_space',
  'safety_concern',
  'other',
]);

export function CancelledBookingPanel({
  booking,
  currentUserId,
}: {
  booking: CancelledBooking;
  currentUserId: string;
}) {
  const { t, locale } = useI18n();
  const [alternatives, setAlternatives] = useState<MatchingTrip[] | null>(null);
  const [loadingAlts, setLoadingAlts] = useState(true);

  const cat = ITEM_CATEGORIES.find((c) => c.value === (booking.item_category as ItemCategory));
  const travelerName = booking.traveler_profile?.full_name
    ? formatName(booking.traveler_profile.full_name).split(' ')[0]
    : t.me2_role_traveler;
  const reason = booking.cancellation_reason ?? null;
  const tripWasCancelled = !!reason && TRIP_REASONS.has(reason);

  useEffect(() => {
    // Only worth asking when the trip fell through. A declined request leaves
    // the sender's own listing live, and the search they want is a different
    // one.
    if (!tripWasCancelled) {
      setLoadingAlts(false);
      return;
    }
    let cancelled = false;
    browser
      .listAlternativeTrips(booking.pickup_city, booking.destination_city, currentUserId)
      .then((rows) => {
        if (!cancelled) setAlternatives(rows);
      })
      .catch(() => {
        if (!cancelled) setAlternatives([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAlts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripWasCancelled, booking.pickup_city, booking.destination_city, currentUserId]);

  // A traveller who declined a request they had not accepted — the old wording
  // was right for this case, and this is the only case it was right for.
  if (!tripWasCancelled) {
    return (
      <div className="bg-white rounded-2xl border border-ink-50 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center text-xl flex-shrink-0">
            {cat?.icon ?? '📦'}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-ink-600 truncate">
              {booking.item_title || (cat ? t[cat.labelKey] : booking.item_category)}
            </div>
            <div className="text-[13px] text-ink-400">
              {t.me2_cancelled_declined.replace('{name}', travelerName)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reasonLine = (t[`me2_cancelled_reason_${reason}` as keyof typeof t] as string) ?? '';
  const searchHref =
    `/envoyer?from=${encodeURIComponent(booking.pickup_city)}` +
    `&to=${encodeURIComponent(booking.destination_city)}`;

  return (
    <div className="bg-white rounded-2xl border border-blush-200/70 overflow-hidden">
      {/* 1. Nobody is carrying it. */}
      <div className="bg-blush-50/60 px-5 py-4 border-b border-blush-200/50">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blush-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-blush-500" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink-600 leading-snug">
              {t.me2_cancelled_title.replace('{name}', travelerName)}
            </p>
            <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">
              {reasonLine}
            </p>
          </div>
        </div>
        {booking.cancellation_note && (
          <p className="mt-3 ml-12 text-[13px] text-ink-500 italic leading-relaxed">
            &ldquo;{booking.cancellation_note}&rdquo;
          </p>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* The parcel itself, so the panel still says which one this is. */}
        <div className="flex items-center gap-2 text-[13px]">
          <span>{cat?.icon ?? '📦'}</span>
          <span className="font-semibold text-ink-600 truncate">
            {booking.item_title || (cat ? t[cat.labelKey] : booking.item_category)}
          </span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">
            {cityDisplayName(booking.pickup_city, locale)} →{' '}
            {cityDisplayName(booking.destination_city, locale)}
          </span>
        </div>

        {/* 2. The money — read off the row, never assumed. */}
        <RefundLine booking={booking} />

        {/* 3. What now. */}
        <div>
          <p className="text-[13px] font-bold text-ink-600 mb-2">
            {t.me2_cancelled_alternatives}
          </p>
          {loadingAlts ? (
            <div className="flex items-center gap-2 text-[13px] text-ink-400 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t.me2_cancelled_alt_loading}
            </div>
          ) : alternatives && alternatives.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center gap-2 rounded-xl bg-lavender-50 px-3.5 py-2.5 text-[13px]"
                >
                  <Plane className="w-3.5 h-3.5 text-lavender-500 flex-shrink-0" />
                  <span className="font-semibold text-ink-600 truncate">
                    {cityDisplayName(alt.departure_city, locale)} →{' '}
                    {cityDisplayName(alt.arrival_city, locale)}
                  </span>
                  <span className="text-ink-300">·</span>
                  <span className="text-ink-500 num-display">
                    {formatShortDate(alt.departure_date)}
                  </span>
                  <span className="text-ink-500 num-display ml-auto flex-shrink-0">
                    {t.me2_from_price.replace('{amount}', String(alt.compensation_min))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-400 mb-3 leading-relaxed">
              {t.me2_cancelled_alt_none}
            </p>
          )}

          <Link
            href={searchHref}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13.5px] font-semibold transition-colors"
          >
            {t.me2_cancelled_find_another}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * What happened to the money, in the sender's terms.
 *
 * 'refunded' and 'canceled' are settled outcomes. 'captured' on a cancelled
 * booking means the refund did not go through — the server logs it and the
 * migration's check query finds it, but the sender is the one actually waiting
 * for the money, so they are told plainly rather than shown a reassuring
 * sentence that happens to be false.
 */
function RefundLine({ booking }: { booking: CancelledBooking }) {
  const { t } = useI18n();
  const amount = (booking.payment_amount ?? 0) / 100;

  if (booking.payment_status === 'unpaid') return null;

  const [tone, text] =
    booking.payment_status === 'refunded'
      ? (['mint', t.me2_cancelled_refunded.replace('{amount}', formatEuros(amount))] as const)
      : // 'authorized' here means the void did not go through. Same message as
        // a clean release on purpose: an uncaptured hold expires by itself and
        // never becomes a charge, so the sender's situation is identical and
        // the distinction is ours to worry about, not theirs.
        booking.payment_status === 'canceled' || booking.payment_status === 'authorized'
      ? (['mint', t.me2_cancelled_never_charged] as const)
      : booking.payment_status === 'captured'
      ? (['butter', t.me2_cancelled_refund_pending.replace('{amount}', formatEuros(amount))] as const)
      : (['ink', t.me2_cancelled_no_payment] as const);

  const cls =
    tone === 'mint'
      ? 'bg-mint-50 text-ink-600 border-mint-200/60'
      : tone === 'butter'
      ? 'bg-butter-50 text-ink-600 border-butter-200/60'
      : 'bg-cream-100 text-ink-500 border-ink-50';

  return (
    <div className={`rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${cls}`}>
      {text}
    </div>
  );
}
