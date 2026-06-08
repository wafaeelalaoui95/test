'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Upload,
  AlertCircle,
  Loader2,
  Sparkles,
  Plane,
  Star,
  ShieldCheck,
  X,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea, Checkbox, Input } from '@/components/ui/Form';
import { Stepper } from '@/components/ui/Stepper';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { ITEM_CATEGORIES, FORBIDDEN_CATEGORIES } from '@/lib/constants';
import { formatShortDate, displayName, nameInitial, formatEuros } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import type { ItemCategory } from '@/lib/types';
import type { MatchingTrip } from '@/lib/supabase/queries';

// The flow now has TWO modes:
//   - "choose" : search bar + travelers → instant book via modal (default)
//   - "public" : fallback wizard for when no traveler matches or user opts out
type Mode = 'choose' | 'public';

export default function EnvoyerPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const STEPS = [t.send_step_route, t.send_step_item, t.send_step_details, t.send_step_confirm];

  // Mode controls whether we're on the search bar (choose) or in the
  // public-request wizard. Users start in 'choose' — they see travelers
  // first and only fall back to the wizard if needed.
  const [mode, setMode] = useState<Mode>('choose');

  // ---- Shared form data (used by both modes) ----
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');

  // ---- Live preview of matching trips ----
  const [previewTrips, setPreviewTrips] = useState<MatchingTrip[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ---- Instant-booking modal state ----
  const [tripToBook, setTripToBook] = useState<MatchingTrip | null>(null);

  // ---- Public-request wizard state (only used in 'public' mode) ----
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(30);
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live search for travelers — debounced. Fires while in 'choose' mode only.
  useEffect(() => {
    if (mode !== 'choose') return;
    if (!fromCity || !toCity || !date) {
      setPreviewTrips([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(() => {
      browser
        .listMatchingTripsForRequest(fromCity, toCity, date, user?.id || null)
        .then((trips) => {
          if (cancelled) return;
          setPreviewTrips(trips);
        })
        .catch((e) => {
          console.warn('[envoyer] preview failed:', e);
          if (!cancelled) setPreviewTrips([]);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [fromCity, toCity, date, mode]);

  // ---- WIZARD canNext (public mode only) ----
  const canNext = () => {
    if (step === 0) return fromCity && toCity && date;
    if (step === 1) {
      if (!category || !description) return false;
      return true;
    }
    if (step === 2) return budget > 0;
    if (step === 3) return terms;
    return false;
  };

  // ---- PUBLIC-MODE SUBMIT ----
  async function handlePublicSubmit() {
    if (!user) {
      router.push('/login?next=/envoyer');
      return;
    }
    if (!fromCity || !toCity || !category) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await browser.createShippingRequest({
        user_id: user.id,
        item_title: null,
        item_category: category,
        item_description: description,
        pickup_country: '',
        pickup_city: fromCity,
        destination_country: '',
        destination_city: toCity,
        desired_delivery_date: date,
        budget,
        weight_kg: null,
        urgency_level: 'standard',
        prescription_url: null,
        status: 'pending',
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? t.auth_error_generic);
    } finally {
      setSubmitting(false);
    }
  }

  function switchToPublic() {
    // Preserve what they typed in the search bar — no need to ask again.
    // Jump to step 1 since the route is already filled in.
    setMode('public');
    setStep(1);
  }

  // =========================================================================
  // SUCCESS SCREEN (public-mode only — instant-booking handles its own redirect)
  // =========================================================================
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-7">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-4 tracking-[-0.025em]">
            {t.send_success_title}
          </h1>
          <p className="text-[16px] text-ink-400 mb-9 leading-relaxed">
            On vous prévient dès qu&apos;un voyageur correspond à votre trajet.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/me">
              <Button variant="secondary" fullWidth>{t.nav_my_space}</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" fullWidth>{t.send_success_back}</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // CHOOSE MODE — search bar + travelers list
  // =========================================================================
  if (mode === 'choose') {
    const hasRouteAndDate = fromCity && toCity && date;
    const hasResults = previewTrips.length > 0;

    return (
      <div className="min-h-screen py-12 lg:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
              {t.send_title}
            </h1>
            <p className="text-[16px] text-ink-400 leading-relaxed">
              Réservez un voyageur disponible, ou publiez une demande publique.
            </p>
          </div>

          {/* Horizontal search bar — same look as the home */}
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.10)] border border-ink-50/60 p-2">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Départ
                </label>
                <CityCombobox
                  value={fromCity}
                  onChange={setFromCity}
                  placeholder="Paris, Casablanca…"
                />
              </div>

              <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Arrivée
                </label>
                <CityCombobox
                  value={toCity}
                  onChange={setToCity}
                  placeholder="Londres, Marrakech…"
                />
              </div>

              <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Avant le
                </label>
                <div className="relative">
                  <Calendar className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full ps-5 pe-2 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none num-display"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results section */}
          <div className="mt-8">
            {!hasRouteAndDate ? (
              <p className="text-[14px] text-ink-400 text-center py-8">
                Remplissez la route et la date pour découvrir les voyageurs disponibles.
              </p>
            ) : previewLoading ? (
              <div className="flex items-center justify-center gap-2.5 py-8 text-[13px] text-ink-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recherche de voyageurs…</span>
              </div>
            ) : hasResults ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-lavender-500" />
                  <p className="text-[14px] font-semibold text-ink-600">
                    {previewTrips.length === 1
                      ? '1 voyageur disponible'
                      : `${previewTrips.length} voyageurs disponibles`}
                  </p>
                  <span className="text-[13px] text-ink-400">
                    avant le {formatShortDate(date)}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {previewTrips.slice(0, 8).map((trip) => (
                    <TripBookableCard
                      key={trip.id}
                      trip={trip}
                      onBook={() => setTripToBook(trip)}
                    />
                  ))}
                  {previewTrips.length > 8 && (
                    <p className="text-[12px] text-ink-400 text-center pt-2">
                      Et {previewTrips.length - 8} autres voyageurs…
                    </p>
                  )}
                </div>

                {/* Fallback always visible: if none of the matches fit, the
                    user can still publish a public request. */}
                <div className="mt-6 pt-6 border-t border-ink-100">
                  <button
                    onClick={switchToPublic}
                    className="w-full text-center text-[14px] text-ink-500 hover:text-ink-600 transition-colors group"
                  >
                    Aucun ne me convient ?{' '}
                    <span className="font-semibold underline underline-offset-2 group-hover:text-lavender-600">
                      Publier une demande publique
                    </span>{' '}
                    <ArrowRight className="inline w-3.5 h-3.5 -mt-0.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              // No match found — guide the user straight into the public flow.
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                  <Plane className="w-6 h-6 text-ink-400" />
                </div>
                <h3 className="text-[18px] font-bold text-ink-600 mb-2 tracking-[-0.01em]">
                  Aucun voyageur sur cette route
                </h3>
                <p className="text-[14px] text-ink-400 mb-7 leading-relaxed max-w-md mx-auto">
                  Publiez une demande publique — les voyageurs qui passeront par là pourront vous proposer leur aide.
                </p>
                <Button onClick={switchToPublic}>
                  Continuer ma demande
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* INSTANT BOOKING MODAL */}
        <AnimatePresence>
          {tripToBook && user && (
            <InstantBookModal
              trip={tripToBook}
              senderId={user.id}
              pickupCity={fromCity}
              destinationCity={toCity}
              onClose={() => setTripToBook(null)}
              onSuccess={() => router.push('/me')}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // PUBLIC WIZARD — for when no traveler matched or user opted out
  // =========================================================================
  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="mb-6">
          <button
            onClick={() => setMode('choose')}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour aux voyageurs
          </button>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
            Publier une demande publique
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">
            Nous vous notifierons dès qu&apos;un voyageur propose son aide.
          </p>
        </div>

        <div className="mb-10">
          <Stepper steps={STEPS} current={step} />
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-ink-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.send_route_title}</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.send_label_from}</label>
                      <CityCombobox value={fromCity} onChange={setFromCity} placeholder="Paris…" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.send_label_to}</label>
                      <CityCombobox value={toCity} onChange={setToCity} placeholder="Casablanca…" />
                    </div>
                  </div>
                  <Input
                    type="date"
                    label={t.send_label_date}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.send_item_title}</h2>

                  <div className="grid grid-cols-2 gap-3">
                    {ITEM_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`p-4 rounded-2xl border text-start transition-all ${
                          category === c.value
                            ? 'border-ink-500 bg-cream-100'
                            : 'border-ink-100 bg-white hover:border-ink-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">{c.icon}</div>
                        <div className="font-semibold text-[15px] text-ink-600">{t[c.labelKey]}</div>
                        <div className="text-[13px] text-ink-400 mt-1">{t[c.descKey]}</div>
                      </button>
                    ))}
                  </div>

            
                  <Textarea
                    label={t.send_label_description}
                    placeholder={t.send_placeholder_description}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  <div className="rounded-2xl bg-blush-50 p-4">
                    <p className="text-[12px] font-semibold text-blush-500 uppercase tracking-[0.08em] mb-2.5">
                      {t.send_forbidden_title}
                    </p>
                    <p className="text-[14px] text-ink-500 leading-relaxed">
                      {FORBIDDEN_CATEGORIES.join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-7">
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.send_details_title}</h2>

                  <div>
                    <div className="flex items-baseline justify-between mb-3">
                      <label className="block text-[14px] font-semibold text-ink-500">{t.send_label_budget}</label>
                      <span className="text-2xl font-bold text-ink-600 num-display tracking-[-0.02em]">
                        {budget}{t.common_eur}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full h-1.5 bg-ink-100 rounded-full appearance-none accent-ink-500"
                    />
                    <div className="flex justify-between text-[12px] text-ink-300 mt-2">
                      <span>10{t.common_eur}</span>
                      <span>80{t.common_eur}</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.send_confirm_title}</h2>

                  <div className="bg-cream-100 rounded-2xl p-5 space-y-3 text-[14px]">
                    <Row label={t.send_recap_route} value={`${fromCity} → ${toCity}`} />
                    <Row label={t.send_recap_date} value={date} />
                    <Row label={t.send_recap_item} value={category ? t[ITEM_CATEGORIES.find(c => c.value === category)!.labelKey] : '—'} />
                    <Row label={t.send_recap_budget} value={`${budget}${t.common_eur}`} />
                  </div>

                  <Checkbox name="terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} label={<span>{t.send_terms}</span>} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <div className="mt-5 rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
              {submitError}
            </div>
          )}

          <div className="flex gap-3 mt-8 pt-6 border-t border-ink-50">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
                <ArrowLeft className="w-4 h-4" />
                {t.common_back}
              </Button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <Button disabled={!canNext()} onClick={() => setStep(step + 1)}>
                {t.common_next}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button disabled={!canNext() || submitting || authLoading} onClick={handlePublicSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t.send_publish}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-400">{label}</span>
      <span className="font-semibold text-ink-600 text-end">{value}</span>
    </div>
  );
}

// =============================================================================
// TripBookableCard — clickable card with a "Réserver" button.
// =============================================================================
function TripBookableCard({
  trip,
  onBook,
}: {
  trip: MatchingTrip;
  onBook: () => void;
}) {
  const name = displayName(trip.user?.full_name) || 'Voyageur';
  const initial = nameInitial(trip.user?.full_name);
  const verified =
    trip.user?.verification_level === 'id_verified' ||
    trip.user?.verification_level === 'trusted';

  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50 hover:border-ink-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[13px] text-lavender-700">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[14px] flex-wrap">
            <span className="font-semibold text-ink-600">{name}</span>
            {verified && (
              <ShieldCheck className="w-3.5 h-3.5 text-mint-500" strokeWidth={2.5} />
            )}
            {(trip.user?.rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-ink-400">
                <Star className="w-3 h-3 fill-butter-500 text-butter-500" />
                <span className="num-display">{trip.user!.rating.toFixed(1)}</span>
              </span>
            )}
            {(trip.user?.trips_completed ?? 0) > 0 && (
              <span className="text-[11px] text-ink-300">
                · {trip.user!.trips_completed} trajets
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-0.5">
            <Plane className="w-3 h-3 -rotate-12" />
            <span className="num-display">{formatShortDate(trip.departure_date)}</span>
            {trip.flight_number && (
              <span className="text-ink-300">· {trip.flight_number}</span>
            )}
            <span className="text-ink-300">·</span>
            <span className="font-semibold text-ink-600 num-display">
              {formatEuros(trip.compensation_min)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[12px] font-semibold transition-colors"
        >
          Réserver
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// InstantBookModal — heart of the instant flow.
// Two phases: 1) describe package (category + description), 2) pay via Stripe.
// On success: creates a shipping_request + a booking_intent linking the trip.
// =============================================================================
function InstantBookModal({
  trip,
  senderId,
  pickupCity,
  destinationCity,
  onClose,
  onSuccess,
}: {
  trip: MatchingTrip;
  senderId: string;
  pickupCity: string;
  destinationCity: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'describe' | 'pay'>('describe');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const travelerName = displayName(trip.user?.full_name) || 'Le voyageur';
  // Price is fixed by the traveler — sender doesn't negotiate here.
  const price = trip.compensation_min;
  const canPay = !!category && description.trim().length > 0;

  async function handleAuthorized(paymentIntentId: string) {
    if (!category) return;
    setBusy(true);
    setErr(null);
    try {
      // 1. Create a minimal shipping_request for traceability so the booking
      //    has a parent record in the sender's history. Marked 'matched'
      //    because we're booking a specific traveler — no need to be in
      //    the public pool.
      const req = await browser.createShippingRequest({
        user_id: senderId,
        item_title: null,
        item_category: category,
        item_description: description,
        pickup_country: '',
        pickup_city: pickupCity,
        destination_country: '',
        destination_city: destinationCity,
        // The trip's departure date IS the delivery date in this flow.
        desired_delivery_date: trip.departure_date,
        budget: price,
        weight_kg: null,
        urgency_level: 'standard',
        prescription_url: null,
        status: 'matched',
      });

      // 2. Create the booking_intent pointing at the trip, payment already
      //    authorized. The traveler sees a "new request" with money held.
      await browser.createBookingIntent({
        sender_id: senderId,
        traveler_trip_id: trip.id,
        traveler_user_id: trip.user_id,
        item_category: category,
        item_description: description,
        proposed_price: price,
        pickup_city: pickupCity,
        destination_city: destinationCity,
        payment_intent_id: paymentIntentId,
        payment_status: 'authorized',
        payment_amount: Math.round(price * 100),
        shipping_request_id: req.id || null,
        initiated_by: 'sender',
      });
      onSuccess();
    } catch (e: any) {
      setErr(e?.message ?? 'Échec de la création. Contactez le support.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              {phase === 'describe' ? 'Décrire le colis' : 'Confirmer le paiement'}
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              Réserver {travelerName}
            </h2>
            <div className="text-[13px] text-ink-400 mt-1.5">
              {pickupCity} → {destinationCity} · {formatShortDate(trip.departure_date)}
              {trip.flight_number && <> · {trip.flight_number}</>}
            </div>
            <div className="mt-2 inline-flex items-baseline gap-1.5">
              <span className="text-[11px] text-ink-300 uppercase tracking-[0.08em]">Prix fixé</span>
              <span className="text-xl font-extrabold text-ink-600 num-display">
                {formatEuros(price)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'describe' ? (
            <motion.div
              key="describe"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[13px] font-semibold text-ink-500 mb-3">
                  Catégorie du colis
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {ITEM_CATEGORIES.map((c) => {
                    const active = category === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-start transition-all ${
                          active
                            ? 'border-ink-500 bg-cream-100'
                            : 'border-ink-100 bg-white hover:border-ink-300'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{c.icon}</span>
                        <span className="text-[13px] font-medium text-ink-600 truncate">
                          {t[c.labelKey]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Textarea
                label="Description"
                placeholder="Que souhaitez-vous envoyer ?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3 text-[12px] text-ink-500 leading-relaxed">
                <div className="font-bold text-mint-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Protection Jibly incluse
                </div>
                Votre paiement est bloqué et ne sera versé au voyageur qu&apos;une fois la livraison confirmée.
              </div>

              <div className="flex justify-end">
                <Button disabled={!canPay} onClick={() => setPhase('pay')}>
                  Continuer vers le paiement
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              {err && (
                <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">
                  {err}
                </div>
              )}
              <StripePaymentForm
                amountEuros={price}
                description={`Jibly · ${pickupCity} → ${destinationCity}`}
                onAuthorized={handleAuthorized}
                onCancel={() => setPhase('describe')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
