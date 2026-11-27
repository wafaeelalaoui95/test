'use client';

// "Que voulez-vous envoyer ?" on the home page: one card per featured guide
// (lib/guides.ts). The guides exist in French and English only, so every
// language other than French opens the English version.
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GUIDES } from '@/lib/guides';
import { useI18n } from '@/lib/i18n/context';

export function HomeGuides() {
  const { locale, t } = useI18n();
  const en = locale !== 'fr';
  return (
    <section className="border-t border-ink-50">
      <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] text-center mb-8">
          {t.home_guides_title}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUIDES.filter((g) => g.featured).map((g) => {
            const c = en ? g.card.en : g.card.fr;
            return (
              <Link
                key={g.path}
                href={en && g.alt ? g.alt : g.path}
                className="group bg-white rounded-2xl border border-ink-50 hover:border-ink-200 p-5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink-600 text-[15px]">{c.title}</span>
                  <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-600 transition-colors flex-shrink-0" />
                </div>
                <p className="mt-1 text-[14px] text-ink-500 leading-snug">{c.text}</p>
              </Link>
            );
          })}
        </div>
        <div className="text-center mt-6">
          <Link href={en ? '/en/guides' : '/guides'} className="text-[14px] font-semibold text-lavender-600 hover:text-lavender-700">
            {t.home_guides_all}
          </Link>
        </div>
      </div>
    </section>
  );
}
