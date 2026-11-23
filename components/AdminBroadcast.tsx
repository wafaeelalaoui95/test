'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Send, Mail } from 'lucide-react';

// =============================================================================
// AdminBroadcast — « Ajoutez vos prochains vols », à tous les membres
// =============================================================================
// Shows how many members would receive it and who is left out, a preview, a
// test send to the operator, then the send to everyone. See lib/broadcast.ts.

type Row = {
  id: string;
  subject: string;
  started_at: string;
  finished_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
};

type Data = {
  count: number;
  skipped: { optedOut: number; unconfirmed: number; deleted: number; noEmail: number };
  migrationReady: boolean;
  template: { subject: string; html: string; text: string };
  history: Row[];
};

const when = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(
    new Date(iso)
  );

export function AdminBroadcast() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'test' | 'all' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/broadcast');
      if (!r.ok) throw new Error(String(r.status));
      setData(await r.json());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function post(body: object) {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? String(res.status));
    return d;
  }

  async function sendTest() {
    setBusy('test');
    setNotice(null);
    setError(null);
    try {
      const d = await post({ mode: 'test' });
      setNotice(`Test envoyé à ${d.to}. Vérifiez votre boîte avant d’envoyer à tous.`);
    } catch (e: any) {
      setError(`Test refusé (${e.message})`);
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    if (!data) return;
    const n = data.count;
    if (!confirm(`Envoyer « ${data.template.subject} » à ${n} membre${n > 1 ? 's' : ''} ? Impossible à annuler.`)) return;
    setBusy('all');
    setNotice(null);
    setError(null);
    try {
      const d = await post({ mode: 'all', expectedCount: n });
      const row: Row = d.row;
      setNotice(
        `Envoyé : ${row.sent_count} e-mail${row.sent_count > 1 ? 's' : ''}` +
          (row.failed_count ? `, ${row.failed_count} en échec.` : '.')
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return <p className="text-[13px] text-blush-500 font-mono">/api/admin/broadcast: {error}</p>;
  }
  if (!data) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  const s = data.skipped;
  const last = data.history[0];

  return (
    <div className="max-w-3xl">
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">E-mail à tous : « Ajoutez vos prochains vols »</h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Rappelle à chaque membre d’enregistrer tous ses prochains vols. Part seulement quand vous cliquez,
        avec un lien de désabonnement en bas.
      </p>

      {!data.migrationReady && (
        <p className="text-[13px] text-blush-500 bg-white rounded-2xl border border-blush-200 p-4 mb-4">
          Avant d’envoyer à tous, lancez <span className="font-mono">lib/supabase/migrations/2026-11-23-email-broadcasts.sql</span>{' '}
          dans l’éditeur SQL de Supabase. Sans elle, les personnes désabonnées ne pourraient pas être exclues.
          L’e-mail de test fonctionne déjà.
        </p>
      )}

      <div className="bg-white rounded-2xl border border-ink-50 p-5 mb-4">
        <div className="text-[28px] font-extrabold text-ink-600 tracking-[-0.02em]">{data.count}</div>
        <div className="text-[13px] text-ink-400">destinataires</div>
        <div className="text-[13px] text-ink-400 mt-3">
          Exclus : {s.optedOut} désabonné{s.optedOut > 1 ? 's' : ''} · {s.unconfirmed} e-mail non confirmé ·{' '}
          {s.deleted} compte{s.deleted > 1 ? 's' : ''} supprimé{s.deleted > 1 ? 's' : ''}
          {s.noEmail ? ` · ${s.noEmail} sans e-mail` : ''}
        </div>
        <div className="text-[13px] text-ink-400 mt-1">Objet : {data.template.subject}</div>
        {last && (
          <div className="text-[13px] text-ink-400 mt-1">
            Dernier envoi : {when(last.started_at)} — {last.sent_count}/{last.recipient_count} envoyés
            {last.failed_count ? `, ${last.failed_count} en échec` : ''}
            {!last.finished_at ? ' (en cours)' : ''}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100"
          >
            {showPreview ? 'Masquer l’aperçu' : 'Aperçu'}
          </button>
          <button
            onClick={sendTest}
            disabled={busy !== null}
            className="px-4 py-2 rounded-full border border-ink-100 text-[13px] font-medium text-ink-500 hover:bg-cream-100 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            M’envoyer un test
          </button>
          <button
            onClick={sendAll}
            disabled={busy !== null || !data.migrationReady || !data.count}
            className="px-4 py-2 rounded-full bg-ink-600 text-white text-[13px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            {busy === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Envoyer à {data.count} membre{data.count > 1 ? 's' : ''}
          </button>
        </div>
        {busy === 'all' && (
          <p className="text-[13px] text-ink-400 mt-3">Envoi en cours, ne fermez pas la page…</p>
        )}
        {notice && <p className="text-[13px] text-mint-500 mt-3">{notice}</p>}
        {error && <p className="text-[13px] text-blush-500 mt-3">{error}</p>}
      </div>

      {showPreview && (
        <iframe
          title="Aperçu de l'e-mail"
          srcDoc={data.template.html}
          sandbox=""
          className="w-full h-[720px] rounded-xl border border-ink-50"
        />
      )}
    </div>
  );
}
