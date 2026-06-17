'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Locale, type Translations, LOCALES } from './translations';

const STORAGE_KEY = 'jibly-locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  isRTL: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// Resolve the preferred locale on the client: an explicit stored choice
// wins, otherwise we fall back to the browser language (en → English,
// everything else → French).
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    /* ignore — private mode etc. */
  }
  const nav = window.navigator.language?.toLowerCase() ?? '';
  return nav.startsWith('en') ? 'en' : 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR and the first client render both use 'fr' so the markup matches
  // the server HTML; we then reconcile to the stored/detected locale after
  // mount. suppressHydrationWarning on <html> covers the lang/dir swap.
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const detected = detectLocale();
    if (detected !== locale) setLocaleState(detected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang/dir> in sync with the active locale.
  useEffect(() => {
    const meta = LOCALES.find((l) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = meta?.rtl ? 'rtl' : 'ltr';
  }, [locale]);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore — private mode etc. */
    }
  }

  const meta = LOCALES.find((l) => l.code === locale);

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t: translations[locale], isRTL: !!meta?.rtl }}
    >
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
