'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Flag, AlertTriangle, Check } from 'lucide-react';
import { formatEuros, formatShortDate } from '@/lib/utils';

// =============================================================================
// AdminDisputes — the queue that lets held money move again
// =============================================================================
// A payout is refused while a dispute on the booking is unsettled
// (lib/stripe/payout.ts). That is what the Marketplace Terms promise, and it is
// only safe to promise because this screen exists: without somewhere to end an
// argument, the first person to report a problem would freeze that booking's
// money for good.
//
// So the important thing here is not the list. It is the four buttons.

type AdminDispute = {
  id: string;
  bookingId: string;
  category: string;
  description: string | null;
  status: string;
  settled: boolean;
  createdAt: string;
  adminNotes: string | null;
  photos: string[];
  reporter: string | null;
  reported: string | null;
  booking: {
    route: string;
    itemLabel: string | null;
    euros: number;
    paymentStatus: string;
    paidOut: boolean;
    delivered: boolean;
    hasProof: boolean;
  } | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  not_delivered: 'Colis non livré',
  damaged: 'Colis abîmé',
  wrong_item: 'Mauvais objet',
  late_delivery: 'Très en retard',
  other: 'Autre problème',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  investigating: 'En cours d’examen',
  resolved_for_reporter: 'Tranché pour le signaleur',
  resolved_for_reported: 'Tranché pour l’autre partie',
  closed: 'Clos sans suite',
};

export function AdminDisputes() {
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/disputes');
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setDisputes(d.disputes ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, status: string) {
    setBusyId(id);
    try {
      const r = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeId: id, status, note: notes[id]?.trim() || undefined }),
      });
      if (!r.ok) throw new Error(String(r.status));
      // Re-read rather than patching in place: settling one dispute can free a
      // payout on the booking, and the list is where that becomes visible.
      await load();
    } catch (e: any) {
      setError(`décision refusée (${e.message})`);
    } finally {
      setBusyId(null);
    }
  }

  if (error && !disputes) {
    return (
      <p className="text-[13px] text-blush-500 font-mono">/api/admin/disputes: {error}</p>
    );
  }
  if (!disputes) {
    return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;
  }

  const live = disputes.filter((d) => !d.settled);
  const settled = disputes.filter((d) => d.settled);

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">
        Signalements ({live.length} en cours)
      </h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Tant qu&apos;un signalement n&apos;est pas tranché, le versement au
        voyageur est bloqué sur cette réservation. Trancher débloque le
        versement ; ça ne rembourse personne — pour ça, utilise l&apos;outil de
        remboursement plus bas.
      </p>

      {error && (
        <p className="text-[12px] text-blush-500 mb-3 font-mono">{error}</p>
      )}

      {live.length === 0 ? (
        <p className="text-[13px] text-ink-400">Aucun signalement en cours.</p>
      ) : (
        <div className="space-y-3">
          {live.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-2xl border border-blush-200 overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-2 text-[13px] mb-1.5 flex-wrap">
                  <Flag className="w-3.5 h-3.5 text-blush-500" strokeWidth={1.75} />
                  <span className="font-semibold text-ink-600">
                    {CATEGORY_LABELS[d.category] ?? d.category}
                  </span>
                  <span className="text-ink-400">
                    {d.reporter ?? '?'} <span className="text-ink-300">signale</span>{' '}
                    {d.reported ?? '?'}
                  </span>
                  <span className="ms-auto text-[12px] text-ink-300">
                    {formatShortDate(d.createdAt)}
                  </span>
                </div>

                {d.booking && (
                  <div className="flex items-center gap-2 text-[12px] text-ink-400 flex-wrap mb-2">
                    <span className="truncate">{d.booking.route}</span>
                    <span className="font-bold text-ink-600 num-display">
                      {formatEuros(d.booking.euros)}
                    </span>
                    {d.booking.paidOut ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-50 text-ink-400">
                        déjà versé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-butter-50 text-butter-600 font-semibold">
                        versement bloqué
                      </span>
                    )}
                    {d.booking.delivered && (
                      <span className="text-ink-300">livraison confirmée</span>
                    )}
                    {d.booking.hasProof && <span className="text-ink-300">preuve déposée</span>}
                  </div>
                )}

                {d.description && (
                  <p className="text-[13px] text-ink-500 leading-relaxed whitespace-pre-line">
                    {d.description}
                  </p>
                )}

                {d.photos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {d.photos.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[12px] text-lavender-600 underline"
                      >
                        photo
                      </a>
                    ))}
                  </div>
                )}

                {d.status === 'investigating' && (
                  <p className="mt-2 text-[12px] text-ink-400">
                    Marqué en cours d&apos;examen — le versement reste bloqué.
                  </p>
                )}
              </div>

              <div className="px-5 py-3 bg-cream-100 border-t border-blush-200/60">
                <textarea
                  value={notes[d.id] ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [d.id]: e.target.value }))}
                  placeholder="Note interne : ce que tu as vérifié, et pourquoi tu tranches comme ça."
                  rows={2}
                  className="w-full text-[13px] rounded-xl border border-ink-100 px-3 py-2 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-lavender-500/30"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, 'investigating')}
                    className="px-3 py-1.5 rounded-full bg-white border border-ink-100 text-ink-500 text-[12px] font-semibold hover:bg-ink-50 disabled:opacity-50"
                  >
                    En cours d&apos;examen
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, 'resolved_for_reporter')}
                    className="px-3 py-1.5 rounded-full bg-ink-500 text-cream-50 text-[12px] font-semibold hover:bg-ink-600 disabled:opacity-50"
                  >
                    Raison au signaleur
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, 'resolved_for_reported')}
                    className="px-3 py-1.5 rounded-full bg-mint-500 text-cream-50 text-[12px] font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    Raison à l&apos;autre partie
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => decide(d.id, 'closed')}
                    className="px-3 py-1.5 rounded-full bg-white border border-ink-100 text-ink-400 text-[12px] font-semibold hover:bg-ink-50 disabled:opacity-50"
                  >
                    Clore sans suite
                  </button>
                  {busyId === d.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-ink-300 self-center" />
                  )}
                </div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  <AlertTriangle className="w-3 h-3 inline -mt-0.5 me-1 text-butter-600" />
                  Trancher en faveur du signaleur ne rembourse pas
                  l&apos;expéditeur : le versement au voyageur est débloqué dans
                  tous les cas. Si l&apos;argent doit repartir, fais-le avec
                  l&apos;outil de remboursement.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {settled.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-ink-50 overflow-hidden">
          {settled.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-ink-50 last:border-0 text-[13px]"
            >
              <Check className="w-3.5 h-3.5 text-mint-500 flex-shrink-0" />
              <span className="text-ink-500 truncate">
                {CATEGORY_LABELS[d.category] ?? d.category} · {d.reporter ?? '?'} →{' '}
                {d.reported ?? '?'}
              </span>
              <span className="ms-auto text-[12px] text-ink-300 flex-shrink-0">
                {STATUS_LABELS[d.status] ?? d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
