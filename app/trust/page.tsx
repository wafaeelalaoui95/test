// app/trust/page.tsx
//
// Trust & confiance page — the brief calls this a "FAQ confiance + how it
// works" page. The goal is to reassure: explain what Jibly is (and isn't),
// how money is held safely, what happens in disputes, and link out to the
// allowed-items policy for the legal side.

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  HandCoins,
  PackageCheck,
  BadgeCheck,
  MessageCircleQuestion,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';

// =============================================================================

export default function TrustPage() {
  const { t } = useI18n();

  // ---------------------------------------------------------------------------
  // COMMENT ÇA MARCHE — 3 steps in plain language
  // ---------------------------------------------------------------------------
  const HOW_IT_WORKS = [
    {
      n: '1',
      icon: '🔎',
      title: t.tp_how_step1_title,
      body: t.tp_how_step1_body,
    },
    {
      n: '2',
      icon: '🤝',
      title: t.tp_how_step2_title,
      body: t.tp_how_step2_body,
    },
    {
      n: '3',
      icon: '📦',
      title: t.tp_how_step3_title,
      body: t.tp_how_step3_body,
    },
  ];

  // ---------------------------------------------------------------------------
  // PAIEMENT SÉCURISÉ — 5 visual steps of the escrow
  // ---------------------------------------------------------------------------
  const PAYMENT_STEPS = [
    { label: t.tp_pay_step1, icon: '✓', accent: 'mint' },
    { label: t.tp_pay_step2, icon: '🤝', accent: 'lavender' },
    { label: t.tp_pay_step3, icon: '✈️', accent: 'lavender' },
    { label: t.tp_pay_step4, icon: '📦', accent: 'mint' },
    { label: t.tp_pay_step5, icon: '💰', accent: 'mint' },
  ];

  // ---------------------------------------------------------------------------
  // FAQ — exactly as per the brief
  // ---------------------------------------------------------------------------
  const FAQ = [
    { q: t.tp_faq_q1, a: t.tp_faq_a1 },
    { q: t.tp_faq_q2, a: t.tp_faq_a2 },
    { q: t.tp_faq_q3, a: t.tp_faq_a3 },
    { q: t.tp_faq_q4, a: t.tp_faq_a4 },
    { q: t.tp_faq_q5, a: t.tp_faq_a5 },
  ];

  // ---------------------------------------------------------------------------
  // PILLARS — what makes Jibly trustworthy
  // ---------------------------------------------------------------------------
  const PILLARS = [
    {
      icon: BadgeCheck,
      title: t.tp_pillar1_title,
      body: t.tp_pillar1_body,
    },
    {
      icon: Lock,
      title: t.tp_pillar2_title,
      body: t.tp_pillar2_body,
    },
    {
      icon: PackageCheck,
      title: t.tp_pillar3_title,
      body: t.tp_pillar3_body,
    },
    {
      icon: ShieldCheck,
      title: t.tp_pillar4_title,
      body: t.tp_pillar4_body,
    },
  ];

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-lavender-50/40" />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-50 border border-mint-200/60 mb-6">
              <ShieldCheck className="w-3.5 h-3.5 text-mint-700" />
              <span className="text-[12px] font-bold text-mint-700 tracking-wide">
                {t.tp_hero_badge}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-5">
              {t.tp_hero_title}<br />
              <span className="text-lavender-600">{t.tp_hero_title_accent}</span>
            </h1>
            <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-2xl mx-auto">
              {t.tp_hero_subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
              {t.tp_how_eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
              {t.tp_how_title}
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="bg-white rounded-3xl p-7 border border-ink-50 hover:border-ink-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-2xl">
                    {step.icon}
                  </div>
                  <div className="text-[36px] font-extrabold text-lavender-200 tracking-tighter leading-none num-display">
                    {step.n}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-ink-600 mb-2 tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="text-[14px] text-ink-500 leading-relaxed">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIEMENT SÉCURISÉ — visual timeline */}
      <section className="py-16 sm:py-20 bg-cream-100/50">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
                {t.tp_pay_eyebrow}
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-5">
                {t.tp_pay_title}<br />{t.tp_pay_title_line2}
              </h2>
              <p className="text-[15px] text-ink-500 leading-relaxed mb-5">
                {t.tp_pay_body}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-mint-50 border border-mint-200/60">
                <Lock className="w-3.5 h-3.5 text-mint-700" />
                <span className="text-[12px] font-bold text-mint-700">
                  {t.tp_pay_stripe_badge}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-ink-50">
              <div className="relative space-y-5">
                {PAYMENT_STEPS.map((step, i) => {
                  const accentClass =
                    step.accent === 'mint'
                      ? 'bg-mint-100 text-mint-700'
                      : 'bg-lavender-100 text-lavender-700';
                  return (
                    <div key={i} className="flex items-center gap-4 relative">
                      {/* Vertical line connector */}
                      {i < PAYMENT_STEPS.length - 1 && (
                        <div className="absolute left-5 top-10 bottom-[-20px] w-px bg-ink-100" />
                      )}
                      <div
                        className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[16px] ${accentClass}`}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-semibold text-ink-600">
                          {step.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-ink-400 text-center mt-6 leading-relaxed border-t border-ink-50 pt-4">
                {t.tp_pay_footnote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PILIERS — what makes Jibly trustworthy */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
              {t.tp_pillars_eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
              {t.tp_pillars_title}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-cream-50 border border-ink-50"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white border border-ink-100 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-lavender-600" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-ink-600 mb-1">
                    {p.title}
                  </h3>
                  <p className="text-[13px] text-ink-500 leading-relaxed">
                    {p.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OBJETS AUTORISÉS — teaser with CTA to /objets-autorises */}
      <section className="py-16 sm:py-20 bg-butter-50/40">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-butter-100 mb-5">
            <AlertTriangle className="w-6 h-6 text-butter-700" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
            {t.tp_allowed_title}
          </h2>
          <p className="text-[15px] text-ink-500 leading-relaxed mb-6 max-w-xl mx-auto">
            {t.tp_allowed_body}
          </p>
          <Link
            href="/objets-autorises"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-bold transition-colors"
          >
            {t.tp_allowed_cta}
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
              {t.tp_faq_eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
              {t.tp_faq_title}
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>

          {/* Contact fallback — for everything FAQ doesn't cover */}
          <div className="mt-10 p-6 rounded-2xl bg-lavender-50/40 border border-lavender-100 flex items-start gap-4">
            <MessageCircleQuestion className="w-6 h-6 text-lavender-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-bold text-ink-600 mb-1">
                {t.tp_contact_title}
              </h3>
              <p className="text-[13px] text-ink-500 leading-relaxed">
                {t.tp_contact_body_before}{' '}
                <a href="mailto:hello@jibly.com" className="text-lavender-700 font-semibold hover:underline">
                  hello@jibly.com
                </a>
                {' '}{t.tp_contact_body_after}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 sm:py-20 bg-ink-500">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12 text-center">
          <Sparkles className="w-8 h-8 text-butter-400 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream-50 tracking-[-0.025em] mb-4">
            {t.tp_cta_title}
          </h2>
          <p className="text-[15px] text-cream-200 leading-relaxed mb-7 max-w-xl mx-auto">
            {t.tp_cta_body}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/envoyer"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-butter-400 hover:bg-butter-500 text-ink-600 text-[15px] font-bold transition-colors"
            >
              {t.tp_cta_send}
            </Link>
            <Link
              href="/voyager"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-cream-50/10 hover:bg-cream-50/15 text-cream-50 text-[15px] font-bold transition-colors border border-cream-50/20"
            >
              {t.tp_cta_travel}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
// FAQItem — collapsible accordion item
// -----------------------------------------------------------------------------

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-ink-100 bg-white overflow-hidden transition-colors hover:border-ink-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
      >
        <span className="text-[14px] sm:text-[15px] font-bold text-ink-600 leading-snug">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-[14px] text-ink-500 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
