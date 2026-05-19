'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Package,
  Search,
  Scale,
  Pill,
  Sparkles,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import type { Translations } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';

type LucideIcon = typeof Package;

interface FAQItem {
  id: string;
  icon: LucideIcon;
  questionKey: keyof Translations;
  /** body renderer — receives t and returns JSX */
  body: (t: Translations) => React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what',
    icon: Package,
    questionKey: 'trust_q1_question',
    body: (t) => (
      <>
        <p className="text-[15px] text-ink-500 leading-relaxed mb-4">
          {t.trust_q1_intro}
        </p>
        <ul className="space-y-2.5 mb-4">
          {[t.trust_q1_item_1, t.trust_q1_item_2, t.trust_q1_item_3, t.trust_q1_item_4].map((it) => (
            <li key={it} className="flex items-start gap-3 text-[15px] text-ink-500">
              <span className="w-1 h-1 rounded-full bg-ink-300 mt-2.5 flex-shrink-0" />
              {it}
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-ink-400 leading-relaxed">
          {t.trust_q1_note}
        </p>
      </>
    ),
  },
  {
    id: 'verify',
    icon: Search,
    questionKey: 'trust_q2_question',
    body: (t) => (
      <p className="text-[15px] text-ink-500 leading-relaxed">{t.trust_q2_text}</p>
    ),
  },
  {
    id: 'responsibility',
    icon: Scale,
    questionKey: 'trust_q3_question',
    body: (t) => (
      <p className="text-[15px] text-ink-500 leading-relaxed">{t.trust_q3_text}</p>
    ),
  },
  {
    id: 'medication',
    icon: Pill,
    questionKey: 'trust_q4_question',
    body: (t) => (
      <p className="text-[15px] text-ink-500 leading-relaxed">{t.trust_q4_text}</p>
    ),
  },
  {
    id: 'trust',
    icon: Sparkles,
    questionKey: 'trust_q5_question',
    body: (t) => (
      <>
        <p className="text-[15px] text-ink-500 leading-relaxed mb-4">
          {t.trust_q5_intro}
        </p>
        <ul className="space-y-2.5">
          {[t.trust_q5_item_1, t.trust_q5_item_2, t.trust_q5_item_3, t.trust_q5_item_4].map((it) => (
            <li key={it} className="flex items-start gap-3 text-[15px] text-ink-500">
              <span className="w-1 h-1 rounded-full bg-lavender-500 mt-2.5 flex-shrink-0" />
              {it}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'forbidden',
    icon: Ban,
    questionKey: 'trust_q6_question',
    body: (t) => (
      <>
        <p className="text-[15px] text-ink-500 leading-relaxed mb-4">
          {t.trust_q6_intro}
        </p>
        <ul className="space-y-2.5">
          {[
            t.trust_q6_item_1,
            t.trust_q6_item_2,
            t.trust_q6_item_3,
            t.trust_q6_item_4,
            t.trust_q6_item_5,
            t.trust_q6_item_6,
          ].map((it) => (
            <li key={it} className="flex items-start gap-3 text-[15px] text-ink-500">
              <span className="w-1 h-1 rounded-full bg-blush-400 mt-2.5 flex-shrink-0" />
              {it}
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

export default function TrustPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [openId, setOpenId] = useState<string | null>('what');

  return (
    <div>
      {/* HERO */}
      <section className="pt-16 lg:pt-24 pb-12 lg:pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-[13px] font-semibold text-ink-300 tracking-[0.1em] uppercase mb-6">
              {t.trust_eyebrow}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.035em] text-balance">
              {t.trust_hero_title}
            </h1>
            <p className="mt-7 text-lg sm:text-xl text-ink-400 max-w-measure leading-relaxed">
              {t.trust_hero_subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* INTENT — what Jibly is and isn't */}
      <section className="border-t border-ink-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-16 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl bg-lavender-50 rounded-3xl p-8 lg:p-10"
          >
            <h2 className="text-xl lg:text-2xl font-bold text-ink-600 tracking-[-0.015em] mb-3">
              {t.trust_intent_title}
            </h2>
            <p className="text-[16px] text-ink-500 leading-relaxed">
              {t.trust_intent_text}
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink-50 section-solid">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
          <div className="max-w-2xl mb-14 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] text-balance">
              {t.trust_faq_title}
            </h2>
          </div>

          <div className="max-w-3xl space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <FAQRow
                key={item.id}
                item={item}
                index={i}
                open={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                t={t}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="border-t border-ink-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink-600 leading-[1.1] tracking-[-0.025em] mb-4">
              {t.trust_footer_title}
            </h2>
            <p className="text-[16px] sm:text-lg text-ink-400 leading-relaxed mb-8 max-w-measure">
              {t.trust_footer_text}
            </p>
            <Link href={user ? '/envoyer' : '/signup'}>
              <Button size="lg">
                {t.trust_footer_cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FAQRow({
  item,
  index,
  open,
  onToggle,
  t,
}: {
  item: FAQItem;
  index: number;
  open: boolean;
  onToggle: () => void;
  t: Translations;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
      className={cn(
        'rounded-2xl border transition-all duration-200',
        open
          ? 'bg-white border-ink-100'
          : 'bg-white border-ink-50 hover:border-ink-100'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-start px-6 py-5 lg:px-7 lg:py-6 flex items-center gap-4 group"
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
            open ? 'bg-lavender-100 text-lavender-700' : 'bg-cream-100 text-ink-500'
          )}
        >
          <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>

        <span
          className={cn(
            'flex-1 text-[16px] lg:text-[17px] font-semibold tracking-[-0.01em] transition-colors',
            open ? 'text-ink-600' : 'text-ink-600 group-hover:text-ink-600'
          )}
        >
          {t[item.questionKey]}
        </span>

        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
            open ? 'bg-ink-500 text-cream-50 rotate-45' : 'bg-cream-100 text-ink-500'
          )}
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 lg:px-7 lg:pb-7 pl-[72px] lg:pl-[80px]">
              {item.body(t)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
