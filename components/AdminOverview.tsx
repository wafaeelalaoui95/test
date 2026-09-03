'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Clock, Star } from 'lucide-react';
import { formatEuros, formatShortDate } from '@/lib/utils';

// =============================================================================
// AdminOverview — what an operator can't see anywhere else
// =============================================================================
// Two blind spots, both of which only matter once there are real users:
//
//   1. Money Jibly is holding that isn't Jibly's. A traveler sees what they're
//      owed in their own wallet; nobody sees the total. The dangerous half is
//      "stuck": delivered parcels whose traveler never finished payout setup,
//      so the transfer was skipped and the money sits on the platform balance.
//      It grows quietly, and every row is a person waiting.
//
//   2. Reviews. Users write them about each other and there was nowhere to
//      read them, which makes moderation impossible and a dispute one-sided.

type Overview = {
  owed: {
    stuckEuros: number;
    stuckCount: number;
    heldEuros: number;
    heldCount: number;
    stuck: Array<{
      id: string;
      route: string;
      euros: number;
      travelerName: string | null;
      deliveredAt: string | null;
    }>;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    reviewer: string | null;
    reviewed: string | null;
  }>;
};

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/overview')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-[13px] text-blush-500 font-mono">
        /api/admin/overview: {error}
      </p>
    );
  }
  if (!data) {
    return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;
  }

  const { owed, reviews } = data;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ---- Money owed ---- */}
      <div>
        <h3 className="text-[15px] font-semibold text-ink-600 mb-1">
          Argent que Jibly détient
        </h3>
        <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
          Encaissé auprès d&apos;expéditeurs et pas encore versé. Il est sur le
          solde Stripe de Jibly, et il ne t&apos;appartient pas.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-ink-50 p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.08em] uppercase mb-2">
              <Clock className="w-3.5 h-3.5 text-butter-500" />
              En cours de livraison
            </div>
            <div className="text-2xl font-extrabold text-ink-600 num-display">
              {formatEuros(owed.heldEuros)}
            </div>
            <p className="text-[12px] text-ink-400 mt-1">
              {owed.heldCount} colis. Normal : rien ne doit partir avant la
              livraison.
            </p>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              owed.stuckCount > 0
                ? 'bg-blush-50 border-blush-200'
                : 'bg-white border-ink-50'
            }`}
          >
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.08em] uppercase mb-2">
              <AlertTriangle
                className={`w-3.5 h-3.5 ${owed.stuckCount > 0 ? 'text-blush-500' : 'text-ink-300'}`}
              />
              Livré, pas versé
            </div>
            <div className="text-2xl font-extrabold text-ink-600 num-display">
              {formatEuros(owed.stuckEuros)}
            </div>
            <p className="text-[12px] text-ink-400 mt-1">
              {owed.stuckCount === 0
                ? 'Rien en attente.'
                : `${owed.stuckCount} voyageur(s) attendent leur argent.`}
            </p>
          </div>
        </div>

        {owed.stuck.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-ink-50 overflow-hidden">
            {owed.stuck.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-5 py-3 border-b border-ink-50 last:border-0 text-[13px]"
              >
                <span className="font-semibold text-ink-600">
                  {b.travelerName ?? 'Voyageur inconnu'}
                </span>
                <span className="text-ink-400 truncate">{b.route}</span>
                {b.deliveredAt && (
                  <span className="text-ink-300 text-[12px]">
                    livré le {formatShortDate(b.deliveredAt)}
                  </span>
                )}
                <span className="ms-auto font-bold text-ink-600 num-display">
                  {formatEuros(b.euros)}
                </span>
              </div>
            ))}
            <p className="px-5 py-3 text-[12px] text-ink-400 leading-relaxed bg-cream-100">
              Presque toujours un voyageur qui n&apos;a pas terminé la
              configuration de ses paiements. Rien à faire de ton côté : dès
              qu&apos;il ajoute son IBAN, le webhook rattrape tous ses versements
              en attente. Relance-le si ça dure.
            </p>
          </div>
        )}
      </div>

      {/* ---- Reviews ---- */}
      <div>
        <h3 className="text-[15px] font-semibold text-ink-600 mb-1">
          Avis ({reviews.length})
        </h3>
        <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
          Écrits par tes utilisateurs les uns sur les autres. Les 100 plus
          récents.
        </p>

        {reviews.length === 0 ? (
          <p className="text-[13px] text-ink-400">Aucun avis pour le moment.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
            {reviews.map((r) => (
              <div key={r.id} className="px-5 py-4 border-b border-ink-50 last:border-0">
                <div className="flex items-center gap-2 text-[13px] mb-1">
                  <span className="inline-flex items-center gap-0.5 font-bold text-ink-600 num-display">
                    <Star className="w-3.5 h-3.5 fill-butter-500 text-butter-500" />
                    {r.rating}
                  </span>
                  <span className="text-ink-500">
                    {r.reviewer ?? '?'} <span className="text-ink-300">→</span>{' '}
                    {r.reviewed ?? '?'}
                  </span>
                  <span className="ms-auto text-[12px] text-ink-300">
                    {formatShortDate(r.createdAt)}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-[13px] text-ink-500 leading-relaxed">
                    {r.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
