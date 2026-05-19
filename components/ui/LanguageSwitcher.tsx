'use client';

import { useI18n, LOCALES } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={cn(
      'inline-flex items-center text-[13px] font-medium',
      compact ? 'gap-1' : 'gap-1'
    )}>
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center">
          <button
            onClick={() => setLocale(l.code)}
            className={cn(
              'px-1.5 py-1 transition-colors uppercase tracking-wide',
              locale === l.code
                ? 'text-ink-600 font-semibold'
                : 'text-ink-300 hover:text-ink-500'
            )}
            aria-label={`Switch to ${l.label}`}
          >
            {l.code}
          </button>
          {i < LOCALES.length - 1 && (
            <span className="text-ink-200">/</span>
          )}
        </span>
      ))}
    </div>
  );
}
