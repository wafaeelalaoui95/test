'use client';

import { useState, useEffect, useMemo } from 'react';
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

export default function EnvoyerPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const STEPS = [t.send_step_route, t.send_step_item, t.send_step_details, t.send_step_confirm];

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form data — city fields are now plain strings (no country/flag) to match
  // the CityCombobox UX. We pass empty strings as country to satisfy NOT NULL
  // DB constraints; if you need country later, add a reverse lookup or a
  // separate field.
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [date, setDate] = useState('');

  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [description, setDescription] = useState('');
  const [prescription, setPrescription] = useState<File | null>(null);

  const [budget, setBudget] = useState(30);
  const [terms, setTerms] = useState(false);

  // Live preview of matching travelers — fetched as soon as the user has
  // filled in route + date in step 0. Gives them confidence before they
  // proceed with the full form ("✨ 3 voyageurs déjà disponibles").
  const [previewTrips, setPreviewTrips] = useState<MatchingTrip[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  // If the user clicks on a specific traveler in the preview, we remember
  // their trip so the final step can default to booking THIS traveler.
  const [selectedTrip, setSelectedTrip] = useState<MatchingTrip | null>(null);

  // After publish: matching results for the success screen + the resulting
  // shipping_request id (used to link any booking_intent back to it).
  const [matchingTrips, setMatchingTrips] = useState<MatchingTrip[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [tripToBook, setTripToBook] = useState<MatchingTrip | null>(null);

  const canNext = () => {
    if (step === 0) return fromCity && toCity && date;
    if (step === 1) {
      if (!category || !description) return false;
      if (category === 'medicaments' && !prescription) return false;
      return true;
    }
    if (step === 2) return budget > 0;
    if (step === 3) return terms;
    return false;
  };

  // Live preview effect — debounced so we don't hammer Supabase while the
  // user is typing. The 400ms delay is the sweet spot: long enough that
  // a fast typer triggers one fetch instead of one per keystroke, short
  // enough that the result feels instant once they stop.
  useEffect(() => {
    if (!fromCity || !toCity || !date) {
      setPreviewTrips([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(() => {
      browser
        .listMatchingTripsForRequest(fromCity, toCity, date)
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
  }, [fromCity, toCity, date]);

  async function handleSubmit() {
    if (!user) {
      router.push('/login?next=/envoyer');
      return;
    }
    if (!fromCity || !toCity || !category) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const created = await browser.createShippingRequest({
        user_id: user.id,
        item_title: null,
        item_category: category,
        item_description: description,
        // We don't collect country anymore — empty string satisfies NOT NULL.
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
      setCreatedRequestId(created.id || null);
      setSubmitted(true);

      // If the user pre-selected a traveler in step 0, open the booking
      // modal directly. Otherwise, fall back to the general matching list.
      if (selectedTrip) {
        setTripToBook(selectedTrip);
      } else {
        setMatchingLoading(true);
        browser
          .listMatchingTripsForRequest(fromCity, toCity, date)
          .then((trips) => setMatchingTrips(trips))
          .catch((e) => console.warn('[envoyer] matching failed:', e))
          .finally(() => setMatchingLoading(false));
      }
    } catch (err: any) {
      setSubmitError(err.message ?? t.auth_error_generic);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- SUCCESS SCREEN ----
  if (submitted) {
    const hasMatches = matchingTrips.length > 0;
    const matchCount = matchingTrips.length;

    return (
      <div className="min-h-screen py-12 lg:py-20 px-5">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-7">
              <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-4 tracking-[-0.025em]">
              {t.send_success_title}
            </h1>
            <p className="text-[16px] text-ink-400 leading-relaxed max-w-md mx-auto">
              {t.send_success_text}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {matchingLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2.5 py-6 text-[13px] text-ink-400"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recherche de voyageurs disponibles…</span>
              </motion.div>
            ) : hasMatches ? (
              <motion.div
                key="matches"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-gradient-to-br from-lavender-50 to-lavender-100/60 border border-lavender-200 rounded-2xl p-5 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-lavender-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-[17px] font-extrabold text-lavender-700 tracking-[-0.01em] mb-1">
                        Bonne nouvelle !
                      </h2>
                      <p className="text-[14px] text-ink-500 leading-relaxed">
                        <strong className="text-ink-600">
                          {matchCount === 1
                            ? '1 voyageur est déjà disponible'
                            : `${matchCount} voyageurs sont déjà disponibles`}
                        </strong>{' '}
                        sur votre route {fromCity} → {toCity}, avant le {formatShortDate(date)}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-7">
                  {matchingTrips.slice(0, 4).map((trip) => (
                    <TripMatchCard
                      key={trip.id}
                      trip={trip}
                      onBook={() => setTripToBook(trip)}
                    />
                  ))}
                  {matchingTrips.length > 4 && (
                    <p className="text-[12px] text-ink-400 text-center pt-2">
                      Et {matchingTrips.length - 4} autres voyageurs sur cette route…
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  <Link
                    href={`/?type=voyageurs&from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
                  >
                    <Button fullWidth>
                      Voir tous les voyageurs
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/me">
                    <Button variant="ghost" fullWidth>
                      Plus tard, voir mes envois
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="no-matches"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-[14px] text-ink-400 mb-7 leading-relaxed max-w-md mx-auto">
                  Aucun voyageur ne correspond pour l&apos;instant à votre route. Nous vous notifierons dès qu&apos;un voyageur publie un trajet compatible.
                </p>
                <div className="flex flex-col gap-2.5 max-w-md mx-auto">
                  <Link href="/me">
                    <Button variant="secondary" fullWidth>{t.nav_my_space}</Button>
                  </Link>
                  <Link href="/">
                    <Button variant="ghost" fullWidth>{t.send_success_back}</Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {tripToBook && user && category && (
            <BookingPaymentModal
              trip={tripToBook}
              senderId={user.id}
              shippingRequestId={createdRequestId}
              itemCategory={category}
              itemDescription={description}
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

  // ---- WIZARD ----
  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
            {t.send_title}
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">{t.send_subtitle}</p>
        </div>

        <div className="mb-10">
          <Stepper steps={STEPS} current={step} />
        </div>

        {/* STEP 0 is now a horizontal search bar mirroring the home page,
            so the user sees results AS they fill it in. The other steps
            keep the wizard card style they had before. */}
        {step === 0 ? (
          <div>
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

            {/* Live results under the bar. We show them as soon as the route+date
                are filled. Clicking a card pre-selects that traveler so the
                booking modal opens directly on this person after the wizard. */}
            <div className="mt-8">
              {!fromCity || !toCity || !date ? (
                <p className="text-[14px] text-ink-400 text-center py-8">
                  Remplissez la route et la date pour découvrir les voyageurs disponibles.
                </p>
              ) : previewLoading ? (
                <div className="flex items-center justify-center gap-2.5 py-8 text-[13px] text-ink-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recherche de voyageurs…</span>
                </div>
              ) : previewTrips.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[14px] text-ink-400 leading-relaxed mb-2">
                    Aucun voyageur sur cette route pour l&apos;instant.
                  </p>
                  <p className="text-[12px] text-ink-300">
                    Continuez quand même — nous vous notifierons dès qu&apos;un voyageur publie.
                  </p>
                </div>
              ) : (
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
                    {previewTrips.slice(0, 5).map((trip) => (
                      <PreviewTripCard
                        key={trip.id}
                        trip={trip}
                        selected={selectedTrip?.id === trip.id}
                        onClick={() => {
                          // Toggle selection — clicking the same trip again
                          // de-selects it (back to "any traveler" mode).
                          setSelectedTrip(
                            selectedTrip?.id === trip.id ? null : trip
                          );
                        }}
                      />
                    ))}
                    {previewTrips.length > 5 && (
                      <p className="text-[12px] text-ink-400 text-center pt-2">
                        Et {previewTrips.length - 5} autres voyageurs…
                      </p>
                    )}
                  </div>
                  {selectedTrip && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-xl bg-lavender-50 border border-lavender-200 px-4 py-3 text-[13px] text-lavender-700"
                    >
                      <strong>{displayName(selectedTrip.user?.full_name) || 'Ce voyageur'}</strong> est sélectionné. Vous pourrez le réserver directement à la fin du formulaire.
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Steps 1+ keep the wizard-card look they had before.
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-ink-50">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
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

                    {category === 'medicaments' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-butter-50 rounded-2xl p-4"
                      >
                        <p className="text-[14px] text-ink-500 font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-butter-600" />
                          {t.send_prescription_required}
                        </p>
                        <label className="inline-block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setPrescription(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-butter-200 text-[14px] font-semibold text-ink-600 hover:bg-butter-100 transition-colors">
                            <Upload className="w-4 h-4" />
                            {prescription ? prescription.name : t.send_upload_prescription}
                          </span>
                        </label>
                      </motion.div>
                    )}

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
                      {selectedTrip && (
                        <Row
                          label="Voyageur choisi"
                          value={displayName(selectedTrip.user?.full_name) || 'Voyageur'}
                        />
                      )}
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
          </div>
        )}

        {/* Navigation buttons — outside the card so they sit consistently
            below either the search bar (step 0) or the wizard card (1+). */}
        <div className="flex gap-3 mt-8">
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
            <Button disabled={!canNext() || submitting || authLoading} onClick={handleSubmit}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t.send_publish}
            </Button>
          )}
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
// PreviewTripCard — used in step 0 of the wizard. Selectable: clicking it
// pre-selects the traveler so the success screen can book them directly.
// Dense layout, soft hover, distinct "selected" state.
// =============================================================================
function PreviewTripCard({
  trip,
  selected,
  onClick,
}: {
  trip: MatchingTrip;
  selected: boolean;
  onClick: () => void;
}) {
  const name = displayName(trip.user?.full_name) || 'Voyageur';
  const initial = nameInitial(trip.user?.full_name);
  const verified =
    trip.user?.verification_level === 'id_verified' ||
    trip.user?.verification_level === 'trusted';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start bg-white rounded-xl px-3 py-2.5 border transition-all ${
        selected
          ? 'border-lavender-500 ring-2 ring-lavender-200 shadow-[0_4px_20px_-8px_rgba(116,88,232,0.3)]'
          : 'border-ink-50 hover:border-ink-200'
      }`}
    >
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
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-0.5">
            <Plane className="w-3 h-3 -rotate-12" />
            <span className="num-display">{formatShortDate(trip.departure_date)}</span>
            {trip.flight_number && (
              <span className="text-ink-300">· {trip.flight_number}</span>
            )}
            <span className="text-ink-300">· dès</span>
            <span className="font-semibold text-ink-500 num-display">{trip.compensation_min}€</span>
          </div>
        </div>
        {selected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lavender-500 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// TripMatchCard — used on the SUCCESS screen, has a "Réserver" CTA.
// =============================================================================
function TripMatchCard({ trip, onBook }: { trip: MatchingTrip; onBook: () => void }) {
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
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-0.5">
            <Plane className="w-3 h-3 -rotate-12" />
            <span className="num-display">{formatShortDate(trip.departure_date)}</span>
            {trip.flight_number && (
              <span className="text-ink-300">· {trip.flight_number}</span>
            )}
            <span className="text-ink-300">· dès</span>
            <span className="font-semibold text-ink-500 num-display">{trip.compensation_min}€</span>
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
// BookingPaymentModal — Stripe payment for a sender→trip booking.
// =============================================================================
function BookingPaymentModal({
  trip,
  senderId,
  shippingRequestId,
  itemCategory,
  itemDescription,
  pickupCity,
  destinationCity,
  onClose,
  onSuccess,
}: {
  trip: MatchingTrip;
  senderId: string;
  shippingRequestId: string | null;
  itemCategory: string;
  itemDescription: string;
  pickupCity: string;
  destinationCity: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const travelerName = displayName(trip.user?.full_name) || 'Le voyageur';
  const price = trip.compensation_min;

  async function handleAuthorized(paymentIntentId: string) {
    setBusy(true);
    setErr(null);
    try {
      await browser.createBookingIntent({
        sender_id: senderId,
        traveler_trip_id: trip.id,
        traveler_user_id: trip.user_id,
        item_category: itemCategory,
        item_description: itemDescription,
        proposed_price: price,
        pickup_city: pickupCity,
        destination_city: destinationCity,
        payment_intent_id: paymentIntentId,
        payment_status: 'authorized',
        payment_amount: Math.round(price * 100),
        shipping_request_id: shippingRequestId,
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
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              Réserver et payer
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {formatEuros(price)}
            </h2>
            <div className="text-[13px] text-ink-400 mt-1.5">
              Avec {travelerName} · {pickupCity} → {destinationCity}
            </div>
            {trip.flight_number && (
              <div className="text-[12px] text-ink-400 mt-0.5">
                Vol {trip.flight_number} · {formatShortDate(trip.departure_date)}
              </div>
            )}
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

        <div className="rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3 mb-4 text-[12px] text-ink-500 leading-relaxed">
          <div className="font-bold text-mint-700 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Protection Jibly incluse
          </div>
          Votre paiement est bloqué et ne sera versé au voyageur qu&apos;une
          fois la livraison confirmée.
        </div>

        {err && (
          <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">
            {err}
          </div>
        )}

        <StripePaymentForm
          amountEuros={price}
          description={`Jibly · ${pickupCity} → ${destinationCity}`}
          onAuthorized={handleAuthorized}
          onCancel={onClose}
        />
      </motion.div>
    </motion.div>
  );
}
