'use client';

import { Globe, ChevronDown } from 'lucide-react';
import { useI18n, LOCALES } from '@/lib/i18n/context';
import { isLocale } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';

// A native <select> rather than a row of codes: with five languages the row
// no longer fits next to the bell and the avatar, and the native picker is
// the one people already know how to use on a phone. The visible part is
// just the current code; the select sits transparently on top of it.
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-1 text-[13px] font-semibold text-ink-500 hover:text-ink-600 transition-colors cursor-pointer',
        compact ? 'px-1' : 'px-1.5 py-1'
      )}
    >
      <Globe className="w-3.5 h-3.5" aria-hidden />
      <span className="uppercase tracking-wide" aria-hidden>{locale}</span>
      <ChevronDown className="w-3 h-3 text-ink-300" aria-hidden />
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
        aria-label="Language / Langue / Idioma / Sprache / Taal"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
