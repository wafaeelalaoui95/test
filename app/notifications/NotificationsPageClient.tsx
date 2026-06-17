'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  Check,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { browser, type Notification } from '@/lib/supabase/queries';
import { useI18n } from '@/lib/i18n/context';

const PAGE_SIZE = 30;

export default function NotificationsPageClient({
  initialUser,
  initialItems,
}: {
  initialUser: { id: string; email: string | null };
  initialItems: Notification[];
}) {
  const user = initialUser;
  const { t, locale } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initialItems);
  // If we got back fewer than a full page, we know there's nothing more.
  const [hasMore, setHasMore] = useState(initialItems.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const unreadCount = items.filter((it) => !it.read_at).length;

  // Open: optimistic mark-as-read + navigate. Same flow as the dropdown.
  function openNotification(n: Notification) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it
        )
      );
      browser.markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    setBulkBusy(true);
    // Optimistic update
    setItems((prev) =>
      prev.map((it) =>
        it.read_at ? it : { ...it, read_at: new Date().toISOString() }
      )
    );
    try {
      await browser.markAllNotificationsRead(user.id);
    } catch {
      /* best-effort */
    } finally {
      setBulkBusy(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const more = await browser.listNotifications(
        user.id,
        PAGE_SIZE,
        last.created_at
      );
      setItems((prev) => [...prev, ...more]);
      if (more.length < PAGE_SIZE) setHasMore(false);
    } catch (e) {
      console.warn('[notifications] load more failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }

  // Emoji per notification type. Mirrors the dropdown so the same kinds
  // look the same everywhere.
  function emojiFor(type: string): string {
    switch (type) {
      case 'booking_request_received': return '📦';
      case 'proposal_received': return '✋';
      case 'booking_accepted': return '✓';
      case 'proposal_accepted': return '🎉';
      case 'proposal_declined': return '✕';
      case 'delivery_proof_uploaded': return '📸';
      case 'receipt_confirmed': return '💰';
      case 'matching_trip_available': return '✈️';
      case 'matching_request_available': return '📍';
      default: return '🔔';
    }
  }

  // Full date+time for the dedicated page — users on /notifications are
  // here to scan history, so absolute timestamps are more useful than
  // "il y a 4 j".
  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.sec_back_to_space}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-1">
                {t.sec_notif_title}
              </h1>
              <p className="text-[14px] text-ink-400">
                {t.sec_notif_subtitle}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={bulkBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {t.sec_notif_mark_all_read}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-ink-100">
              <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                <Bell className="w-6 h-6 text-ink-300" />
              </div>
              <h3 className="text-lg font-bold text-ink-600 mb-2">
                {t.sec_notif_empty_title}
              </h3>
              <p className="text-[14px] text-ink-400 max-w-sm mx-auto leading-relaxed">
                {t.sec_notif_empty_body}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
              {items.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`w-full text-start px-4 py-4 flex gap-3 items-start transition-colors border-b border-ink-50 last:border-b-0 ${
                      isUnread
                        ? 'bg-lavender-50/40 hover:bg-lavender-50/70'
                        : 'hover:bg-cream-50'
                    }`}
                  >
                    <span className="flex-shrink-0 text-[20px] mt-0.5">
                      {emojiFor(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[14px] leading-snug ${
                          isUnread
                            ? 'font-semibold text-ink-600'
                            : 'font-medium text-ink-500'
                        }`}
                      >
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-[13px] text-ink-400 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[11px] text-ink-300 mt-1 num-display">
                        {formatTime(n.created_at)}
                      </div>
                    </div>
                    {isUnread && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-lavender-500 mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-600 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t.sec_loading}
                  </>
                ) : (
                  t.sec_load_more
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
