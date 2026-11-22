'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

// =============================================================================
// AdminOfferReminders — « Un voyageur attend votre réponse », à envoyer
// =============================================================================
// Senders whose date is today and who still have an unanswered offer. The noon
// cron sends these on its own; this lets the operator send one by hand first.
// See lib/offer-reminders.ts.

type Reminder = {
  requestId: string;
  toEmail: string | null;
  route: string;
  requestDate: string;
  offerCount: number;
  template: { subject: string; html: string; text: string };
};

export function AdminOfferReminders() {
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/offer-reminders');
      if (!r.ok) throw new Error(String(r.status));
      setItems((await r.json()).reminders ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(r: Reminder) {
    if (!confirm(`Envoyer cet e-mail à ${r.toEmail} ?`)) return;
    setBusyId(r.requestId);
    try {
      const res = await fetch('/api/admin/offer-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: r.requestId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? String(res.status));
      }
      setSentTo(r.toEmail);
      await load();
    } catch (e: any) {
      setError(`envoi refusé (${e.message})`);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !items) {
    return <p className="text-[13px] text-blush-500 font-mono">/api/admin/offer-reminders: {error}</p>;
  }
  if (!items) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">
        Offres sans réponse — date limite aujourd’hui ({items.length})
      </h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Ces expéditeurs ont une offre de voyageur en attente et leur date limite est aujourd’hui.
        L’e-mail part tout seul à 12 h (heure de Paris) ; vous pouvez l’envoyer avant. Un seul
        e-mail par demande, jamais deux fois.
      </p>
      {sentTo && <p className="text-[13px] text-mint-500 mb-3">E-mail envoyé à {sentTo}.</p>}
      {error && <p className="text-[13px] text-blush-500 mb-3">{error}</p>}
      {!items.length && <p className="text-[13px] text-ink-300">Rien à envoyer aujourd’hui.</p>}
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.requestId} className="bg-white rounded-2xl border border-ink-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] text-ink-600 font-semibold">{r.route}</div>
                <div className="text-[13px] text-ink-400">
                  {r.offerCount} offre{r.offerCount > 1 ? 's' : ''} sans réponse
                </div>
                <div className="text-[13px] text-ink-400 mt-1">À : {r.toEmail ?? '— pas d’e-mail'}</div>
                <div className="text-[13px] text-ink-400">Objet : {r.template.subject}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setOpenId(openId === r.requestId ? null : r.requestId)}
                  className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100"
                >
                  {openId === r.requestId ? 'Masquer' : 'Aperçu'}
                </button>
                <button
                  disabled={busyId === r.requestId || !r.toEmail}
                  onClick={() => send(r)}
                  className="px-4 py-2 rounded-full bg-ink-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {busyId === r.requestId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer
                </button>
              </div>
            </div>
            {openId === r.requestId && (
              <iframe
                title="Aperçu de l'e-mail"
                srcDoc={r.template.html}
                sandbox=""
                className="mt-4 w-full h-[640px] rounded-xl border border-ink-50"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
