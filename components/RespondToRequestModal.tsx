'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight, Loader2, X, AlertCircle, ShieldCheck, Plane, Plus,
} from 'lucide-react';
import { formatShortDate, formatEuros, nameInitial, displayName, priceBreakdown } from '@/lib/utils';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import type { ShippingRequestRow, Profile, TravelerTripRow } from '@/lib/supabase/types';

type RequestWithProfile = ShippingRequestRow & {
  profile: Pick<
    Profile,
    'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'
  > | null;
};

type Props = {
  request: RequestWithProfile;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Traveler-side modal: confirm responding to a shipping request.
 *
 * Per the "voyage d'abord" product vision, every proposal must be tied
 * to a concrete trip. The user either:
 *   - picks an existing future trip from their list, OR
 *   - creates a new one inline (pre-filled with the request's route)
 */
export function RespondToRequestModal({ request, onClose, onSuccess }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [trips, setTrips] = useState<TravelerTripRow[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | 'new' | ''>('');
  const [newTripDate, setNewTripDate] = useState('');
  const newTripCompensation = 50;

  const senderName = displayName(request.profile?.full_name) || t.rev_respond_sender_fallback;
  const initial = nameInitial(request.profile?.full_name);
  const category = ITEM_CATEGORIES.find((c) => c.value === request.item_category);

  // The budget IS the traveler's amount. It is what the sender chose to give
  // them, not a total to divide back out — the fee is added on top of it, and
  // is the sender's to pay.
  const netTraveler = request.budget;
  const jiblyFee = priceBreakdown(request.budget).fees;

  // Load my future, non-cancelled trips. Auto-select one that matches
  // the route if any; otherwise default to "new trip".
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setTripsLoading(true);
    browser
      .listMyTrips(user.id)
      .then((rows) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const usable = rows.filter(
          (tr) => tr.status !== 'cancelled' && tr.departure_date >= today
        );
        setTrips(usable);

        const matching = usable.find(
          (tr) =>
            tr.departure_city.toLowerCase().includes(request.pickup_city.toLowerCase()) &&
            tr.arrival_city.toLowerCase().includes(request.destination_city.toLowerCase())
        );
        if (matching) setSelectedTripId(matching.id);
        else if (usable.length === 0) setSelectedTripId('new');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTripsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, request.pickup_city, request.destination_city]);

  function isValid(): boolean {
    if (!selectedTripId) return false;
    if (selectedTripId === 'new' && !newTripDate) return false;
    return true;
  }

  async function handleSubmit() {
    if (!user) {
      router.push(`/login?next=/`);
      return;
    }
    if (!isValid()) return;
    setSubmitting(true);
    setErr(null);

    try {
      let tripId: string;
      if (selectedTripId === 'new') {
        const newTrip = await browser.createTrip({
          user_id: user.id,
          departure_country: request.pickup_country,
          departure_city: request.pickup_city,
          arrival_country: request.destination_country,
          arrival_city: request.destination_city,
          departure_date: newTripDate,
          arrival_date: null,
          compensation_min: newTripCompensation,
          compensation_max: null,
          available_weight_kg: null,
          available_space: 'enveloppe',
          flight_time: null,
          flight_number: null,
          departure_airport: null,
          arrival_airport: null,
          notes: null,
          status: 'open',
        });
        tripId = newTrip.id;
      } else {
        tripId = selectedTripId as string;
      }

      await browser.createBookingIntent({
        sender_id: request.user_id,
        traveler_trip_id: tripId,
        item_category: request.item_category,
        item_description: request.item_description,
        // budget is what the sender offers the TRAVELER. proposed_price is
        // what the sender PAYS, which is that plus the commission — the same
        // total priceBreakdown() produces everywhere else.
        //
        // Passing budget straight through charged the sender 5.00 instead of
        // 6.25 and then, because splitAmount() correctly divides a total back
        // out, paid the traveler 3.91. Both sides short, and Jibly quietly
        // taking the difference.
        proposed_price: priceBreakdown(request.budget).total,
        pickup_city: request.pickup_city,
        destination_city: request.destination_city,
        payment_status: 'unpaid',
        payment_intent_id: null,
        payment_amount: Math.round(priceBreakdown(request.budget).total * 100),
        shipping_request_id: request.id,
        traveler_message: message.trim() || null,
        initiated_by: 'traveler',
        traveler_user_id: user.id,
      });
      onSuccess();
      router.push('/me');
    } catch (e: any) {
      setErr(e?.message ?? t.rev_respond_err_failed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              {t.rev_respond_eyebrow}
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {request.pickup_city} → {request.destination_city}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Request recap */}
        <div className="rounded-2xl bg-white border border-ink-100 p-4 mb-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[13px] text-ink-500">
              {initial}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-ink-600">{senderName}</div>
              <div className="text-[12px] text-ink-400">{t.rev_respond_sender_role}</div>
            </div>
          </div>
          <div className="h-px bg-ink-50" />
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <div className="text-[11px] text-ink-300 uppercase tracking-[0.06em] mb-1">{t.rev_respond_category}</div>
              <div className="text-ink-600 font-medium flex items-center gap-1.5">
                <span>{category?.icon}</span>
                <span>{category ? t[category.labelKey] : request.item_category}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-300 uppercase tracking-[0.06em] mb-1">{t.rev_respond_before_date}</div>
              <div className="text-ink-600 font-medium num-display">
                {formatShortDate(request.desired_delivery_date)}
              </div>
            </div>
          </div>
        </div>

        {/* Trip selection */}
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            <Plane className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {t.rev_respond_which_flight}
          </label>
          {tripsLoading ? (
            <div className="rounded-xl bg-white border border-ink-100 px-4 py-3 text-[13px] text-ink-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t.rev_respond_loading_flights}
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setSelectedTripId(tr.id)}
                  className={`w-full text-left rounded-xl px-3.5 py-2.5 border transition-colors ${
                    selectedTripId === tr.id
                      ? 'border-ink-500 bg-cream-100'
                      : 'border-ink-100 bg-white hover:border-ink-300'
                  }`}
                >
                  <div className="text-[13px] font-medium text-ink-600">
                    {tr.departure_city} → {tr.arrival_city}
                  </div>
                  <div className="text-[12px] text-ink-400">
                    {formatShortDate(tr.departure_date)}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedTripId('new')}
                className={`w-full text-left rounded-xl px-3.5 py-2.5 border-2 border-dashed transition-colors ${
                  selectedTripId === 'new'
                    ? 'border-ink-500 bg-cream-100'
                    : 'border-ink-200 bg-white hover:border-ink-300'
                }`}
              >
                <div className="text-[13px] font-semibold text-ink-600 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {t.rev_respond_new_flight}
                </div>
                <div className="text-[12px] text-ink-400 mt-0.5">
                  {request.pickup_city} → {request.destination_city}
                </div>
              </button>

              {selectedTripId === 'new' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="ml-1 mt-2 space-y-2.5 overflow-hidden"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-400 tracking-[0.06em] uppercase mb-1">
                      {t.rev_respond_flight_date}
                    </label>
                    <input
                      type="date"
                      value={newTripDate}
                      onChange={(e) => setNewTripDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-ink-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300"
                    />
                  </div>
                  <p className="text-[11px] text-ink-400 leading-relaxed">
                    {t.rev_respond_flight_saved_note}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="rounded-2xl bg-mint-50 border border-mint-200/60 p-4 mb-5 space-y-2">
          <div className="text-[11px] font-semibold text-mint-700 tracking-[0.06em] uppercase">
            {t.rev_respond_if_accepted}
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-500">{t.rev_respond_you_receive}</span>
            <span className="font-bold text-mint-600 text-[18px] num-display">
              {formatEuros(netTraveler)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px] text-ink-400">
            <span>{t.rev_respond_jibly_protection}</span>
            <span className="num-display">{formatEuros(jiblyFee)}</span>
          </div>
        </div>

        {/* Optional message */}
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            {t.rev_respond_message_label}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.rev_respond_message_placeholder}
            rows={2}
            maxLength={500}
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
          />
        </div>

        {/* Reassurance */}
        <div className="rounded-xl bg-cream-100 px-4 py-3 mb-5 text-[12px] text-ink-500 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-ink-400" />
          {t.rev_respond_reassurance}
        </div>

        {err && (
          <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            {t.rev_cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !isValid()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {submitting ? t.rev_sending : t.rev_respond_submit}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
