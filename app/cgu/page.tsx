// app/cgu/page.tsx
//
// Terms of Service (Conditions Générales d'Utilisation). MVP version —
// short, readable, covers the critical points for a P2P parcel marketplace:
//   - Jibly is a matching platform, not a carrier
//   - Whitelist-based content policy with double declaration
//   - Right to suspend permanently for violations
//   - Cooperation with authorities + evidence retention
//   - Reporting mechanism
//
// Should be reviewed by a lawyer before production launch with real funds.
// French jurisdiction is chosen for protective consumer law alignment with
// the France↔Morocco user base.

'use client';

import Link from 'next/link';
import { ArrowLeft, Scale, ShieldAlert, FileCheck2, AlertTriangle, Flag } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const LAST_UPDATED = '12 juin 2026';

export default function CguPage() {
  const { t, locale } = useI18n();
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.cgu_back_home}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-4">
            <Scale className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-[12px] font-bold text-ink-600 tracking-wide">
              {t.cgu_badge}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-3">
            {t.cgu_title}
          </h1>
          <p className="text-[14px] text-ink-400">
            {t.cgu_last_updated.replace('{date}', LAST_UPDATED)}
          </p>
        </div>

        {/* Review note — English only */}
        {locale === 'en' && (
          <p className="text-[12px] text-ink-400 italic mb-6">
            {t.cgu_review_note}
          </p>
        )}

        {/* Intro */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-ink-50 mb-6">
          <p className="text-[14px] text-ink-500 leading-relaxed">
            {t.cgu_intro}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">

          {/* 1. Nature de la plateforme */}
          <Section number="1" title={t.cgu_s1_title}>
            <p>{t.cgu_s1_p1}</p>
            <p>{t.cgu_s1_p2}</p>
          </Section>

          {/* 2. Inscription et compte */}
          <Section number="2" title={t.cgu_s2_title}>
            <p>{t.cgu_s2_p1}</p>
            <p>{t.cgu_s2_p2}</p>
          </Section>

          {/* 3. Objets autorisés — CRITICAL */}
          <Section number="3" title={t.cgu_s3_title} highlight>
            <p>{t.cgu_s3_p1}</p>
            <p>{t.cgu_s3_p2}</p>
            <p>{t.cgu_s3_p3}</p>
            <p>
              {t.cgu_s3_p4_pre}{' '}
              <Link href="/objets-autorises" className="underline text-lavender-600 hover:text-lavender-700">
                {t.cgu_s3_p4_link}
              </Link>{t.cgu_s3_p4_post}
            </p>
          </Section>

          {/* 4. Double déclaration */}
          <Section number="4" title={t.cgu_s4_title}>
            <p>{t.cgu_s4_p1}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t.cgu_s4_li1}</li>
              <li>{t.cgu_s4_li2}</li>
            </ul>
            <p className="mt-2">{t.cgu_s4_p2}</p>
          </Section>

          {/* 5. Paiement et compensation */}
          <Section number="5" title={t.cgu_s5_title}>
            <p>{t.cgu_s5_p1}</p>
            <p>{t.cgu_s5_p2}</p>
          </Section>

          {/* 6. Codes de remise et de livraison */}
          <Section number="6" title={t.cgu_s6_title}>
            <p>{t.cgu_s6_p1}</p>
          </Section>

          {/* 7. Comportements interdits + exclusion — CRITICAL */}
          <Section number="7" title={t.cgu_s7_title} highlight>
            <p>{t.cgu_s7_p1}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t.cgu_s7_li1}</li>
              <li>{t.cgu_s7_li2}</li>
              <li>{t.cgu_s7_li3}</li>
              <li>{t.cgu_s7_li4}</li>
              <li>{t.cgu_s7_li5}</li>
              <li>{t.cgu_s7_li6}</li>
            </ul>
            <p className="mt-3">{t.cgu_s7_p2}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t.cgu_s7_li7}</li>
              <li>{t.cgu_s7_li8}</li>
              <li>{t.cgu_s7_li9}</li>
              <li>{t.cgu_s7_li10}</li>
            </ul>
          </Section>

          {/* 8. Signalement */}
          <Section number="8" title={t.cgu_s8_title}>
            <p>{t.cgu_s8_p1}</p>
          </Section>

          {/* 9. Limitation de responsabilité */}
          <Section number="9" title={t.cgu_s9_title}>
            <p>{t.cgu_s9_p1}</p>
            <p>{t.cgu_s9_p2}</p>
          </Section>

          {/* 10. Données personnelles */}
          <Section number="10" title={t.cgu_s10_title}>
            <p>{t.cgu_s10_p1}</p>
          </Section>

          {/* 11. Modification des CGU */}
          <Section number="11" title={t.cgu_s11_title}>
            <p>{t.cgu_s11_p1}</p>
          </Section>

          {/* 12. Droit applicable */}
          <Section number="12" title={t.cgu_s12_title}>
            <p>{t.cgu_s12_p1}</p>
          </Section>

        </div>

        {/* Quick callouts grid */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-5">
            {t.cgu_callouts_title}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Callout
              icon={<FileCheck2 className="w-4 h-4 text-lavender-600" />}
              title={t.cgu_callout1_title}
              body={t.cgu_callout1_body}
            />
            <Callout
              icon={<ShieldAlert className="w-4 h-4 text-blush-600" />}
              title={t.cgu_callout2_title}
              body={t.cgu_callout2_body}
            />
            <Callout
              icon={<AlertTriangle className="w-4 h-4 text-butter-600" />}
              title={t.cgu_callout3_title}
              body={t.cgu_callout3_body}
            />
            <Callout
              icon={<Flag className="w-4 h-4 text-mint-600" />}
              title={t.cgu_callout4_title}
              body={t.cgu_callout4_body}
            />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 p-5 sm:p-6 rounded-2xl bg-white border border-ink-50 text-center">
          <p className="text-[14px] text-ink-500 leading-relaxed mb-4">
            {t.cgu_cta_text}
          </p>
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-bold transition-colors"
          >
            {t.cgu_cta_button}
          </Link>
        </div>
      </div>
    </main>
  );
}

// =============================================================================

function Section({
  number,
  title,
  highlight,
  children,
}: {
  number: string;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        highlight
          ? 'bg-blush-50/50 border-blush-100'
          : 'bg-white border-ink-50'
      }`}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[12px] font-bold text-ink-300 tracking-[0.08em] tabular-nums">
          {number.padStart(2, '0')}
        </span>
        <h2 className="text-[17px] sm:text-[18px] font-bold text-ink-600 tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      <div className="text-[14px] text-ink-500 leading-relaxed space-y-3 pl-7">
        {children}
      </div>
    </section>
  );
}

function Callout({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-ink-50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-ink-600 mb-1">{title}</h3>
          <p className="text-[12px] text-ink-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}
