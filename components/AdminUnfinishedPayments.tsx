'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

// =============================================================================
// AdminUnfinishedPayments — « Votre réservation n'a pas été finalisée »
// =============================================================================
// People who started paying for a booking (last 30 days) and stopped. One
// email per person, sent by hand, never twice. See lib/unfinished-payments.ts.

type Item = {
  userId: string;
  name: string | null;
  email: string | null;
  verified: boolean;
  optedOut: boolean;
  attempts: number;
  lastAttemptAt: string;
  amountCents: number;
  lastError: string | null;
  route: string | null;
  travelerName: string | null;
  tripStillOpen: boolean;
  followupSentAt: string | null;
  template: { subject: string; html: string; text: string };
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(new Date(iso));

export function AdminUnfinishedPayments() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/unfinished-payments');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? String(r.status));
      setItems(d.items ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function send(it: Item) {
    if (!confirm(`Envoyer cet e-mail à ${it.email} ?`)) return;
    setBusyId(it.userId);
    try {
      const res = await fetch('/api/admin/unfinished-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: it.userId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? String(res.status));
      }
      setSentTo(it.email);
      await load();
    } catch (e: any) {
      setError(`envoi refusé (${e.message})`);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !items) {
    return <p className="text-[13px] text-blush-500">Impossible de charger la liste ({error}).</p>;
  }
  if (!items) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  const todo = items.filter((i) => !i.followupSentAt);
  const done = items.filter((i) => i.followupSentAt);

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">Paiements non finalisés ({todo.length})</h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Ces personnes ont commencé à payer une réservation ces 30 derniers jours sans aller au bout (lu
        directement dans Stripe). Rien ne leur a été débité. Un seul e-mail par personne, jamais deux
        fois. Les questions arrivent sur contact@jibly.io.
      </p>
      {sentTo && <p className="text-[13px] text-mint-500 mb-3">E-mail envoyé à {sentTo}.</p>}
      {error && <p className="text-[13px] text-blush-500 mb-3">{error}</p>}
      {!todo.length && <p className="text-[13px] text-ink-300">Personne à relancer.</p>}
      <ul className="space-y-3">
        {todo.map((it) => (
          <li key={it.userId} className="bg-white rounded-2xl border border-ink-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] text-ink-600 font-semibold">
                  {it.name ?? 'Sans nom'}
                  {it.verified && <span className="ml-2 text-[11px] font-medium text-mint-500">identité vérifiée</span>}
                  {it.optedOut && <span className="ml-2 text-[11px] font-medium text-blush-500">désabonné des e-mails</span>}
                </div>
                <div className="text-[13px] text-ink-400">
                  {it.route ?? 'Trajet inconnu'}
                  {it.travelerName ? ` · avec ${it.travelerName}` : ''} · {(it.amountCents / 100).toFixed(2).replace('.', ',')} €
                  {!it.tripStillOpen && ' · trajet plus disponible'}
                </div>
                <div className="text-[13px] text-ink-400">
                  {it.attempts} tentative{it.attempts > 1 ? 's' : ''}, dernière le {fmtDate(it.lastAttemptAt)}
                </div>
                {it.lastError && <div className="text-[13px] text-blush-500">Stripe : {it.lastError}</div>}
                <div className="text-[13px] text-ink-400 mt-1">À : {it.email ?? '— pas d’e-mail'}</div>
                <div className="text-[13px] text-ink-400">Objet : {it.template.subject}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setOpenId(openId === it.userId ? null : it.userId)}
                  className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100"
                >
                  {openId === it.userId ? 'Masquer' : 'Aperçu'}
                </button>
                <button
                  disabled={busyId === it.userId || !it.email}
                  onClick={() => send(it)}
                  className="px-4 py-2 rounded-full bg-ink-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {busyId === it.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer
                </button>
              </div>
            </div>
            {openId === it.userId && (
              <iframe
                title="Aperçu de l'e-mail"
                srcDoc={it.template.html}
                sandbox=""
                className="mt-4 w-full h-[640px] rounded-xl border border-ink-50"
              />
            )}
          </li>
        ))}
      </ul>
      {done.length > 0 && (
        <>
          <h4 className="text-[13px] font-semibold text-ink-500 mt-6 mb-2">Déjà relancés ({done.length})</h4>
          <ul className="space-y-1">
            {done.map((it) => (
              <li key={it.userId} className="text-[13px] text-ink-400">
                {it.name ?? it.email} · {it.route ?? 'trajet inconnu'} · envoyé le {fmtDate(it.followupSentAt!)}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
