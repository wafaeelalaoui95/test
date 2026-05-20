'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea, Checkbox, Input } from '@/components/ui/Form';
import { Stepper } from '@/components/ui/Stepper';
import { LocationSelector, type LocationValue } from '@/components/ui/LocationSelector';
import { ITEM_CATEGORIES, FORBIDDEN_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import type { ItemCategory } from '@/lib/types';

export default function EnvoyerPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const STEPS = [t.send_step_route, t.send_step_item, t.send_step_details, t.send_step_confirm];

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [from, setFrom] = useState<LocationValue>(null);
  const [to, setTo] = useState<LocationValue>(null);
  const [date, setDate] = useState('');

  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [description, setDescription] = useState('');
  const [prescription, setPrescription] = useState<File | null>(null);

  const [budget, setBudget] = useState(30);
  const [terms, setTerms] = useState(false);

  const canNext = () => {
    if (step === 0) return from && to && date;
    if (step === 1) {
      if (!category || !description) return false;
      if (category === 'medicaments' && !prescription) return false;
      return true;
    }
    if (step === 2) return budget > 0;
    if (step === 3) return terms;
    return false;
  };

  async function handleSubmit() {
    if (!user) {
      router.push('/login?next=/envoyer');
      return;
    }
    if (!from || !to || !category) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await browser.createShippingRequest({
        user_id: user.id,
        item_title: null,
        item_category: category,
        item_description: description,
        pickup_country: from.country,
        pickup_city: from.city,
        destination_country: to.country,
        destination_city: to.city,
        desired_delivery_date: date,
        budget,
        weight_kg: null,
        // urgency is no longer collected from the user. The DB column has
        // a default of 'standard', so we let it fill in.
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
          <p className="text-[16px] text-ink-400 mb-9 leading-relaxed">{t.send_success_text}</p>
          <div className="flex flex-col gap-2.5">
            <Link href="/">
              <Button variant="secondary" fullWidth>{t.send_success_see_travelers}</Button>
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
            {t.send_title}
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">{t.send_subtitle}</p>
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
                  <LocationSelector value={from} onChange={setFrom} label={t.send_label_from} placeholder={t.send_placeholder_from} icon="departure" />
                  <LocationSelector value={to} onChange={setTo} label={t.send_label_to} placeholder={t.send_placeholder_to} icon="arrival" />
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
                    <Row label={t.send_recap_route} value={`${from?.flag} ${from?.city} → ${to?.flag} ${to?.city}`} />
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
              <Button disabled={!canNext() || submitting || authLoading} onClick={handleSubmit}>
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
