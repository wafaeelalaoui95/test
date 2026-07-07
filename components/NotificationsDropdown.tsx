'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, Inbox, Loader2, X, ArrowRight } from 'lucide-react';
import { browser, type Notification } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { useI18n } from '@/lib/i18n/context';

/**
 * Bell icon in the navbar that opens a small dropdown panel with the 5
 * most recent notifications. Each row links to the relevant /me view
 * (or wherever the notification points) and is marked read on click.
 *
 * Why a dropdown instead of a full page: most notifications need a quick
 * glance — "did anything happen on my colis?" — and the user wants to
 * dismiss them or jump into action without losing their current page.
 * The full /notifications page is still reachable from the footer for
 * users who want the long history.
 *
 * Inbox messages are also reachable from the footer as a secondary
 * action — we don't surface them in the navbar anymore because
 * notifications and messages serve different mental models.
 */
export function NotificationsDropdown() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  // When set, we show a detail popup for this notification instead of
  // navigating straight away (used for disputes, which need context before
  // sending the user to the affected parcel).
  const [detailNotif, setDetailNotif] = useState<Notification | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Background unread count poll — every 30s while the user is on the
  // app. Cheap query (HEAD with count) so it's fine to run regularly.
  // No realtime subscription for now to keep the surface small; we can
  // add Supabase realtime later if needed.
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const n = await browser.countUnreadNotifications(user.id);
        if (!cancelled) setUnread(n);
      } catch {
        /* silent: bell can show stale count, not worth surfacing */
      }
    };
    refresh();
    const iv = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [user]);

  // Load the dropdown contents lazily — only when the user actually opens
  // the panel. Saves a query on every page load.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    browser
      .listNotifications(user.id, 5)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // Close on outside click. We use mousedown so the click that opens the
  // panel doesn't immediately close it before the state settles.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!user) return null;

  // Click on a row: optimistically mark as read locally, fire the DB
  // update, and navigate. We don't await the DB call before navigating —
  // optimistic UX, and if it fails the worst case is the badge stays
  // until the next 30s refresh.
  // Dispute / "a problem was reported" notifications need context before we
  // send the user anywhere — the bare link used to dump them on a profile
  // page with no idea which parcel/flight was affected. Detect them loosely
  // by type so we don't depend on the exact server-side string.
  function isDisputeNotif(type: string): boolean {
    return /dispute|litige|problem|probleme/i.test(type);
  }

  // Where "Voir les détails" should lead: straight to the affected booking on
  // the dashboard when we know it, otherwise the dashboard itself (never the
  // public profile).
  function detailTarget(n: Notification): string {
    if (n.related_booking_id) return `/me?booking=${n.related_booking_id}`;
    return '/me';
  }

  function markRead(n: Notification) {
    if (n.read_at) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it
      )
    );
    setUnread((u) => Math.max(0, u - 1));
    browser.markNotificationRead(n.id).catch(() => {});
  }

  function openNotification(n: Notification) {
    markRead(n);
    // Disputes open a detail popup (with the full message + a link to the
    // affected parcel) rather than navigating immediately.
    if (isDisputeNotif(n.type)) {
      setOpen(false);
      setDetailNotif(n);
      return;
    }
    setOpen(false);
    // A new incoming booking request opens the request-details popup on /me.
    if (n.type === 'booking_request_received' && n.related_booking_id) {
      router.push(`/me?booking=${n.related_booking_id}`);
    } else if (n.link) {
      router.push(n.link);
    }
  }

  async function markAllRead() {
    if (!user) return;
    // Optimistic: zero out the badge immediately.
    setItems((prev) =>
      prev.map((it) =>
        it.read_at ? it : { ...it, read_at: new Date().toISOString() }
      )
    );
    setUnread(0);
    try {
      await browser.markAllNotificationsRead(user.id);
    } catch {
      /* best-effort */
    }
  }

  // Map notification types to emojis. Falls back to a generic bell.
  // Keeps the list scannable: the icon alone hints what kind of event.
  function emojiFor(type: string): string {
    if (isDisputeNotif(type)) return '⚠️';
    switch (type) {
      case 'booking_request_received':
        return '📦';
      case 'proposal_received':
        return '✋';
      case 'booking_accepted':
        return '✓';
      case 'proposal_accepted':
        return '🎉';
      case 'proposal_declined':
        return '✕';
      case 'delivery_proof_uploaded':
        return '📸';
      case 'receipt_confirmed':
        return '💰';
      case 'matching_trip_available':
        return '✈️';
      case 'matching_request_available':
        return '📍';
      default:
        return '🔔';
    }
  }

  // Friendly relative-time string. We keep it simple here — for a long
  // history view, /notifications can use a fuller library or a date.
  function relativeTime(iso: string): string {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const sec = Math.max(0, Math.floor((now - then) / 1000));
    if (sec < 60) return t.notif_time_now;
    const min = Math.floor(sec / 60);
    if (min < 60) return t.notif_time_min.replace('{n}', String(min));
    const hr = Math.floor(min / 60);
    if (hr < 24) return t.notif_time_hour.replace('{n}', String(hr));
    const days = Math.floor(hr / 24);
    if (days < 7) return t.notif_time_day.replace('{n}', String(days));
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-ink-50 text-ink-400 hover:text-ink-600 transition-colors"
        aria-label={t.nav_notifications}
        title={t.nav_notifications}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          // Numeric badge for low counts, "9+" cap to keep the bubble tight
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blush-500 text-white text-[10px] font-bold flex items-center justify-center num-display">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            // Anchored under the bell. Width fixed so it doesn't snap to
            // ridiculous sizes; on phones it sits flush to the right edge.
            className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white border border-ink-100 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-ink-50">
              <h3 className="text-[14px] font-bold text-ink-600">{t.nav_notifications}</h3>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  {t.notif_mark_all_read}
                </button>
              )}
            </div>

            {/* Body — list of notifications */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-6 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-ink-300 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-3">
                    <Bell className="w-4 h-4 text-ink-300" />
                  </div>
                  <p className="text-[13px] text-ink-400">
                    {t.notif_empty}
                  </p>
                </div>
              ) : (
                items.map((n) => {
                  const isUnread = !n.read_at;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`w-full text-start px-4 py-3 flex gap-3 items-start transition-colors ${
                        isUnread
                          ? 'bg-lavender-50/40 hover:bg-lavender-50/70'
                          : 'hover:bg-cream-50'
                      } border-b border-ink-50 last:border-b-0`}
                    >
                      <span className="flex-shrink-0 text-[18px] mt-0.5">
                        {emojiFor(n.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-[13px] leading-snug ${
                            isUnread
                              ? 'font-semibold text-ink-600'
                              : 'font-medium text-ink-500'
                          }`}
                        >
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-[12px] text-ink-400 mt-0.5 truncate">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[11px] text-ink-300 mt-0.5">
                          {relativeTime(n.created_at)}
                        </div>
                      </div>
                      {isUnread && (
                        // Small dot on the right, mirrors how iOS Mail / Gmail
                        // marks unread items
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-lavender-500 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer — secondary entries: full notifications page +
                inbox messages (kept here so it's still reachable but
                doesn't clutter the navbar). */}
            <div className="border-t border-ink-50 bg-cream-50/50 divide-y divide-ink-50">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-[13px] font-medium text-ink-500 hover:text-ink-600 hover:bg-cream-50 text-center transition-colors"
              >
                {t.notif_see_all}
              </Link>
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[13px] font-medium text-ink-400 hover:text-ink-600 hover:bg-cream-50 transition-colors"
              >
                <Inbox className="w-3.5 h-3.5" />
                {t.notif_my_messages}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail popup — shown for disputes so the user sees the full message
          and can jump straight to the affected parcel instead of landing on a
          context-less profile page. */}
      <AnimatePresence>
        {detailNotif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => setDetailNotif(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex-shrink-0 text-[22px] mt-0.5">{emojiFor(detailNotif.type)}</span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold text-ink-600 leading-snug">
                      {detailNotif.title}
                    </h3>
                    <div className="text-[11px] text-ink-300 mt-1">
                      {relativeTime(detailNotif.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailNotif(null)}
                  className="flex-shrink-0 p-1.5 -mr-1 rounded-full hover:bg-ink-50 text-ink-400 transition-colors"
                  aria-label={t.common_close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {detailNotif.body && (
                <p className="px-5 text-[14px] text-ink-500 leading-relaxed whitespace-pre-line">
                  {detailNotif.body}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 px-5 py-4 mt-2">
                <button
                  type="button"
                  onClick={() => setDetailNotif(null)}
                  className="px-4 py-2 rounded-full text-[13px] font-medium text-ink-500 hover:bg-ink-50 transition-colors"
                >
                  {t.common_close}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = detailTarget(detailNotif);
                    setDetailNotif(null);
                    router.push(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors"
                >
                  {t.notif_view_details}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
