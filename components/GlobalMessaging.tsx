'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Inbox } from 'lucide-react';
import { browser, type ConversationListItem } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { useI18n } from '@/lib/i18n/context';
import { ChatModal } from '@/components/ChatModal';
import { displayName, nameInitial, formatShortDate } from '@/lib/utils';
import { cityDisplayName } from '@/lib/countries';

// Global messaging drawer (Messenger / Airbnb style): openable from anywhere
// (the navbar Messages icon) as a right-side overlay, without leaving the
// current page. Mobile: full screen. Desktop: a docked right panel.

type MessagingCtx = { isOpen: boolean; openMessaging: () => void; closeMessaging: () => void };
const Ctx = createContext<MessagingCtx | null>(null);

export function useMessaging(): MessagingCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMessaging must be used within MessagingProvider');
  return c;
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openMessaging = useCallback(() => setOpen(true), []);
  const closeMessaging = useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ isOpen: open, openMessaging, closeMessaging }}>
      {children}
      <AnimatePresence>{open && <MessagingPanel onClose={closeMessaging} />}</AnimatePresence>
    </Ctx.Provider>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return formatShortDate(iso);
}

function MessagingPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openConv, setOpenConv] = useState<ConversationListItem | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    browser.listMyConversations(user.id).then(setConversations).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    browser
      .listMyConversations(user.id)
      .then((d) => { if (!cancelled) setConversations(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[95] bg-ink-600/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-cream-50 shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-ink-100">
            <h2 className="text-[17px] font-extrabold text-ink-600 tracking-[-0.01em]">{t.sec_msg_title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-full hover:bg-ink-50 text-ink-400 transition-colors"
              aria-label={t.chat_close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!user ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                <p className="text-[14px] text-ink-500">{t.sec_msg_login_prompt}</p>
                <Link
                  href="/login?next=/messages"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
                >
                  {t.sec_login}
                </Link>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-ink-300 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                <div className="w-14 h-14 rounded-full bg-cream-100 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-ink-300" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-ink-600 mb-1">{t.sec_msg_empty_title}</h3>
                  <p className="text-[13px] text-ink-400 leading-relaxed">{t.sec_msg_empty_body}</p>
                </div>
              </div>
            ) : (
              conversations.map((conv, i) => {
                const otherName = displayName(conv.other_user?.full_name) || t.sec_user_fallback;
                const initial = nameInitial(conv.other_user?.full_name);
                const isUnread = conv.unread_count > 0;
                const preview = conv.last_message
                  ? conv.last_message.sender_id === user.id
                    ? t.sec_msg_you_prefix.replace('{body}', conv.last_message.body)
                    : conv.last_message.body
                  : t.sec_msg_no_message;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setOpenConv(conv)}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-cream-100/60 transition-colors ${
                      i !== conversations.length - 1 ? 'border-b border-ink-50' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[14px] text-ink-500 relative">
                      {initial}
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blush-500 border-2 border-cream-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className={`text-[14px] truncate ${isUnread ? 'font-bold' : 'font-semibold'} text-ink-600`}>
                          {otherName}
                        </div>
                        <div className="flex-shrink-0 text-[11px] text-ink-300 num-display">
                          {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                        </div>
                      </div>
                      <div className="text-[12px] text-ink-400 mb-0.5 truncate">
                        {cityDisplayName(conv.pickup_city, locale)} → {cityDisplayName(conv.destination_city, locale)}
                      </div>
                      <div className={`text-[13px] truncate ${isUnread ? 'text-ink-600 font-medium' : 'text-ink-400'}`}>
                        {preview}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Selected conversation opens the chat panel over the list. */}
      <AnimatePresence>
        {openConv && openConv.other_user && user && (
          <ChatModal
            bookingIntentId={openConv.booking_intent_id}
            senderId={openConv.sender_id}
            travelerId={openConv.traveler_id}
            currentUserId={user.id}
            otherName={displayName(openConv.other_user.full_name) || t.sec_user_fallback}
            otherInitial={nameInitial(openConv.other_user.full_name)}
            contextLine={`${cityDisplayName(openConv.pickup_city, locale)} → ${cityDisplayName(openConv.destination_city, locale)}`}
            onClose={() => { setOpenConv(null); refresh(); }}
            onMessagesRead={refresh}
          />
        )}
      </AnimatePresence>
    </>
  );
}
