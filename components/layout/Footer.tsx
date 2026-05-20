'use client';

import Link from 'next/link';
import { Logo } from '@/components/illustrations/Logo';
import { useI18n } from '@/lib/i18n/context';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-ink-50 mt-0 bg-cream-50">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-4">
            <Logo size="sm" />
            <p className="mt-5 text-[15px] text-ink-400 max-w-xs leading-relaxed">
              {t.footer_tagline}
            </p>
          </div>

          <div className="md:col-span-2 md:col-start-6">
            <h4 className="text-[12px] font-semibold text-ink-500 mb-5 uppercase tracking-[0.1em]">
              {t.footer_platform}
            </h4>
            <ul className="space-y-3 text-[14px] text-ink-400">
              <li><Link href="/envoyer" className="hover:text-ink-600 transition-colors">{t.nav_send}</Link></li>
              <li><Link href="/voyager" className="hover:text-ink-600 transition-colors">{t.nav_travel}</Link></li>
              <li><Link href="/" className="hover:text-ink-600 transition-colors">{t.nav_discover}</Link></li>
              <li><Link href="/me" className="hover:text-ink-600 transition-colors">{t.nav_my_space}</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[12px] font-semibold text-ink-500 mb-5 uppercase tracking-[0.1em]">
              {t.footer_trust}
            </h4>
            <ul className="space-y-3 text-[14px] text-ink-400">
              <li><Link href="/trust" className="hover:text-ink-600 transition-colors">{t.trust_eyebrow}</Link></li>
              <li><Link href="/trust#faq" className="hover:text-ink-600 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[12px] font-semibold text-ink-500 mb-5 uppercase tracking-[0.1em]">
              {t.footer_community}
            </h4>
            <ul className="space-y-3 text-[14px] text-ink-400">
              <li className="hover:text-ink-600 transition-colors cursor-pointer">Instagram</li>
              <li className="hover:text-ink-600 transition-colors cursor-pointer">Newsletter</li>
              <li className="hover:text-ink-600 transition-colors cursor-pointer">Contact</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-ink-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[13px] text-ink-300">© 2026 Jibly</p>
          <p className="text-[13px] text-ink-300">{t.footer_made_with}</p>
        </div>
      </div>
    </footer>
  );
}
