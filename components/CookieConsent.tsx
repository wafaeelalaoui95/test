'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

const STORAGE_KEY = 'jibly:cookie-consent';

export function CookieConsent() {
  const { t } = useI18n();
  // Start hidden; reveal only after we've checked localStorage on the client,
  // so it never flashes for users who already acknowledged (and avoids an
  // SSR hydration mismatch).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* private mode / storage disabled — just show it */
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl bg-white border border-ink-100 rounded-2xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.18)] px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-[13px] text-ink-500 leading-relaxed flex-1">
          {t.cookie_text}{' '}
          <Link href="/confidentialite" className="font-semibold text-ink-600 underline underline-offset-2">
            {t.cookie_more}
          </Link>
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors"
        >
          {t.cookie_accept}
        </button>
      </div>
    </div>
  );
}
