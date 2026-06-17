// app/objets-autorises/page.tsx
//
// Authoritative policy page for what can and can't be transported via Jibly.
// MVP policy is whitelist-based: only items in the ALLOWED list are
// transportable. Anything else is forbidden by default. This is much
// stronger legally than "everything except X" and aligns with the
// double-declaration flow (sender certifies content, traveler verifies).
//
// Medication policy:
//   - OTC (over-the-counter): allowed under strict disclaimer. Doliprane,
//     vitamins, cosmetics — items legally purchasable without prescription
//     in both France and Morocco. The sender takes legal responsibility.
//   - Prescription medication: STRICTLY forbidden. Prescriptions are
//     nominative; cross-border transport by a third party is illegal
//     regardless of intent (Code de la santé publique L4223-1 in FR;
//     equivalent in MA).

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

// =============================================================================

export default function ObjetsAutorisesPage() {
  const { t } = useI18n();

  // ---------------------------------------------------------------------------
  // AUTHORIZED items — the EXCLUSIVE whitelist for the MVP
  // ---------------------------------------------------------------------------
  const ALLOWED = [
    { emoji: '📄', label: t.oa_allowed1_label, examples: t.oa_allowed1_examples },
    { emoji: '🔑', label: t.oa_allowed2_label, examples: t.oa_allowed2_examples },
    { emoji: '🎁', label: t.oa_allowed3_label, examples: t.oa_allowed3_examples },
    { emoji: '👕', label: t.oa_allowed4_label, examples: t.oa_allowed4_examples },
    { emoji: '🔌', label: t.oa_allowed5_label, examples: t.oa_allowed5_examples },
    { emoji: '💊', label: t.oa_allowed6_label, examples: t.oa_allowed6_examples },
  ];

  // ---------------------------------------------------------------------------
  // FORBIDDEN items — non-exhaustive, illustrative
  // ---------------------------------------------------------------------------
  const FORBIDDEN = [
    { emoji: '💵', label: t.oa_forbidden1_label, reason: t.oa_forbidden1_reason },
    { emoji: '💊', label: t.oa_forbidden2_label, reason: t.oa_forbidden2_reason },
    { emoji: '🚫', label: t.oa_forbidden3_label, reason: t.oa_forbidden3_reason },
    { emoji: '🔫', label: t.oa_forbidden4_label, reason: t.oa_forbidden4_reason },
    { emoji: '🏷️', label: t.oa_forbidden5_label, reason: t.oa_forbidden5_reason },
    { emoji: '💎', label: t.oa_forbidden6_label, reason: t.oa_forbidden6_reason },
    { emoji: '⚠️', label: t.oa_forbidden7_label, reason: t.oa_forbidden7_reason },
    { emoji: '🛂', label: t.oa_forbidden8_label, reason: t.oa_forbidden8_reason },
  ];

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cream-100 via-cream-50 to-mint-50/30">
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-5">
              <ShieldCheck className="w-3.5 h-3.5 text-ink-500" />
              <span className="text-[12px] font-bold text-ink-600 tracking-wide">
                {t.oa_badge}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-4">
              {t.oa_hero_title}
            </h1>
            <p className="text-[16px] text-ink-500 leading-relaxed max-w-2xl mx-auto">
              {t.oa_hero_subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* AUTORISÉS */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-mint-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-mint-700" />
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-mint-700 uppercase">
                {t.oa_allowed_eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em]">
                {t.oa_allowed_heading}
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALLOWED.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-white rounded-2xl p-5 border border-mint-100/60 hover:border-mint-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl flex-shrink-0">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-ink-600 mb-1">
                      {item.label}
                    </h3>
                    <p className="text-[12px] text-ink-400 leading-relaxed">
                      {item.examples}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* OTC clarification — distinct callout below the grid */}
          <div className="mt-8 rounded-2xl bg-butter-50 border border-butter-200/70 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">💊</div>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-2">
                  {t.oa_otc_title}
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed mb-2">
                  {t.oa_otc_p1}
                </p>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  {t.oa_otc_p2}{' '}
                  <strong className="text-blush-600">
                    {t.oa_otc_p2_emphasis}
                  </strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERDITS */}
      <section className="py-16 sm:py-20 bg-blush-50/30">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blush-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-blush-600" />
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-blush-600 uppercase">
                {t.oa_forbidden_eyebrow}
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em]">
                {t.oa_forbidden_heading}
              </h2>
              <p className="text-[13px] text-ink-400 mt-1">
                {t.oa_forbidden_subtitle}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORBIDDEN.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="bg-white rounded-2xl p-5 border border-blush-100/80 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 text-[9px] font-bold tracking-wider text-blush-400 uppercase">
                  {t.oa_forbidden_tag}
                </div>
                <div className="text-4xl mb-3 grayscale-[20%]">{item.emoji}</div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  {item.label}
                </h3>
                <p className="text-[11px] text-ink-400 leading-relaxed">
                  {item.reason}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Warning banner — consequences */}
          <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-blush-100/40 border border-blush-200/60 flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-blush-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-bold text-ink-600 mb-1.5">
                {t.oa_consequences_title}
              </h3>
              <p className="text-[13px] text-ink-500 leading-relaxed">
                {t.oa_consequences_p1}{' '}
                <strong className="text-ink-600">{t.oa_consequences_strong1}</strong>{' '}
                {t.oa_consequences_p2}{' '}
                <strong className="text-ink-600">{t.oa_consequences_strong2}</strong>{' '}
                {t.oa_consequences_p3}{' '}
                <strong className="text-ink-600">{t.oa_consequences_strong3}</strong>{' '}
                {t.oa_consequences_p4}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DOUBLE DÉCLARATION */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
              {t.oa_dd_eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
              {t.oa_dd_title}
            </h2>
            <p className="text-[14px] text-ink-400 mt-3 max-w-xl mx-auto">
              {t.oa_dd_subtitle}
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">📋</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  {t.oa_dd_card1_title}
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed italic">
                  {t.oa_dd_card1_quote}
                </p>
              </div>
            </div>
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">👁️</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  {t.oa_dd_card2_title}
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed italic">
                  {t.oa_dd_card2_quote}
                </p>
              </div>
            </div>
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">🚨</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  {t.oa_dd_card3_title}
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  {t.oa_dd_card3_body}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-ink-500">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12 text-center">
          <Sparkles className="w-8 h-8 text-butter-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-cream-50 tracking-[-0.025em] mb-3">
            {t.oa_cta_title}
          </h2>
          <p className="text-[14px] text-cream-200 leading-relaxed mb-6 max-w-xl mx-auto">
            {t.oa_cta_subtitle}
          </p>
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-cream-50 hover:bg-cream-100 text-ink-600 text-[14px] font-bold transition-colors"
          >
            {t.oa_cta_button}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
