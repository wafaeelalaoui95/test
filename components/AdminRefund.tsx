'use client';

import { useState } from 'react';
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react';

// =============================================================================
// AdminRefund — return a captured booking's money, from Jibly rather than Stripe
// =============================================================================
// The Stripe dashboard can refund a payment, but it does only that. It does NOT
// reverse the traveler's transfer, and it does NOT update refunded_amount — so
// a dashboard refund quietly comes out of the Jibly balance while the booking's
// record diverges from what actually happened. This calls the route that does
// all three.
//
// Deliberately plain. It runs a live, irreversible money movement, so it asks
// out loud before doing it and shows exactly what happened afterwards, rather
// than a green tick.
export function AdminRefund() {
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // pi_... is what the Stripe dashboard shows; a UUID is what Supabase shows.
  const trimmed = id.trim();
  const isPi = trimmed.startsWith('pi_');
  const looksValid =
    isPi ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed
    );

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const cents = amount.trim()
        ? Math.round(parseFloat(amount.replace(',', '.')) * 100)
        : undefined;
      if (cents !== undefined && (!Number.isFinite(cents) || cents <= 0)) {
        throw new Error('Montant invalide');
      }

      const res = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isPi ? { paymentIntentId: trimmed } : { bookingIntentId: trimmed }),
          ...(cents !== undefined ? { amountCents: cents } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.code ?? data?.error ?? 'Échec du remboursement');
      }
      if (data.alreadyRefunded) {
        setResult('Déjà entièrement remboursé. Rien à faire.');
      } else {
        setResult(
          `Remboursé ${(data.refundedCents / 100).toFixed(2)} € ` +
            `(total ${(data.totalRefundedCents / 100).toFixed(2)} €). ` +
            (data.reversalId
              ? `Transfert du voyageur repris : ${data.reversalId}.`
              : `Aucun transfert à reprendre : le voyageur n'avait pas encore été payé.`)
        );
        setId('');
        setAmount('');
        setReason('');
      }
    } catch (e: any) {
      setError(e.message ?? 'Échec du remboursement');
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-ink-50 p-6 max-w-xl">
      <div className="flex items-center gap-2.5 mb-1">
        <RotateCcw className="w-4 h-4 text-ink-400" strokeWidth={1.75} />
        <h3 className="text-[15px] font-semibold text-ink-600">
          Rembourser une réservation
        </h3>
      </div>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-5">
        Reprend la part du voyageur si elle a déjà été versée, puis rembourse
        l&apos;expéditeur. À utiliser plutôt que le dashboard Stripe, qui ne
        fait que la seconde moitié.
      </p>

      <label className="block mb-3">
        <span className="block text-[13px] font-medium text-ink-600 mb-1.5">
          Réservation
        </span>
        <input
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setConfirming(false);
          }}
          placeholder="pi_… ou l'identifiant de la réservation"
          className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-[14px] text-ink-600 font-mono"
        />
        <span className="block mt-1.5 text-[12px] text-ink-400">
          Le <code>pi_…</code> se trouve sur le paiement dans Stripe.
        </span>
      </label>

      <label className="block mb-3">
        <span className="block text-[13px] font-medium text-ink-600 mb-1.5">
          Montant en euros{' '}
          <span className="font-normal text-ink-400">
            (vide pour rembourser tout)
          </span>
        </span>
        <input
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setConfirming(false);
          }}
          inputMode="decimal"
          placeholder="5,00"
          className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-[14px] text-ink-600"
        />
      </label>

      <label className="block mb-5">
        <span className="block text-[13px] font-medium text-ink-600 mb-1.5">
          Motif
        </span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Colis non livré"
          className="w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-[14px] text-ink-600"
        />
        <span className="block mt-1.5 text-[12px] text-ink-400">
          Enregistré sur le remboursement Stripe. C&apos;est la seule trace de
          la raison, alors écris-la pour ton toi de dans six mois.
        </span>
      </label>

      {confirming ? (
        <div className="rounded-xl bg-cream-100 border border-ink-50 p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle
              className="w-4 h-4 text-ink-500 mt-0.5 shrink-0"
              strokeWidth={1.75}
            />
            <p className="text-[13px] text-ink-600 leading-relaxed">
              {amount.trim()
                ? `Rembourser ${amount} € sur cette réservation ?`
                : 'Rembourser la totalité de cette réservation ?'}{' '}
              L&apos;argent part immédiatement et ne peut pas être rappelé.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className="rounded-xl bg-ink-900 text-white px-4 py-2 text-[13px] font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Oui, rembourser
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-xl border border-ink-100 px-4 py-2 text-[13px] text-ink-600"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          disabled={!looksValid}
          className="rounded-xl bg-ink-900 text-white px-4 py-2.5 text-[13px] font-medium disabled:opacity-40"
        >
          Rembourser
        </button>
      )}

      {result && (
        <p className="mt-4 text-[13px] text-ink-600 leading-relaxed">{result}</p>
      )}
      {error && (
        <p className="mt-4 text-[13px] text-blush-500 font-mono">{error}</p>
      )}
    </div>
  );
}
