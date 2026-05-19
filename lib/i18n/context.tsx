'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Locale, type Translations, LOCALES } from './translations';

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  isRTL: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'jibly-locale';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'fr';
  const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved && (saved === 'fr' || saved === 'en')) return saved;
  const browser = window.navigator.language.toLowerCase();
  if (browser.startsWith('en')) return 'en';
  return 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectInitialLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale, mounted]);

  function setLocale(l: Locale) {
    setLocaleState(l);
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
