'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { browser, type MessageRowChat } from '@/lib/supabase/queries';
import { displayName, nameInitial, formatShortDate } from '@/lib/utils';

/**
 * Quick replies steer the conversation toward the two things we actually
 * want users discussing in-app: the address and the parcel. Tapping one
 * drops the text into the input (rather than sending immediately) so the
 * user can complete it — e.g. fill in the actual address after "Voici
 * l'adresse :" — and review before sending.
 */
const QUICK_REPLIES: { label: string; text: string }[] = [
  { label: '📍 Adresse', text: 'Voici l\'adresse : ' },
  { label: '📦 Le colis', text: 'À propos du colis : ' },
  { label: '🕐 J\'arrive bientôt', text: 'J\'arrive bientôt 🙂' },
  { label: '🔑 Code de récupération', text: 'Quel est le code de récupération ?' },
];

const TRACEABILITY_NOTICE_KEY = 'jibly:chat:traceability-dismissed';

type ChatModalProps = {
  bookingIntentId: string;
  senderId: string;     // the sender of the booking (who paid)
  travelerId: string;   // the traveler of the booking (who delivers)
  currentUserId: string;
  // Display info for the OTHER user (whoever I'm chatting with).
  otherName: string;
  otherInitial: string;
  // Optional context: shown as a slim header under the title so people
  // know which booking they're talking about.
  contextLine?: string;
  onClose: () => void;
  // Called whenever we mark messages as read (so parent can clear badges).
  onMessagesRead?: () => void;
};

/**
 * Full-screen chat modal. Opens over /me. Loads existing messages,
 * marks them as read, lets the user send new ones, and refreshes the
 * message list after each send.
 *
 * No realtime — per product decision, we rely on email notifications
 * for cross-session updates. The modal does poll once when re-focused
 * so a user who opens it after switching tabs sees recent messages.
 */
