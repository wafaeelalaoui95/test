'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

// =============================================================================
// AdminMatchAlerts — "un voyageur sur votre trajet", à valider avant envoi
// =============================================================================
// Each row is a published trip paired with a waiting parcel request. Nothing
// has been emailed. "Envoyer" sends exactly the email shown in the preview;
// "Ignorer" drops it for good. See lib/match-alerts.ts.

type Alert = {
  id: string;
  tier: 'exact' | 'nearby';
  daysLate: number;
  createdAt: string;
  toEmail: string | null;
  stale: boolean;
  trip: string;
  request: string;
  template: { subject: string; html: string; text: string };
};

export function AdminMatchAlerts() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/match-alerts');
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setAlerts(d.alerts ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, action: 'send' | 'dismiss') {
    setBusyId(id);
    try {
      const r = await fetch('/api/admin/match-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: id, action }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? String(r.status));
      }
      await load();
    } catch (e: any) {
      setError(`action refusée (${e.message})`);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !alerts) {
    return <p className="text-[13px] text-blush-500 font-mono">/api/admin/match-alerts: {error}</p>;
  }
  if (!alerts) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">
        Alertes trajet à valider ({alerts.length})
      </h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Les alertes « Même trajet » partent toutes seules. Ici restent les
        « Ville proche » (rien n&apos;est parti : relisez l&apos;e-mail, puis envoyez
        ou ignorez), et les « Même trajet » qui n&apos;ont pas pu partir, par
        exemple parce que le trajet a été annulé.
      </p>
      {error && <p className="text-[13px] text-blush-500 mb-3">{error}</p>}
      {!alerts.length && <p className="text-[13px] text-ink-300">Aucune alerte en attente.</p>}
      <ul className="space-y-3">
        {alerts.map((a) => (
          <li key={a.id} className="bg-white rounded-2xl border border-ink-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">
                  {a.tier === 'exact' ? 'Même trajet' : 'Ville proche'}
                  {a.daysLate > 0 && (
                    <span className="ml-2 text-butter-600">· {a.daysLate} j après sa date</span>
                  )}
                  {a.stale && <span className="ml-2 text-blush-500">· plus d&apos;actualité</span>}
                </div>
                <div className="text-[14px] text-ink-600">
                  <span className="font-semibold">Trajet :</span> {a.trip}
                </div>
                <div className="text-[14px] text-ink-500">
                  <span className="font-semibold">Demande :</span> {a.request}
                </div>
                <div className="text-[13px] text-ink-400 mt-1">À : {a.toEmail ?? '— pas d’e-mail'}</div>
                <div className="text-[13px] text-ink-400">Objet : {a.template.subject}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100"
                >
                  {openId === a.id ? 'Masquer' : 'Aperçu'}
                </button>
                <button
                  disabled={busyId === a.id}
                  onClick={() => decide(a.id, 'dismiss')}
                  className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100 inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Ignorer
                </button>
                <button
                  disabled={busyId === a.id || a.stale || !a.toEmail}
                  onClick={() => {
                    if (confirm(`Envoyer cet e-mail à ${a.toEmail} ?`)) decide(a.id, 'send');
                  }}
                  className="px-4 py-2 rounded-full bg-ink-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {busyId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer
                </button>
              </div>
            </div>
            {openId === a.id && (
              <iframe
                title="Aperçu de l'e-mail"
                srcDoc={a.template.html}
                sandbox=""
                className="mt-4 w-full h-[720px] rounded-xl border border-ink-50"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
