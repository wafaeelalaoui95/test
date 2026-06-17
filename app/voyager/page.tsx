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
  Plane,
  Loader2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Star,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea, Checkbox, Input } from '@/components/ui/Form';
import { Stepper } from '@/components/ui/Stepper';
import { CountryCityPicker } from '@/components/ui/CountryCityPicker';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { formatShortDate, displayName, nameInitial, formatEuros } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import type { AvailableSpace } from '@/lib/types';
import type { MatchingRequest } from '@/lib/supabase/queries';

// Two modes mirroring /envoyer:
//   - "choose" : search bar → existing shipping_requests → instant propose
//   - "public" : full wizard to publish a regular trip
type Mode = 'choose' | 'public';

export default function VoyagerPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const STEPS = [t.trip_step_route, t.trip_step_space, t.trip_step_identity, t.trip_step_validation];

  const [mode, setMode] = useState<Mode>('choose');

  // ---- Shared route data ----
  const [fromCity, setFromCity] = useState('');
  const [fromCountry, setFromCountry] = useState('');
  const [toCity, setToCity] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Flight details — required for credibility in both modes.
  const [flightNumber, setFlightNumber] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [showAirportCodes, setShowAirportCodes] = useState(false);

  // ---- Live preview ----
  const [previewRequests, setPreviewRequests] = useState<MatchingRequest[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ---- Instant-propose modal state ----
  const [requestToHelp, setRequestToHelp] = useState<MatchingRequest | null>(null);
  // Track which requests this user has already proposed help to in this
  // session. We use this to lock their cards visually so the traveler
  // can continue browsing and proposing to other requests on the same
  // flight without leaving the page.
  const [proposedRequestIds, setProposedRequestIds] = useState<string[]>([]);
  // The first proposal of the session creates a minimal traveler_trip.
  // Subsequent proposals on the same flight reuse that trip's id, so we
  // don't end up with N duplicate draft trips in the DB for one flight.
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  // ---- Public wizard state ----
  const [step, setStep] = useState(0);
  const [space, setSpace] = useState<AvailableSpace | null>(null);
  const [minComp, setMinComp] = useState(20);
  const [acceptedCategories, setAcceptedCategories] = useState<string[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const FLIGHT_NUMBER_PATTERN = /^[A-Z]{2,3}\s?\d{1,4}$/i;
  const isValidFlightNumber = (s: string) => FLIGHT_NUMBER_PATTERN.test(s.trim());

  function toggleCategory(value: string) {
    setAcceptedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  // Live preview: as soon as route + date are filled, fetch matching requests.
  // Flight number is gated separately at the propose-button level.
  useEffect(() => {
    if (mode !== 'choose') return;
    if (!fromCity || !toCity || !date) {
      setPreviewRequests([]);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    const handle = setTimeout(() => {
      browser
        .listMatchingRequestsForTrip(fromCity, toCity, date, user?.id || null)
        .then((requests) => {
          if (cancelled) return;
          setPreviewRequests(requests);
        })
        .catch((e) => {
          console.warn('[voyager] preview failed:', e);
          if (!cancelled) setPreviewRequests([]);
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

  const canNext = () => {
    if (step === 0) return fromCity && toCity && date && isValidFlightNumber(flightNumber);
    if (step === 1) return acceptedCategories.length > 0 && minComp >= 0;
    if (step === 2) return true;
    if (step === 3) return terms;
    return false;
  };

  // ---- PUBLIC WIZARD SUBMIT ----
  async function handlePublicSubmit() {
    if (!user) {
      router.push('/login?next=/voyager');
      return;
    }
    if (!fromCity || !toCity) return;
    if (
      fromCity.trim().toLowerCase() === toCity.trim().toLowerCase() &&
      fromCountry.trim().toLowerCase() === toCountry.trim().toLowerCase()
    ) {
      setSubmitError(t.error_same_route);
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await browser.createTrip({
        user_id: user.id,
        departure_country: '',
        departure_city: fromCity,
        arrival_country: '',
        arrival_city: toCity,
        departure_date: date,
        arrival_date: null,
        compensation_min: minComp,
        compensation_max: null,
        available_weight_kg: null,
        available_space: space ?? 'pochette',
        flight_time: time || null,
        flight_number: flightNumber.trim().toUpperCase().replace(/\s+/g, ' '),
        departure_airport: departureAirport.trim().toUpperCase() || null,
        arrival_airport: arrivalAirport.trim().toUpperCase() || null,
        notes: JSON.stringify({ accepted_categories: acceptedCategories }),
        status: 'open',
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? t.auth_error_generic);
    } finally {
      setSubmitting(false);
    }
  }

  function switchToPublic() {
    setMode('public');
    // If they already have a valid flight number, skip the route step
    // (they've filled everything we need there). Otherwise stay on step 0
    // to collect it.
    setStep(isValidFlightNumber(flightNumber) ? 1 : 0);
  }

  // =========================================================================
  // SUCCESS SCREEN (public mode only)
  // =========================================================================
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="w-14 h-14 rounded-full bg-butter-500 mx-auto flex items-center justify-center mb-7">
            <Plane className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-4 tracking-[-0.025em]">
            {t.trip_success_title}
          </h1>
          <p className="text-[16px] text-ink-400 mb-9 leading-relaxed">{t.trip_success_text}</p>
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
  // CHOOSE MODE — search bar + matching requests
  // =========================================================================
  if (mode === 'choose') {
    const hasRouteAndDate = fromCity && toCity && date;
    const hasResults = previewRequests.length > 0;

    return (
      <div className="min-h-screen py-12 lg:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
              {t.trip_title}
            </h1>
            <p className="text-[16px] text-ink-400 leading-relaxed">
              Trouvez un colis à transporter sur votre vol, ou publiez votre trajet.
            </p>
          </div>

          {/* Recap banner: once the traveler has proposed help to at least
              one sender, we surface a friendly recap with a shortcut to
              /me so they can track responses without losing their search. */}
          {proposedRequestIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl bg-mint-50 border border-mint-200 px-5 py-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-mint-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-mint-700">
                  {proposedRequestIds.length === 1
                    ? '1 proposition envoyée'
                    : `${proposedRequestIds.length} propositions envoyées`}
                </div>
                <div className="text-[12px] text-ink-500 mt-0.5">
                  Vous pouvez continuer à proposer votre aide à d&apos;autres expéditeurs ci-dessous.
                </div>
              </div>
              <Link
                href="/me"
                className="flex-shrink-0 text-[12px] font-semibold text-mint-700 hover:text-mint-800 underline underline-offset-2"
              >
                Voir mes propositions
              </Link>
            </motion.div>
          )}

          {/* Horizontal search bar */}
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.10)] border border-ink-50/60 p-2">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Départ
                </label>
                <CountryCityPicker
                  country={fromCountry}
                  city={fromCity}
                  onChange={({ country, city }) => {
                    setFromCountry(country);
                    setFromCity(city);
                  }}
                  enableNearby
                />
              </div>

              <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Arrivée
                </label>
                <CountryCityPicker
                  country={toCountry}
                  city={toCity}
                  onChange={({ country, city }) => {
                    setToCountry(country);
                    setToCity(city);
                  }}
                />
              </div>

              <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

              <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Date du vol
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

          {/* Flight details — required to propose to a request. Collected
              here so it carries over if the user falls back to publishing
              a full trip. */}
          <div className="mt-6 bg-white rounded-2xl p-5 border border-ink-50">
            <div className="text-[13px] font-semibold text-ink-500 mb-3 flex items-center gap-2">
              <span>Détails du vol</span>
              <span className="text-[11px] text-ink-300 font-normal">requis pour proposer votre aide</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Input
                  type="text"
                  label="Numéro de vol *"
                  placeholder="AF1234, RAM 451…"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  maxLength={12}
                />
                {flightNumber && !isValidFlightNumber(flightNumber) && (
                  <p className="mt-1.5 text-[11px] text-blush-500">
                    Format invalide. Ex: AF1234, RAM 451
                  </p>
                )}
              </div>
              <Input
                type="time"
                label="Heure (optionnel)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAirportCodes((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showAirportCodes ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span>
                {showAirportCodes ? 'Masquer' : 'Ajouter'} les codes aéroports
                <span className="text-ink-300 ml-1">(optionnel)</span>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {showAirportCodes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <Input
                      type="text"
                      label="Aéroport départ"
                      placeholder="CMN"
                      value={departureAirport}
                      onChange={(e) => setDepartureAirport(e.target.value.toUpperCase().slice(0, 4))}
                      maxLength={4}
                    />
                    <Input
                      type="text"
                      label="Aéroport arrivée"
                      placeholder="CDG"
                      value={arrivalAirport}
                      onChange={(e) => setArrivalAirport(e.target.value.toUpperCase().slice(0, 4))}
                      maxLength={4}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results section */}
          <div className="mt-8">
            {!hasRouteAndDate ? (
              <p className="text-[14px] text-ink-400 text-center py-8">
                Remplissez la route et la date pour découvrir les colis à transporter.
              </p>
            ) : previewLoading ? (
              <div className="flex items-center justify-center gap-2.5 py-8 text-[13px] text-ink-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Recherche de colis…</span>
              </div>
            ) : hasResults ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-lavender-500" />
                  <p className="text-[14px] font-semibold text-ink-600">
                    {previewRequests.length === 1
                      ? "1 expéditeur cherche un voyageur"
                      : `${previewRequests.length} expéditeurs cherchent un voyageur`}
                  </p>
                  <span className="text-[13px] text-ink-400">sur votre route</span>
                </div>
                <div className="space-y-2.5">
                  {previewRequests.slice(0, 8).map((req) => (
                    <RequestHelpableCard
                      key={req.id}
                      request={req}
                      onPropose={() => setRequestToHelp(req)}
                      flightNumberRequired={!isValidFlightNumber(flightNumber)}
                      alreadyProposed={proposedRequestIds.includes(req.id)}
                    />
                  ))}
                  {previewRequests.length > 8 && (
                    <p className="text-[12px] text-ink-400 text-center pt-2">
                      Et {previewRequests.length - 8} autres demandes…
                    </p>
                  )}
                </div>

                {/* Fallback: publish a full trip instead. */}
                <div className="mt-6 pt-6 border-t border-ink-100">
                  <button
                    onClick={switchToPublic}
                    className="w-full text-center text-[14px] text-ink-500 hover:text-ink-600 transition-colors group"
                  >
                    Vous voulez aussi être visible pour d&apos;autres ?{' '}
                    <span className="font-semibold underline underline-offset-2 group-hover:text-lavender-600">
                      Publier mon trajet
                    </span>{' '}
                    <ArrowRight className="inline w-3.5 h-3.5 -mt-0.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                  <Plane className="w-6 h-6 text-ink-400" />
                </div>
                <h3 className="text-[18px] font-bold text-ink-600 mb-2 tracking-[-0.01em]">
                  Aucun colis sur cette route pour l&apos;instant
                </h3>
                <p className="text-[14px] text-ink-400 mb-7 leading-relaxed max-w-md mx-auto">
                  Publiez votre trajet — les expéditeurs qui en ont besoin vous trouveront.
                </p>
                <Button onClick={switchToPublic}>
                  Publier mon trajet
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* INSTANT PROPOSE MODAL */}
        <AnimatePresence>
          {requestToHelp && user && (
            <InstantProposeModal
              request={requestToHelp}
              travelerId={user.id}
              fromCity={fromCity}
              toCity={toCity}
              date={date}
              time={time}
              flightNumber={flightNumber}
              departureAirport={departureAirport}
              arrivalAirport={arrivalAirport}
              // Reuse the same trip for all proposals on this flight, so
              // we don't end up with N draft trips for the same journey.
              existingTripId={createdTripId}
              onClose={() => setRequestToHelp(null)}
              onSuccess={(proposedId, tripId) => {
                // Stay on the page so the traveler can keep proposing to
                // other senders on the same flight. Mark the card locked.
                setProposedRequestIds((prev) =>
                  prev.includes(proposedId) ? prev : [...prev, proposedId]
                );
                if (tripId && !createdTripId) {
                  setCreatedTripId(tripId);
                }
                setRequestToHelp(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // PUBLIC WIZARD — original 4-step trip publish flow
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
            Retour aux colis
          </button>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
            Publier mon trajet
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">
            Les expéditeurs pourront vous proposer des colis sur ce vol.
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
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.trip_route_title}</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.send_label_from}</label>
                      <CountryCityPicker
                        country={fromCountry}
                        city={fromCity}
                        onChange={({ country, city }) => {
                          setFromCountry(country);
                          setFromCity(city);
                        }}
                        enableNearby
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.send_label_to}</label>
                      <CountryCityPicker
                        country={toCountry}
                        city={toCity}
                        onChange={({ country, city }) => {
                          setToCountry(country);
                          setToCity(city);
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      label="Date de mon vol"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <Input
                      type="time"
                      label={t.trip_label_time}
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  <div className="pt-2">
                    <div className="text-[13px] font-semibold text-ink-500 mb-3 flex items-center gap-2">
                      <span>Détails du vol</span>
                      <span className="text-[11px] text-ink-300 font-normal">obligatoire pour la confiance</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Input
                          type="text"
                          label="Numéro de vol *"
                          placeholder="AF1234, RAM 451…"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                          maxLength={12}
                        />
                        {flightNumber && !isValidFlightNumber(flightNumber) && (
                          <p className="mt-1.5 text-[11px] text-blush-500">
                            Format invalide. Ex: AF1234, RAM 451, TO 8231
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAirportCodes((v) => !v)}
                        className="flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-600 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform ${showAirportCodes ? 'rotate-90' : ''}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span>
                          {showAirportCodes ? 'Masquer' : 'Ajouter'} les codes aéroports
                          <span className="text-ink-300 ml-1">(optionnel)</span>
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {showAirportCodes && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <Input
                                type="text"
                                label="Aéroport départ"
                                placeholder="CMN"
                                value={departureAirport}
                                onChange={(e) => setDepartureAirport(e.target.value.toUpperCase().slice(0, 4))}
                                maxLength={4}
                              />
                              <Input
                                type="text"
                                label="Aéroport arrivée"
                                placeholder="CDG"
                                value={arrivalAirport}
                                onChange={(e) => setArrivalAirport(e.target.value.toUpperCase().slice(0, 4))}
                                maxLength={4}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-7">
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-1">
                        {t.trip_accepted_categories_label}
                      </h2>
                      <p className="text-[14px] text-ink-400">
                        {t.trip_accepted_categories_hint}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {ITEM_CATEGORIES.map((c) => {
                        const active = acceptedCategories.includes(c.value);
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => toggleCategory(c.value)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-start transition-all ${
                              active
                                ? 'border-lavender-500 bg-lavender-50'
                                : 'border-ink-100 bg-white hover:border-ink-300'
                            }`}
                          >
                            <span className="text-xl flex-shrink-0">{c.icon}</span>
                            <span className={`text-[14px] font-medium ${active ? 'text-lavender-700' : 'text-ink-500'}`}>
                              {t[c.labelKey]}
                            </span>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-lavender-500 ml-auto flex-shrink-0" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-3">
                      <label className="block text-[14px] font-semibold text-ink-500">{t.trip_label_min_comp}</label>
                      <span className="text-2xl font-bold text-ink-600 num-display tracking-[-0.02em]">
                        {minComp}{t.common_eur}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={minComp}
                      onChange={(e) => setMinComp(Number(e.target.value))}
                      className="w-full h-1.5 bg-ink-100 rounded-full appearance-none accent-ink-500"
                    />
                    <div className="flex justify-between text-[12px] text-ink-300 mt-2">
                      <span>0{t.common_eur}</span>
                      <span>80{t.common_eur}</span>
                    </div>
                    <p className="text-[13px] text-ink-400 mt-4 leading-relaxed">{t.trip_min_comp_hint}</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-2">{t.trip_identity_title}</h2>
                    <p className="text-[14px] text-ink-400 leading-relaxed">{t.trip_identity_subtitle}</p>
                  </div>

                  <ul className="space-y-3">
                    {[t.trip_identity_benefit_1, t.trip_identity_benefit_2, t.trip_identity_benefit_3].map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-mint-500 mt-1 flex-shrink-0" strokeWidth={2.5} />
                        <span className="text-[15px] text-ink-500">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <label className="block">
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="hidden" />
                    <div className="border border-dashed border-ink-200 rounded-2xl p-7 text-center cursor-pointer hover:border-ink-400 hover:bg-cream-100/60 transition-colors">
                      <Upload className="w-5 h-5 text-ink-400 mx-auto mb-3" />
                      <div className="text-[14px] font-semibold text-ink-600">
                        {idFile ? idFile.name : t.trip_upload_id}
                      </div>
                      <div className="text-[12px] text-ink-400 mt-1">{t.common_optional}</div>
                    </div>
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.trip_validation_title}</h2>

                  <ul className="space-y-3.5">
                    {[t.trip_engagement_1, t.trip_engagement_2, t.trip_engagement_3, t.trip_engagement_4].map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-mint-500 mt-1 flex-shrink-0" strokeWidth={2.5} />
                        <span className="text-[15px] text-ink-500">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2">
                    <Checkbox name="terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} label={<span>{t.trip_engagement_terms}</span>} />
                  </div>
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
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plane className="w-4 h-4" />}
                {t.trip_publish}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RequestHelpableCard — clickable card in the search results.
// Two visual states:
//   - default     : actionable, shows sender info + "Proposer" button
//   - alreadyProposed : locked, grayed out, "✓ Proposition envoyée" badge
//                       and a "En attente de la réponse de X" hint
// =============================================================================
function RequestHelpableCard({
  request,
  onPropose,
  flightNumberRequired,
  alreadyProposed,
}: {
  request: MatchingRequest;
  onPropose: () => void;
  // When the traveler hasn't given a valid flight number yet, the button
  // shows as disabled with a tooltip pointing them to fill it.
  flightNumberRequired: boolean;
  // Set true after the traveler has successfully sent a proposal for this
  // request in the current session. The card stays in place (so the page
  // doesn't reflow) but becomes non-interactive and visually muted.
  alreadyProposed: boolean;
}) {
  const { t } = useI18n();
  const name = displayName(request.user?.full_name) || 'Expéditeur';
  const initial = nameInitial(request.user?.full_name);
  const verified =
    request.user?.verification_level === 'id_verified' ||
    request.user?.verification_level === 'trusted';
  const category = ITEM_CATEGORIES.find((c) => c.value === request.item_category);
  // What the traveler nets after the 15% Jibly fee.
  const netTraveler = Math.round((request.budget / 1.15) * 100) / 100;

  // ----- Locked state: proposal already sent -----
  if (alreadyProposed) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        className="bg-mint-50/60 rounded-xl px-3 py-2.5 border border-mint-200/70 relative"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-mint-100 flex items-center justify-center font-bold text-[13px] text-mint-700 opacity-80">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[14px] flex-wrap">
              <span className="font-semibold text-ink-500">{name}</span>
              {verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-mint-400" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-mint-700 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="font-semibold">Proposition envoyée</span>
              <span className="text-ink-400">· en attente de la réponse de {name.split(' ')[0]}</span>
            </div>
          </div>
          {/* Small badge mirroring the button position so the layout stays
              consistent with the actionable state. */}
          <div className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-mint-100 text-mint-700 text-[11px] font-bold uppercase tracking-[0.06em]">
            Locked
          </div>
        </div>
      </motion.div>
    );
  }

  // ----- Default state: actionable card -----
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50 hover:border-ink-200 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[13px] text-ink-500">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[14px] flex-wrap">
            <span className="font-semibold text-ink-600">{name}</span>
            {verified && (
              <ShieldCheck className="w-3.5 h-3.5 text-mint-500" strokeWidth={2.5} />
            )}
            {(request.user?.rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-ink-400">
                <Star className="w-3 h-3 fill-butter-500 text-butter-500" />
                <span className="num-display">{request.user!.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mt-0.5 flex-wrap">
            {category && (
              <span className="inline-flex items-center gap-1 text-ink-500">
                <span>{category.icon}</span>
                <span>{t[category.labelKey]}</span>
              </span>
            )}
            <span className="text-ink-300">· avant le</span>
            <span className="num-display">{formatShortDate(request.desired_delivery_date)}</span>
            <span className="text-ink-300">·</span>
            <span className="font-semibold text-mint-600 num-display">
              {formatEuros(netTraveler)}
            </span>
            <span className="text-ink-300 text-[11px]">net pour vous</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onPropose}
          disabled={flightNumberRequired}
          title={flightNumberRequired ? 'Renseignez d\'abord votre numéro de vol' : 'Proposer mon aide'}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed text-cream-50 text-[12px] font-semibold transition-colors"
        >
          Proposer
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// InstantProposeModal — traveler responds to a specific shipping_request.
// Creates a minimal traveler_trip (status='draft' so it stays out of the
// public list) + a booking_intent (initiated_by='traveler', unpaid — the
// sender pays only if they accept).
// =============================================================================
function InstantProposeModal({
  request,
  travelerId,
  fromCity,
  toCity,
  date,
  time,
  flightNumber,
  departureAirport,
  arrivalAirport,
  existingTripId,
  onClose,
  onSuccess,
}: {
  request: MatchingRequest;
  travelerId: string;
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  // If the user has already proposed once during this session, the trip
  // already exists — we reuse it instead of creating a new draft.
  existingTripId: string | null;
  onClose: () => void;
  // Called after the booking_intent is successfully created. Receives the
  // shipping_request id (to lock the card) and the trip id (which the
  // parent caches so the next proposal reuses it).
  onSuccess: (proposedRequestId: string, tripId: string | null) => void;
}) {
  const { t } = useI18n();
  const [travelerMessage, setTravelerMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const senderName = displayName(request.user?.full_name) || 'L\'expéditeur';
  const category = ITEM_CATEGORIES.find((c) => c.value === request.item_category);
  const netTraveler = Math.round((request.budget / 1.15) * 100) / 100;

  async function handleSubmit() {
    setBusy(true);
    setErr(null);
    try {
      // 1. If we already created a trip earlier in this session for this
      //    same flight (i.e. user is proposing for the 2nd/3rd time),
      //    reuse it. Otherwise create a minimal draft trip.
      //    compensation_min = sender's budget for the FIRST proposal —
      //    when we reuse, we keep whatever was set on the original trip.
      let tripId = existingTripId;
      if (!tripId) {
        const trip = await browser.createTrip({
          user_id: travelerId,
          departure_country: '',
          departure_city: fromCity,
          arrival_country: '',
          arrival_city: toCity,
          departure_date: date,
          arrival_date: null,
          compensation_min: request.budget,
          compensation_max: null,
          available_weight_kg: null,
          available_space: 'pochette',
          flight_time: time || null,
          flight_number: flightNumber.trim().toUpperCase().replace(/\s+/g, ' '),
          departure_airport: departureAirport.trim().toUpperCase() || null,
          arrival_airport: arrivalAirport.trim().toUpperCase() || null,
          notes: null,
          status: 'draft',
        });
        tripId = trip?.id || null;
      }

      // 2. Create the booking_intent. initiated_by='traveler' means /me
      //    shows it as an outgoing proposal on the traveler side and as
      //    an incoming "Accept & Pay" prompt on the sender side.
      await browser.createBookingIntent({
        sender_id: request.user_id,
        traveler_user_id: travelerId,
        traveler_trip_id: tripId,
        shipping_request_id: request.id,
        item_category: request.item_category,
        item_description: request.item_description,
        // Price locked to sender's budget. No negotiation in this flow.
        proposed_price: request.budget,
        pickup_city: request.pickup_city,
        destination_city: request.destination_city,
        payment_status: 'unpaid', // sender pays after accepting
        payment_amount: null,
        traveler_message: travelerMessage.trim() || null,
        initiated_by: 'traveler',
      });
      onSuccess(request.id, tripId);
    } catch (e: any) {
      setErr(e?.message ?? 'Échec de l\'envoi. Réessayez.');
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
              Proposer mon aide
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              Aider {senderName}
            </h2>
            <div className="text-[13px] text-ink-400 mt-1.5">
              {request.pickup_city} → {request.destination_city} · avant le {formatShortDate(request.desired_delivery_date)}
            </div>
            <div className="mt-2 inline-flex items-baseline gap-1.5">
              <span className="text-[11px] text-ink-300 uppercase tracking-[0.08em]">Vous recevrez</span>
              <span className="text-xl font-extrabold text-mint-600 num-display">
                {formatEuros(netTraveler)}
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

        {/* What they're shipping — read-only recap */}
        <div className="rounded-xl bg-white border border-ink-100 px-4 py-3 mb-4">
          <div className="text-[11px] font-semibold text-ink-300 tracking-[0.08em] uppercase mb-2">
            Ce qu&apos;on vous demande de transporter
          </div>
          {category && (
            <div className="inline-flex items-center gap-1.5 text-[13px] text-ink-600 font-medium mb-2">
              <span className="text-lg">{category.icon}</span>
              <span>{t[category.labelKey]}</span>
            </div>
          )}
          {request.item_description && (
            <p className="text-[13px] text-ink-500 leading-relaxed">
              « {request.item_description} »
            </p>
          )}
        </div>

        {/* Optional traveler message */}
        <Textarea
          label="Message à l'expéditeur (optionnel)"
          placeholder="Bonjour, je voyage exactement sur cette route et serais ravi de transporter votre colis…"
          value={travelerMessage}
          onChange={(e) => setTravelerMessage(e.target.value)}
        />

        <div className="mt-4 rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3 text-[12px] text-ink-500 leading-relaxed">
          <div className="font-bold text-mint-700 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Comment ça marche ensuite
          </div>
          {senderName} reçoit votre proposition. S&apos;il accepte, il paie et le montant est bloqué. Vous serez crédité une fois la livraison confirmée.
        </div>

        {err && (
          <div className="mt-4 rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500">
            {err}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Envoyer ma proposition
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
