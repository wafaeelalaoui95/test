'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Upload, Plane, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { Stepper } from '@/components/ui/Stepper';
import { LocationSelector, type LocationValue } from '@/components/ui/LocationSelector';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import type { AvailableSpace } from '@/lib/supabase/types';

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

  const [space] = useState<AvailableSpace | null>(null);
  const [minComp, setMinComp] = useState(20);
  const [acceptedCategories, setAcceptedCategories] = useState<string[]>([]);

  function toggleCategory(value: string) {
    setAcceptedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  const [idFile, setIdFile] = useState<File | null>(null);
  const [terms, setTerms] = useState(false);

  const canNext = () => {
    if (step === 0) return from && to && date;
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
        available_space: space ?? 'pochette',
        flight_time: time || null,
        notes: JSON.stringify({ accepted_categories: acceptedCategories }),
        status: 'open',
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message ?? 'Une erreur est survenue');
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
          <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-7">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 mb-4 tracking-[-0.025em]">
            {t.trip_success_title}
          </h1>
          <p className="text-[16px] text-ink-400 mb-9 leading-relaxed">{t.trip_success_text}</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/me">
              <Button variant="secondary" fullWidth>Voir mon espace</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" fullWidth>Retour à l&apos;accueil</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-2xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] mb-3">
            {t.trip_title}
          </h1>
          <p className="text-lg text-ink-400">{t.trip_subtitle}</p>
        </motion.div>

        <Stepper steps={STEPS} current={step} />

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl p-7 sm:p-9 border border-ink-50 mt-10"
        >
          <div className="space-y-7">
            {step === 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.trip_route_title}</h2>

                <LocationSelector
                  label="Départ"
                  value={from}
                  onChange={setFrom}
                  placeholder="Ville de départ"
                />

                <LocationSelector
                  label="Arrivée"
                  value={to}
                  onChange={setTo}
                  placeholder="Ville d'arrivée"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Input
                    label={`${t.trip_label_time} (${t.common_optional})`}
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
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
                <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.trip_identity_title}</h2>
                <p className="text-[15px] text-ink-400 leading-relaxed">{t.trip_identity_subtitle}</p>

                <label className="block">
                  <div className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-colors ${idFile ? 'border-mint-500 bg-mint-50' : 'border-ink-100 hover:border-ink-300'}`}>
                    <Upload className="w-6 h-6 mx-auto mb-3 text-ink-400" strokeWidth={1.5} />
                    <div className="text-[14px] font-medium text-ink-500 mb-1">
                      {idFile ? idFile.name : t.trip_upload_id}
                    </div>
                    <div className="text-[12px] text-ink-400">PDF, JPG ou PNG</div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em]">{t.trip_validation_title}</h2>

                <label className="flex items-start gap-3 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1 rounded accent-ink-500"
                  />
                  <span className="text-[14px] text-ink-500 leading-relaxed">{t.trip_engagement_terms}</span>
                </label>

                {submitError && (
                  <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">{submitError}</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-9 pt-7 border-t border-ink-50">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
                <ArrowLeft className="w-4 h-4 mr-1.5" /> {t.common_back}
              </Button>
            ) : <div />}
            {step < 3 ? (
              <Button disabled={!canNext()} onClick={() => setStep(step + 1)}>
                {t.common_next} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button disabled={!canNext() || submitting || authLoading} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plane className="w-4 h-4 mr-1.5" />}
                {t.trip_publish}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
