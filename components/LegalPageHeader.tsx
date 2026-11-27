'use client';

// The only part of a legal page that depends on the visitor's language: the
// back link and, in French, a line saying the document itself is in English.
// The documents are English-only as supplied by the solicitor; a translation
// is a legal text in its own right and needs his sign-off before it goes up.

import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

export function LegalPageHeader({ title }: { title: string }) {
  const { t, locale } = useI18n();
  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-8"
      >
        <ArrowLeft className="rtl:-scale-x-100 w-3.5 h-3.5" />
        {t.cgu_back_home}
      </Link>
      <div className="mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-4">
          <Scale className="w-3.5 h-3.5 text-ink-500" />
          <span className="text-[12px] font-bold text-ink-600 tracking-wide">Jibly Limited</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">{title}</h1>
        {locale !== 'en' && (
          <p className="mt-4 text-[14px] text-ink-400 bg-white border border-ink-100 rounded-xl px-4 py-3">
            {t.legal_english_only}
          </p>
        )}
      </div>
    </>
  );
}
