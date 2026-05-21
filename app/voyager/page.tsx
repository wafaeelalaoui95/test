'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Upload, Plane, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/Form';
import { Stepper } from '@/components/ui/Stepper';
import { LocationSelector, type LocationValue } from '@/components/ui/LocationSelector';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import type { AvailableSpace } from '@/lib/types';

export default function VoyagerPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const STEPS = [t.trip_step_route, t.trip_step_space, t.trip_step_identity, t.trip_step_validation];

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [from, setFrom] = useState<LocationValue>(null);
  const [to, setTo] = useState<LocationValue>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // Flight details. flight_number is required (it's the credibility anchor —
  // a real airline code like "AF1234" lets us cross-reference); airports
  // stay optional. Pattern check accepts 2-3 letters then 1-4 digits.
  const [flightNumber, setFlightNumber] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  // Airport codes are an advanced field — hidden behind a toggle so the
  // form doesn't feel cluttered. Most travelers won't bother; power users
  // can open it for a sharper boarding-pass display.
  const [showAirportCodes, setShowAirportCodes] = useState(false);

  const [space, setSpace] = useState<AvailableSpace | null>(null);
  const [minComp, setMinComp] = useState(20);
  const [acceptedCategories, setAcceptedCategories] = useState<string[]>([]);

  // Loose airline flight number check: 2-3 letters then 1-4 digits, with
  // optional space (e.g. "AF1234", "AT4451", "TO8231"). Case-insensitive.
  const FLIGHT_NUMBER_PATTERN = /^[A-Z]{2,3}\s?\d{1,4}$/i;
  const isValidFlightNumber = (s: string) => FLIGHT_NUMBER_PATTERN.test(s.trim());

  function toggleCategory(value: string) {
    setAcceptedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  const [idFile, setIdFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);

  const canNext = () => {
    if (step === 0) return from && to && date && isValidFlightNumber(flightNumber);
    if (step === 1) return acceptedCategories.length > 0 && minComp >= 0;
    if (step === 2) return true;
    if (step === 3) return terms;
    return false;
  };

  async function handleSubmit() {
    if (!user) {
      router.push('/login?next=/voyager');
      return;
    }
    if (!from || !to) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await browser.createTrip({
        user_id: user.id,
        departure_country: from.country,
        departure_city: from.city,
        arrival_country: to.country,
        arrival_city: to.city,
        departure_date: date,
        arrival_date: null,
        compensation_min: minComp,
        compensation_max: null,
        available_weight_kg: null,
        // Default to pochette since the explicit picker was removed.
        // Travelers communicate exact space in messages with the sender.
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

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-3 tracking-[-0.03em]">
            {t.trip_title}
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">{t.trip_subtitle}</p>
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
                  <LocationSelector value={from} onChange={setFrom} label={t.send_label_from} placeholder={t.send_placeholder_from} icon="departure" />
                  <LocationSelector value={to} onChange={setTo} label={t.send_label_to} placeholder={t.send_placeholder_to} icon="arrival" />
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

                  {/* Flight details — number is required (credibility),
                      airports stay optional. Layout: flight number on its
                      own row so the validation hint reads well, then
                      airports tucked behind an "advanced" toggle so the
                      form doesn't feel intimidating to casual travelers. */}
                  <div className="pt-2">
                    <div className="text-[13px] font-semibold text-ink-500 mb-3 flex items-center gap-2">
                      <span>Détails du vol</span>
                      <span className="text-[11px] text-ink-300 font-normal">obligatoire pour la confiance</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Input
                          type="text"
                          label="Numéro de vol*"
                          placeholder="AF1896, AT4513…"
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                          maxLength={12}
                        />
                        {flightNumber && !isValidFlightNumber(flightNumber) && (
                          <p className="mt-1.5 text-[11px] text-blush-500">
                            Format invalide. Ex: AF1234, RAM451, TO 8231
                          </p>
                        )}
                      </div>

                      {/* Advanced toggle for airport IATA codes. Closed by
                          default — keeps the form short. When opened, animates
                          smoothly. The chevron rotates to signal state. */}
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
                            <p className="mt-2 text-[11px] text-ink-400 leading-relaxed">
                              Codes IATA à 3 lettres. Affichés sur votre billet d&apos;embarquement Jibly.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-7">
                  {/* Accepted item categories (multi-select) */}
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
              <Button disabled={!canNext() || submitting || authLoading} onClick={handleSubmit}>
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
