'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ChevronDown, Eye } from 'lucide-react';

// =============================================================================
// AdminChats — lire n'importe quelle conversation, sans pouvoir y écrire
// =============================================================================
// Reads /api/admin/chats. Lecture seule : pas de champ de saisie, et l'ouverture
// d'un fil ne marque aucun message comme lu.

type Conversation = {
  id: string;
  bookingId: string;
  senderId: string;
  travelerId: string;
  senderName: string | null;
  travelerName: string | null;
  route: string | null;
  item: string | null;
  paymentStatus: string | null;
  hasDispute: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminChats() {
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [onlyDisputes, setOnlyDisputes] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<Record<string, Message[] | 'error'>>({});

  useEffect(() => {
    fetch('/api/admin/chats')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setConvs(d.conversations ?? []))
      .catch((e) => setError(e.message));
  }, []);

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next && !thread[next]) {
      fetch(`/api/admin/chats?id=${next}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => setThread((t) => ({ ...t, [next]: d.messages ?? [] })))
        .catch(() => setThread((t) => ({ ...t, [next]: 'error' })));
    }
  }

  const shown = useMemo(() => {
    if (!convs) return [];
    const needle = q.trim().toLowerCase();
    return convs.filter((c) => {
      if (onlyDisputes && !c.hasDispute) return false;
      if (!needle) return true;
      return [c.senderName, c.travelerName, c.route, c.item, c.bookingId]
        .some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [convs, q, onlyDisputes]);

  if (error) return <p className="text-[13px] text-blush-500 font-mono">/api/admin/chats: {error}</p>;
  if (!convs) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">Conversations ({convs.length})</h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Lecture seule, pour la modération. Ouvrir un fil ne marque rien comme lu et vous ne pouvez pas y écrire.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="relative flex-1">
          <Search className="w-4 h-4 text-ink-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, trajet, objet, n° de réservation…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-ink-100 bg-white text-[14px] text-ink-600 outline-none focus:border-ink-300"
          />
        </label>
        <button
          onClick={() => setOnlyDisputes((v) => !v)}
          className={`px-3.5 py-2 rounded-full text-[13px] font-medium border ${
            onlyDisputes ? 'bg-ink-600 text-white border-ink-600' : 'border-ink-100 text-ink-500 hover:bg-cream-100'
          }`}
        >
          Avec signalement
        </button>
      </div>

      {!shown.length && <p className="text-[13px] text-ink-300">Aucune conversation ne correspond.</p>}

      <ul className="bg-white rounded-2xl border border-ink-50 divide-y divide-ink-50 overflow-hidden">
        {shown.map((c) => {
          const open = openId === c.id;
          const msgs = thread[c.id];
          return (
            <li key={c.id}>
              <button
                onClick={() => toggle(c.id)}
                className="w-full text-start px-5 py-4 hover:bg-cream-50 flex items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink-600 truncate">
                    {c.senderName ?? '(expéditeur)'} ↔ {c.travelerName ?? '(voyageur)'}
                    {c.hasDispute && (
                      <span className="ms-2 text-[11px] font-semibold text-blush-500 bg-blush-50 rounded-full px-2 py-0.5">
                        Signalement
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-ink-400 truncate">
                    {[c.route, c.item].filter(Boolean).join(' · ') || c.bookingId}
                  </div>
                </div>
                <div className="hidden sm:block text-[13px] text-ink-400 w-28 flex-shrink-0">
                  {c.messageCount} message{c.messageCount > 1 ? 's' : ''}
                </div>
                <div className="hidden md:block text-[13px] text-ink-400 w-32 flex-shrink-0">
                  {fmt(c.lastMessageAt)}
                </div>
                <ChevronDown className={`w-4 h-4 text-ink-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-1.5 text-[12px] text-ink-300 mb-3">
                    <Eye className="w-3.5 h-3.5" /> Lecture seule · réservation {c.bookingId}
                    {c.paymentStatus && <> · paiement : {c.paymentStatus}</>}
                  </div>
                  {!msgs && <Loader2 className="w-4 h-4 animate-spin text-ink-300" />}
                  {msgs === 'error' && (
                    <p className="text-[13px] text-blush-500">Impossible de charger cette conversation.</p>
                  )}
                  {Array.isArray(msgs) && !msgs.length && (
                    <p className="text-[13px] text-ink-300">Aucun message.</p>
                  )}
                  {Array.isArray(msgs) && msgs.length > 0 && (
                    <div className="space-y-2 max-h-[480px] overflow-y-auto rounded-xl bg-cream-50 p-4">
                      {msgs.map((m) => {
                        const fromSender = m.sender_id === c.senderId;
                        const name = fromSender
                          ? `${c.senderName ?? '—'} (expéditeur)`
                          : m.sender_id === c.travelerId
                            ? `${c.travelerName ?? '—'} (voyageur)`
                            : 'Autre';
                        return (
                          <div key={m.id} className={`flex ${fromSender ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                                fromSender ? 'bg-white border border-ink-50' : 'bg-ink-600 text-white'
                              }`}
                            >
                              <div className={`text-[11px] mb-0.5 ${fromSender ? 'text-ink-300' : 'text-white/60'}`}>
                                {name} · {fmt(m.created_at)}
                              </div>
                              <div className="text-[14px] whitespace-pre-wrap break-words">{m.body}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
