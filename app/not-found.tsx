'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-20">
      <div className="max-w-md text-center">
        <div className="text-[64px] font-extrabold text-ink-200 tracking-[-0.04em] num-display mb-2">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
          {t.notfound_title}
        </h1>
        <p className="text-[15px] text-ink-400 leading-relaxed mb-8">{t.notfound_text}</p>
        <Link href="/">
          <Button>{t.notfound_home}</Button>
        </Link>
      </div>
    </div>
  );
}