export function ChatModal({
  bookingIntentId,
  senderId,
  travelerId,
  currentUserId,
  otherName,
  otherInitial,
  contextLine,
  onClose,
  onMessagesRead,
}: ChatModalProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRowChat[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Traceability reminder: shown until the user dismisses it (per-browser).
  const [showNotice, setShowNotice] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Stash onMessagesRead in a ref so changes to that callback don't
  // re-fire effects on every parent re-render. The parent passes an
  // inline arrow function, which gets a new identity on every render —
  // putting it in deps caused the boot effect to re-run on every keystroke,
  // which is the lag the user saw while typing.
  const onMessagesReadRef = useRef(onMessagesRead);
  useEffect(() => { onMessagesReadRef.current = onMessagesRead; }, [onMessagesRead]);

  // Show the traceability reminder unless this browser already dismissed it.
  useEffect(() => {
    try {
      setShowNotice(localStorage.getItem(TRACEABILITY_NOTICE_KEY) !== '1');
    } catch {
      setShowNotice(true);
    }
  }, []);

  function dismissNotice() {
    setShowNotice(false);
    try {
      localStorage.setItem(TRACEABILITY_NOTICE_KEY, '1');
    } catch {
      /* ignore — private mode etc. */
    }
  }

  // Drop a quick-reply template into the input so the user can complete
  // and review it before sending. Append to any existing draft.
  function applyQuickReply(text: string) {
    setDraft((prev) => (prev.trim() ? `${prev.trimEnd()} ${text}` : text));
    inputRef.current?.focus();
  }

  // Boot: get or create the conversation, load messages, mark as read.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const conv = await browser.getOrCreateConversation(
          bookingIntentId,
          senderId,
          travelerId
        );
        if (cancelled) return;
        setConversationId(conv.id);

        const msgs = await browser.listMessages(conv.id);
        if (cancelled) return;
        setMessages(msgs);

        // Mark as read in the background — don't block the UI on it.
        // We use the ref to avoid re-firing this whole effect on every
        // parent re-render (which is what made the input lag).
        browser.markMessagesRead(conv.id, currentUserId).then(() => {
          if (!cancelled) onMessagesReadRef.current?.();
        });
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? 'Échec du chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bookingIntentId, senderId, travelerId, currentUserId]);

  // Refresh messages when the tab becomes visible again — covers the
  // "I came back from email" case without needing realtime.
  useEffect(() => {
    if (!conversationId) return;
    function refresh() {
      if (document.visibilityState !== 'visible') return;
      browser.listMessages(conversationId!)
        .then((msgs) => setMessages(msgs))
        .catch(() => {});
      browser.markMessagesRead(conversationId!, currentUserId)
        .then(() => onMessagesReadRef.current?.())
        .catch(() => {});
    }
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [conversationId, currentUserId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    if (!conversationId || !draft.trim() || sending) return;
    const body = draft.trim();
    setSending(true);
    setErr(null);
    // Optimistic update: show the message immediately, replace once the
    // server confirms.
    const optimistic: MessageRowChat = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Échec de l\'envoi');
      }
      const data = await res.json();
      // Replace the optimistic message with the real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data.message as MessageRowChat) : m))
      );
    } catch (e: any) {
      // Rollback: remove the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setErr(e?.message ?? 'Échec de l\'envoi. Réessayez.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] bg-ink-600/40 backdrop-blur-sm flex items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="bg-cream-50 w-full h-full sm:h-[680px] sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-100">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-ink-50 text-ink-400 transition-colors sm:hidden"
            aria-label="Fermer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[13px] text-ink-500">
            {otherInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-600 text-[15px] truncate">{otherName}</div>
            {contextLine && (
              <div className="text-[11px] text-ink-400 truncate">{contextLine}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-ink-50 text-ink-400 transition-colors hidden sm:block"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Traceability reminder — nudges users to keep exchanges on Jibly
            for tracking & protection. Dismissible per browser. */}
        {showNotice && (
          <div className="flex items-start gap-2.5 px-4 py-2.5 bg-lavender-50 border-b border-lavender-100">
            <ShieldCheck className="w-4 h-4 text-lavender-400 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-[12px] leading-relaxed text-ink-500">
              Gardez vos échanges sur Jibly : c'est ce qui nous permet d'assurer
              le suivi du colis et de vous protéger en cas de litige.
            </p>
            <button
              onClick={dismissNotice}
              className="p-0.5 -mr-1 rounded-full hover:bg-lavender-100 text-ink-300 transition-colors flex-shrink-0"
              aria-label="Masquer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-ink-300 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-[13px] text-ink-400 py-12 leading-relaxed max-w-xs mx-auto">
              Pas encore de message.<br />
              Dites bonjour à {otherName.split(' ')[0]} 👋
            </div>
          ) : (
            messages.map((m, i) => {
              const isMine = m.sender_id === currentUserId;
              // Group consecutive messages from same sender, show timestamp
              // only on the last of each group
              const isLastOfGroup =
                i === messages.length - 1 ||
                messages[i + 1].sender_id !== m.sender_id;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-ink-500 text-cream-50 rounded-br-md'
                          : 'bg-white border border-ink-100 text-ink-600 rounded-bl-md'
                      }`}
                    >
                      {m.body}
                    </div>
                    {isLastOfGroup && (
                      <div className="text-[10px] text-ink-300 mt-1 px-1">
                        {formatTime(m.created_at)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {err && (
          <div className="px-4 py-2 bg-blush-50 text-blush-500 text-[12px] border-t border-blush-100">
            {err}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-ink-100 bg-cream-50">
          {/* Quick replies — steer toward address & parcel topics. Tapping
              fills the input so the user can complete/edit before sending. */}
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 -mx-0.5 px-0.5 scrollbar-hide">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                onClick={() => applyQuickReply(qr.text)}
                disabled={loading || sending}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white border border-ink-100 text-[12px] text-ink-500 whitespace-nowrap hover:bg-lavender-50 hover:border-lavender-200 transition-colors disabled:opacity-40"
              >
                {qr.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Écrire à ${otherName.split(' ')[0]}…`}
              rows={1}
              maxLength={4000}
              disabled={loading || sending}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none max-h-32 disabled:opacity-50"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending || loading}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 inline-flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Envoyer"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hour:minute format. Same-day shows time, otherwise short date.
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
