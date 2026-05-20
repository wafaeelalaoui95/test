'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, User, LogOut, Wallet } from 'lucide-react';
import { Logo } from '@/components/illustrations/Logo';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { nameInitial, formatName, formatEuros } from '@/lib/utils';
import { browser } from '@/lib/supabase/queries';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const { t } = useI18n();
  const { user, profile, loading, signOut } = useAuth();

  // Fetch wallet balance when the user logs in. Re-runs whenever the
  // user changes (login / logout). The Navbar re-mounts on hard refresh,
  // so this stays fresh enough for the MVP. A future improvement would
  // be a Supabase realtime subscription.
  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      return;
    }
    let cancelled = false;
    browser
      .getWalletBalance(user.id)
      .then((v) => {
        if (!cancelled) setWalletBalance(v);
      })
      .catch(() => {
        if (!cancelled) setWalletBalance(0);
      });
    return () => { cancelled = true; };
  }, [user]);

  const navLinks = [
    { href: '/envoyer', label: t.nav_send },
    { href: '/voyager', label: t.nav_travel },
    { href: '/trust', label: t.nav_trust },
  ];

  const initial = profile?.full_name
    ? nameInitial(profile.full_name)
    : (user?.email?.charAt(0).toUpperCase() ?? '·');

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-cream-50/85 border-b border-ink-50">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <nav className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center -ml-1">
            <Logo size="sm" />
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[15px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />

            {loading ? (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-[15px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
                >
                  {t.auth_login_btn}
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="p-2 text-ink-400 hover:text-ink-600 transition-colors"
                    aria-label={t.auth_logout}
                    title={t.auth_logout}
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                  </button>
                </form>
              </>
            ) : user ? (
              <>
                {/* Wallet pill — Vinted style. Shows balance when > 0,
                    just the icon otherwise. Click goes to /wallet for the
                    full transactions view. */}
                <Link
                  href="/wallet"
                  className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 transition-colors"
                  title="Mon portefeuille"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="text-[13px] font-bold num-display">
                    {walletBalance !== null ? formatEuros(walletBalance) : '—'}
                  </span>
                </Link>

                <Link
                  href="/me"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-ink-50 transition-colors"
                  title={t.nav_my_space}
                >
                  <div className="w-7 h-7 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[12px] text-lavender-700">
                    {initial}
                  </div>
                </Link>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="p-2 text-ink-400 hover:text-ink-600 transition-colors"
                    aria-label={t.auth_logout}
                    title={t.auth_logout}
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-[15px] font-medium text-ink-500 hover:text-ink-600 transition-colors"
                >
                  {t.auth_login_btn}
                </Link>
                <Link
                  href="/signup"
                  className="ml-1 inline-flex items-center px-4 py-2 text-[15px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors"
                >
                  {t.nav_start}
                </Link>
              </>
            )}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <LanguageSwitcher compact />
            <button
              className="p-2 text-ink-500"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-ink-50 bg-cream-50"
          >
            <div className="px-5 py-6 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="py-3 text-base font-medium text-ink-500"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}

              {user ? (
                <>
                  <Link
                    href="/me"
                    className="py-3 text-base font-medium text-ink-500 flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    {t.nav_my_space}
                  </Link>
                  <form action="/auth/sign-out" method="post" className="mt-2">
                    <button
                      type="submit"
                      className="w-full py-3 text-base font-medium text-ink-400 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.auth_logout}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="py-3 text-base font-medium text-ink-500"
                  >
                    {t.auth_login_btn}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="mt-4 inline-flex items-center justify-center px-5 py-3 text-[15px] font-semibold text-cream-50 bg-ink-500 rounded-full"
                  >
                    {t.nav_start}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
