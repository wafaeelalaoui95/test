'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { formatEuros, formatShortDate, formatName } from '@/lib/utils';
import { cityDisplayName } from '@/lib/countries';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { TripParcel, TripCancellationReason } from '@/lib/supabase/queries';
import type { Translations } from '@/lib/i18n/translations';
import type { ItemCategory } from '@/lib/supabase/types';

// =============================================================================
// CancelTripModal — a traveller says they are not flying
// =============================================================================
// What this replaces was a trash icon that cancelled the trip on click, with
// no dialog at all, hidden whenever a parcel on the trip had been confirmed.
//
// Hiding it was the wrong fix for the right worry. A traveller whose flight is
// cancelled by the airline still is not flying; taking the button away does
// not keep the parcel moving, it only means the sender is told nothing while
// the trip quietly rots. So the button is always there and the dialog does the
// work instead: it shows who is counting on this trip, by name and by parcel,
// and it will not submit without a reason.
//
// The reason is not analytics. It is copied onto every booking and shown to
// every sender, because "cancelled" with nothing after it is what makes this
// feel like being dropped rather than being told.

const REASONS: Array<{ value: TripCancellationReason; labelKey: keyof Translations }> = [
  // Commonest and most blameless first: a list that opens with an accusation
  // gets clicked past rather than read.
  { value: 'flight_cancelled', labelKey: 'me2_cancel_reason_flight' },
  { value: 'plans_changed', labelKey: 'me2_cancel_reason_plans' },
  { value: 'no_space', labelKey: 'me2_cancel_reason_space' },
  { value: 'safety_concern', labelKey: 'me2_cancel_reason_safety' },
  { value: 'other', labelKey: 'me2_cancel_reason_other' },
];

export function CancelTripModal({
  trip,
  onClose,
  onCancelled,
}: {
  trip: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
  };
  onClose: () => void;
  /** Called after the server has cancelled, so the list can update in place. */
  onCancelled: () => void;
}) {
  const { t, locale } = useI18n();
  const [parcels, setParcels] = useState<TripParcel[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<TripCancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Who is counting on this trip. Loaded rather than passed in: the parent
  // card knows its own packages, but a stale client list is exactly the wrong
  // thing to show someone a second before they strand three people.
  useEffect(() => {
    let cancelled = false;
    browser
      .listActiveBookingsForTrip(trip.id)
      .then((r) => {
        if (!cancelled) setParcels(r.parcels);
      })
      .catch(() => {
        // Unknown rather than none — the dialog falls back to generic wording
        // instead of quietly implying nobody is affected.
        if (!cancelled) setParcels(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  // 'other' is the only reason that cannot stand on its own.
  const canConfirm = !!reason && (reason !== 'other' || note.trim().length > 0);
  const count = parcels?.length ?? 0;

  async function submit() {
    if (!reason || !canConfirm || submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      await browser.cancelTrip(trip.id, reason, note);
      onCancelled();
      onClose();
    } catch (e: any) {
      // The route answers with machine codes. Showing "not_owner" to a person
      // is barely better than showing nothing, and only one of these is worth
      // its own sentence: a trip someone already cancelled in another tab.
      setErr(
        e?.message === 'already_cancelled'
          ? t.me2_cancel_already_done
          : t.me2_cancel_failed
      );
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      >
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[88vh] overflow-y-auto"
        >
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-blush-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-blush-500" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-1.5">
                {t.me2_cancel_trip_q}
              </h3>
              {/* Which trip, spelled out on two lines. Kept from the dialog
                  this replaces, and for its reason: the bug that produced it
                  was a tap deleting a trip the person had never looked at. */}
              <p className="text-[15px] font-semibold text-ink-600 leading-snug">
                {cityDisplayName(trip.departure_city, locale)} →{' '}
                {cityDisplayName(trip.arrival_city, locale)}
              </p>
              <p className="text-[14px] text-ink-500 leading-relaxed num-display">
                {t.me2_cancel_trip_planned.replace(
                  '{date}',
                  formatShortDate(trip.departure_date)
                )}
              </p>
            </div>
          </div>

          {/* The parcels, by name. A count is something you click past. */}
          {loading ? (
            <div className="rounded-xl bg-cream-100 px-4 py-3 mb-5 text-[13px] text-ink-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t.me2_checking_bookings}
            </div>
          ) : count > 0 ? (
            <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3.5 mb-5">
              <p className="text-[13px] font-bold text-ink-600 mb-2.5">
                {count === 1
                  ? t.me2_cancel_one_counting
                  : t.me2_cancel_n_counting.replace('{n}', String(count))}
              </p>
              <div className="space-y-1.5 mb-3">
                {parcels!.map((p) => {
                  const cat = ITEM_CATEGORIES.find(
                    (c) => c.value === (p.item_category as ItemCategory)
                  );
                  const senderName = p.sender_profile?.full_name
                    ? formatName(p.sender_profile.full_name).split(' ')[0]
                    : t.me2_role_sender_lc;
                  return (
                    <div key={p.id} className="flex items-center gap-1.5 text-[13px]">
                      <span className="flex-shrink-0">{cat?.icon ?? '📦'}</span>
                      <span className="font-semibold text-ink-600 truncate">
                        {p.item_title || (cat ? t[cat.labelKey] : p.item_category)}
                      </span>
                      <span className="text-ink-300">·</span>
                      <span className="text-ink-500 truncate">{senderName}</span>
                      <span className="text-ink-300">·</span>
                      <span className="text-ink-500 num-display flex-shrink-0 ml-auto">
                        {formatEuros(p.proposed_price)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[12.5px] text-ink-500 leading-relaxed">
                {t.me2_cancel_consequences}
              </p>
            </div>
          ) : (
            <p className="text-[14px] text-ink-400 mb-5 leading-relaxed">
              {t.me2_cancel_trip_final}
            </p>
          )}

          {/* The reason. Required either way — the trip's own record needs it
              as much as the sender does. */}
          <p className="text-[13px] font-bold text-ink-600 mb-2">
            {count > 0 ? t.me2_cancel_why_required : t.me2_cancel_why}
          </p>
          <div className="space-y-1.5 mb-4">
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                disabled={submitting}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-[13.5px] border transition-colors ${
                  reason === r.value
                    ? 'bg-ink-500 text-cream-50 border-ink-500 font-semibold'
                    : 'bg-white text-ink-600 border-ink-50 hover:border-ink-200'
                }`}
              >
                {t[r.labelKey] as string}
              </button>
            ))}
          </div>

          {reason && (
            <div className="mb-5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                disabled={submitting}
                rows={2}
                placeholder={
                  reason === 'other'
                    ? t.me2_cancel_note_required_ph
                    : t.me2_cancel_note_optional_ph
                }
                className="w-full px-4 py-3 rounded-xl border border-ink-50 bg-white text-[13.5px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:border-ink-200 resize-none"
              />
              {count > 0 && (
                <p className="mt-1.5 text-[12px] text-ink-400">{t.me2_cancel_note_shared}</p>
              )}
            </div>
          )}

          {err && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500 mb-5">
              {err}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
            >
              {t.me2_keep_trip}
            </button>
            <button
              onClick={submit}
              disabled={submitting || !canConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-blush-500 hover:bg-blush-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-full transition-colors"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {submitting ? t.me2_cancelling : t.me2_cancel_trip_confirm}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
