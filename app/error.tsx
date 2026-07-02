'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // Surface for logging/monitoring; the user sees the friendly copy below.
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-20">
      <div className="max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
          {t.error_title}
        </h1>
        <p className="text-[15px] text-ink-400 leading-relaxed mb-8">{t.error_text}</p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button onClick={() => reset()}>{t.error_retry}</Button>
          <Link href="/">
            <Button variant="secondary">{t.notfound_home}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
