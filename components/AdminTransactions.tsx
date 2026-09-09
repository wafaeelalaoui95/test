'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { formatEuros, formatShortDate } from '@/lib/utils';

// =============================================================================
// AdminTransactions — the ledger
// =============================================================================
// Every booking that involved money, on one screen: who paid, who was paid,
// what Stripe took, what is left.
//
// The gap this fills: AdminOverview shows only what is UNPAID, so a payout
// that worked left no trace anywhere an operator could look — and Stripe's own
// Connect → Transfers list has the payouts but not the people, because a
// connected account id is not a name and the PaymentIntent never carries a
// traveler. Reconciling the two meant running a SQL file by hand.
//
// The most important column is the last one. A row that is not 'Versé' is
// money Jibly is holding for somebody, and the state says who to chase.

type Row = {
  id: string;
  createdAt: string;
  route: string | null;
  sender: string | null;
  traveler: string | null;
  paidCents: number;
  stripeFeeCents: number | null;
  jiblyFeeCents: number | null;
  netCents: number | null;
  travelerCents: number | null;
  transferId: string | null;
  archived: boolean;
  state: string;
  travelerHasAccount: boolean;
};

type Payload = {
  transactions: Row[];
  truncated: boolean;
  totals: {
    count: number;
    paidCents: number;
    stripeFeeCents: number;
    jiblyFeeCents: number;
    netCents: number;
    travelerPaidCents: number;
    owedCents: number;
  };
};

// Wording an operator can act on, rather than the enum. 'attend' names the
// person who has to do something next.
const STATE: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'mute' }> = {
  paid_out: { label: 'Versé', tone: 'good' },
  in_transit: { label: 'En transit', tone: 'mute' },
  transfer_pending: { label: 'Virement en attente', tone: 'warn' },
  waiting_payout_setup: { label: 'Attend sa config. de paiement', tone: 'bad' },
  no_traveler: { label: 'Aucun voyageur', tone: 'bad' },
  authorized: { label: 'Autorisé, non encaissé', tone: 'mute' },
  refunded: { label: 'Remboursé', tone: 'mute' },
  canceled: { label: 'Annulé', tone: 'mute' },
};

const TONE = {
  good: 'bg-mint-50 text-mint-600',
  warn: 'bg-butter-50 text-ink-600',
  bad: 'bg-blush-50 text-blush-600',
  mute: 'bg-ink-50 text-ink-400',
};

const euros = (cents: number | null) =>
  cents == null ? '—' : formatEuros(cents / 100);

