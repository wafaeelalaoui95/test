'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { translations, type Locale, type Translations, LOCALES } from './translations';

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  isRTL: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// MVP decision: French-only until we have proper EN copy reviewed.
// We keep the i18n plumbing in place (translations.ts still has both
// locales) so re-enabling EN later only needs flipping LOCKED_LOCALE
// back to the detection logic — no code changes elsewhere.
const LOCKED_LOCALE: Locale = 'fr';

export function I18nProvider({ children }: { children: ReactNode }) {
  // No state, no localStorage, no navigator sniffing. Just French.
  const locale: Locale = LOCKED_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);

  function setLocale(_l: Locale) {
    // No-op while locked. Kept on the context so callers don't break.
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale], isRTL: false }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export { LOCALES };
