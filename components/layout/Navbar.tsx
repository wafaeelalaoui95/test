'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, User, LogOut, Wallet, Bell, Inbox } from 'lucide-react';
import { Logo } from '@/components/illustrations/Logo';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { nameInitial, formatName, formatEuros } from '@/lib/utils';
import { browser } from '@/lib/supabase/queries';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  // We still poll unread notifications count for the MOBILE bell (the
  // dropdown component handles its own count for the desktop bell).
  const [mobileUnread, setMobileUnread] = useState(0);
  const { t } = useI18n();
  const { user, profile, loading, signOut } = useAuth();

  // Wallet balance is fetched once per session; the bell count is also
  // refreshed every 30s. The dropdown component owns its own count, so
  // here we only need it for the mobile-collapsed bell icon.
  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      setMobileUnread(0);
      return;
    }
    let cancelled = false;
    browser
      .getWalletBalance(user.id)
      .then((v) => { if (!cancelled) setWalletBalance(v); })
      .catch(() => { if (!cancelled) setWalletBalance(0); });

    const refreshUnread = () => {
      browser
        .countUnreadNotifications(user.id)
        .then((n) => { if (!cancelled) setMobileUnread(n); })
        .catch(() => { if (!cancelled) setMobileUnread(0); });
    };
    refreshUnread();
    const iv = setInterval(refreshUnread, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [user]);

  const navLinks = [
    { href: '/envoyer', label: t.nav_send },
    { href: '/voyager', label: t.nav_travel },
    { href: '/trust', label: t.nav_trust },
  ];

  const initial = profile?.full_name
    ? nameInitial(profile.full_name)
    : (user?.email?.charAt(0).toUpperCase() ?? '·');

  // Trust/FAQ entry for the mobile menu. Pulled out of the top nav links so it
  // can sit at the bottom of the list (just above sign-out when logged in).
  const mobileTrustLink = (
    <Link
      href="/trust"
      className="py-3 text-base font-medium text-ink-500"
      onClick={() => setOpen(false)}
    >
      {t.nav_trust}
    </Link>
  );

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

            {/* Notifications bell — replaces the previous Inbox icon.
                Inbox messages are still reachable, but as a secondary
                entry from inside the notifications dropdown. */}
            {user && <NotificationsDropdown />}

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
                {/* Wallet pill — Vinted style */}
                <Link
                  href="/wallet"
                  className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 transition-colors"
                  title={t.nav_wallet_title}
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

          {/* Mobile right-side cluster — wallet pill + bell + burger.
              The dropdown is full-featured on desktop, but on mobile we
              just link to the dedicated /notifications page when the bell
              is tapped — a small popover doesn't work well on phone. */}
          <div className="flex md:hidden items-center gap-1">
            {user && (
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-ink-500 text-cream-50"
                aria-label={t.nav_wallet_title}
                title={t.nav_wallet_title}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-[12px] font-bold num-display">
                  {walletBalance !== null ? formatEuros(walletBalance) : '—'}
                </span>
              </Link>
            )}
            {user && (
              <Link
                href="/notifications"
                className="relative p-2 text-ink-500"
                aria-label={t.nav_notifications}
              >
                <Bell className="h-5 w-5" />
                {mobileUnread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-1 rounded-full bg-blush-500 text-white text-[9px] font-bold flex items-center justify-center num-display border border-cream-50">
                    {mobileUnread > 9 ? '9+' : mobileUnread}
                  </span>
                )}
              </Link>
            )}
            <button
              className="p-2 text-ink-500"
              onClick={() => setOpen(!open)}
              aria-label={t.nav_menu}
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
              {navLinks
                .filter((l) => l.href !== '/trust')
                .map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="py-3 text-base font-medium text-ink-500"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                ))}

              <div className="py-3 border-t border-ink-50 mt-1">
                <LanguageSwitcher />
              </div>

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
                  <Link
                    href="/wallet"
                    className="py-3 text-base font-medium text-ink-500 flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{t.nav_wallet_label}</span>
                    <span className="ml-auto text-[14px] font-bold text-ink-600 num-display">
                      {walletBalance !== null ? formatEuros(walletBalance) : '—'}
                    </span>
                  </Link>
                  <Link
                    href="/notifications"
                    className="py-3 text-base font-medium text-ink-500 flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Bell className="w-4 h-4" />
                    <span>{t.nav_notifications}</span>
                    {mobileUnread > 0 && (
                      <span className="ml-auto min-w-[18px] h-5 px-1.5 rounded-full bg-blush-500 text-white text-[11px] font-bold flex items-center justify-center num-display">
                        {mobileUnread > 9 ? '9+' : mobileUnread}
                      </span>
                    )}
                  </Link>
                  {/* Messages — same destination as the desktop dropdown's
                      "Mes messages" entry, surfaced here since mobile has no
                      notifications dropdown. */}
                  <Link
                    href="/messages"
                    className="py-3 text-base font-medium text-ink-500 flex items-center gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Inbox className="w-4 h-4" />
                    <span>{t.notif_my_messages}</span>
                  </Link>
                  {mobileTrustLink}
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
                  {mobileTrustLink}
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