export function AdminTransactions() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Off by default: the whole point is to see everything, including what went
  // through correctly. On, it becomes the chase list.
  const [onlyOpen, setOnlyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/transactions')
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
        /api/admin/transactions: {error}
      </p>
    );
  }
  if (!data) {
    return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;
  }

  const { totals } = data;
  const rows = onlyOpen
    ? data.transactions.filter((t) => !t.transferId && t.state !== 'refunded' && t.state !== 'canceled')
    : data.transactions;

  // Exported from what is on screen, filter included — a CSV that disagrees
  // with the table it came from is worse than no CSV.
  const downloadCsv = () => {
    const headers = [
      'Date', 'Expéditeur', 'Voyageur', 'Trajet', 'Payé €', 'Stripe €',
      'Commission €', 'Net Jibly €', 'Voyageur €', 'État', 'Booking',
    ];
    const cents = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2));
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map((r) =>
        [
          (r.createdAt ?? '').slice(0, 10),
          r.sender ?? '',
          r.traveler ?? '',
          r.route ?? '',
          cents(r.paidCents),
          cents(r.stripeFeeCents),
          cents(r.jiblyFeeCents),
          cents(r.netCents),
          cents(r.travelerCents),
          STATE[r.state]?.label ?? r.state,
          r.id,
        ].map((v) => escape(String(v))).join(',')
      ),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `jibly-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ---- Totals ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Encaissé', value: totals.paidCents, hint: `${totals.count} paiement(s)` },
          { label: 'Frais Stripe', value: totals.stripeFeeCents, hint: 'prélevés par Stripe' },
          { label: 'Commission', value: totals.jiblyFeeCents, hint: 'brut Jibly' },
          { label: 'Net Jibly', value: totals.netCents, hint: 'commission − Stripe', strong: true },
          { label: 'Versé aux voyageurs', value: totals.travelerPaidCents, hint: 'parti du solde' },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border p-4 ${
              k.strong ? 'bg-mint-50 border-mint-200' : 'bg-white border-ink-50'
            }`}
          >
            <div className="text-[11px] font-semibold text-ink-400 tracking-[0.08em] uppercase mb-1.5">
              {k.label}
            </div>
            <div className="text-xl font-extrabold text-ink-600 num-display">
              {euros(k.value)}
            </div>
            <p className="text-[11px] text-ink-300 mt-0.5">{k.hint}</p>
          </div>
        ))}
      </div>

      {totals.owedCents > 0 && (
        <p className="text-[13px] text-blush-600">
          <strong>{euros(totals.owedCents)}</strong> livré et pas encore versé —
          de l&apos;argent détenu pour quelqu&apos;un, pas une marge.
        </p>
      )}

      {/* ---- Controls ---- */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-ink-500 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
            className="accent-ink-500"
          />
          Seulement ce qui n&apos;est pas versé
        </label>
        <button
          onClick={downloadCsv}
          className="flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
        <span className="text-[12px] text-ink-300 ml-auto">
          {rows.length} ligne(s)
        </span>
      </div>

      {/* ---- Table ---- */}
      <div className="bg-white rounded-2xl border border-ink-50 overflow-x-auto">
        <table className="w-full text-[13px] min-w-[900px]">
          <thead>
            <tr className="text-[11px] font-semibold text-ink-400 tracking-[0.08em] uppercase border-b border-ink-50">
              <th className="text-left font-semibold px-4 py-3">Date</th>
              <th className="text-left font-semibold px-4 py-3">Expéditeur</th>
              <th className="text-left font-semibold px-4 py-3">Voyageur</th>
              <th className="text-right font-semibold px-4 py-3">Payé</th>
              <th className="text-right font-semibold px-4 py-3">Stripe</th>
              <th className="text-right font-semibold px-4 py-3">Commission</th>
              <th className="text-right font-semibold px-4 py-3">Net</th>
              <th className="text-right font-semibold px-4 py-3">Voyageur</th>
              <th className="text-left font-semibold px-4 py-3">État</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const state = STATE[r.state] ?? { label: r.state, tone: 'mute' as const };
              return (
                <tr key={r.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 text-ink-400 whitespace-nowrap">
                    {formatShortDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{r.sender ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {r.traveler ?? '—'}
                    {r.route && (
                      <div className="text-[11px] text-ink-300">{r.route}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right num-display text-ink-600">
                    {euros(r.paidCents)}
                  </td>
                  <td className="px-4 py-3 text-right num-display text-ink-400">
                    {euros(r.stripeFeeCents)}
                  </td>
                  <td className="px-4 py-3 text-right num-display text-ink-600">
                    {euros(r.jiblyFeeCents)}
                  </td>
                  <td className="px-4 py-3 text-right num-display font-semibold text-ink-600">
                    {euros(r.netCents)}
                  </td>
                  <td className="px-4 py-3 text-right num-display text-ink-400">
                    {euros(r.travelerCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${TONE[state.tone]}`}
                    >
                      {state.label}
                    </span>
                    {/* The next action, for the state where there is one. */}
                    {r.state === 'waiting_payout_setup' && (
                      <div className="text-[11px] text-ink-300 mt-0.5">
                        {r.travelerHasAccount
                          ? 'compte créé, non finalisé'
                          : 'jamais commencé'}
                      </div>
                    )}
                    {r.archived && (
                      <div className="text-[11px] text-ink-300 mt-0.5">archivé</div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-[13px] text-ink-300">
                  Rien à afficher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-ink-300 leading-relaxed">
        Les frais Stripe viennent de Stripe, le reste de la base. « Net » =
        commission − frais Stripe ; il n&apos;inclut pas les frais de virement
        hors zone SEPA (Maroc) — <code>scripts/reconcile.mjs</code> les compte.
        {data.truncated && ' Seules les 200 dernières transactions sont affichées.'}
      </p>
    </div>
  );
}
