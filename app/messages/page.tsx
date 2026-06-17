'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Inbox, Loader2 } from 'lucide-react';
import { browser, type ConversationListItem } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { ChatModal } from '@/components/ChatModal';
import { displayName, nameInitial, formatShortDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openConv, setOpenConv] = useState<ConversationListItem | null>(null);

  function refresh() {
    if (!user) return;
    browser
      .listMyConversations(user.id)
      .then(setConversations)
      .catch((e) => setError(e?.message ?? t.sec_load_error));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    browser
      .listMyConversations(user.id)
      .then((data) => {
        if (cancelled) return;
        setConversations(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? t.sec_load_error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-ink-500">{t.sec_msg_login_prompt}</p>
        <Link
          href="/login?next=/messages"
          className="px-5 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
        >
          {t.sec_login}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-2">
            {t.sec_msg_title}
          </h1>
          <p className="text-[14px] text-ink-400 mb-8">
            {t.sec_msg_subtitle}
          </p>

          {error && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">
              {error}
            </div>
          )}

          {conversations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-ink-100">
              <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                <Inbox className="w-6 h-6 text-ink-300" />
              </div>
              <h3 className="text-lg font-bold text-ink-600 mb-2">
                {t.sec_msg_empty_title}
              </h3>
              <p className="text-[14px] text-ink-400 max-w-sm mx-auto leading-relaxed">
                {t.sec_msg_empty_body}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
              {conversations.map((conv, i) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  currentUserId={user.id}
                  isLast={i === conversations.length - 1}
                  onClick={() => setOpenConv(conv)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Chat modal */}
      <AnimatePresence>
        {openConv && openConv.other_user && (
          <ChatModal
            bookingIntentId={openConv.booking_intent_id}
            senderId={openConv.sender_id}
            travelerId={openConv.traveler_id}
            currentUserId={user.id}
            otherName={displayName(openConv.other_user.full_name) || t.sec_user_fallback}
            otherInitial={nameInitial(openConv.other_user.full_name)}
            contextLine={`${openConv.pickup_city} → ${openConv.destination_city}`}
            onClose={() => {
              setOpenConv(null);
              // Refresh the list so unread badges clear after the user read
              refresh();
            }}
            onMessagesRead={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConversationRow({
  conv,
  currentUserId,
  isLast,
  onClick,
}: {
  conv: ConversationListItem;
  currentUserId: string;
  isLast: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const otherName = displayName(conv.other_user?.full_name) || t.sec_user_fallback;
  const initial = nameInitial(conv.other_user?.full_name);
  const isUnread = conv.unread_count > 0;

  // Preview: if last message is from me, prefix "Vous : ", else just the body
  const preview = conv.last_message
    ? conv.last_message.sender_id === currentUserId
      ? t.sec_msg_you_prefix.replace('{body}', conv.last_message.body)
      : conv.last_message.body
    : t.sec_msg_no_message;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-cream-50 transition-colors ${
        !isLast ? 'border-b border-ink-50' : ''
      }`}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[14px] text-ink-500 relative">
        {initial}
        {isUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blush-500 border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className={`text-[14px] truncate ${isUnread ? 'font-bold text-ink-600' : 'font-semibold text-ink-600'}`}>
            {otherName}
          </div>
          <div className="flex-shrink-0 text-[11px] text-ink-300 num-display">
            {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
          </div>
        </div>
        <div className="text-[12px] text-ink-400 mb-0.5 truncate">
          {conv.pickup_city} → {conv.destination_city}
        </div>
        <div className={`text-[13px] truncate ${isUnread ? 'text-ink-600 font-medium' : 'text-ink-400'}`}>
          {preview}
        </div>
      </div>
    </button>
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
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return formatShortDate(iso);
}
