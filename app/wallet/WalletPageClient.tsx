'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet as WalletIcon,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import type { WalletTransaction } from '@/lib/supabase/queries';
import { formatEuros, formatShortDate, displayName, nameInitial } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';

// Props now come pre-filled from the Server Component, so no useEffect/loading
// dance on mount — the page renders fully on first paint.
export default function WalletPageClient({
  initialUser,
  initialTransactions,
}: {
  initialUser: { id: string; email: string | null };
  initialTransactions: WalletTransaction[];
}) {
  const user = initialUser;
  const { t } = useI18n();
  const [transactions] = useState<WalletTransaction[]>(initialTransactions);
  const [error] = useState<string | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Partition transactions by status. Sender→traveler bookings I made are
  // also in this list (since I appear in traveler_user_id), but for those
  // the money is going OUT, not IN. We filter to only show bookings where
  // I'm the traveler RECIPIENT, not the sender.
  const incoming = transactions.filter((t) => t.sender_id !== user.id);

  const captured = incoming.filter((t) => t.payment_status === 'captured');
  const authorized = incoming.filter((t) => t.payment_status === 'authorized');
  const failed = incoming.filter(
    (t) => t.payment_status === 'canceled' || t.payment_status === 'failed'
  );

  // Balances: traveler net = payment_amount / 1.15 (because the stored
  // amount is the TTC the sender paid; Jibly's cut is 15%).
  const sumCents = (rows: WalletTransaction[]) =>
    rows.reduce((s, r) => s + (r.payment_amount ?? 0), 0);
  const availableEuros = sumCents(captured) / 100 / 1.15;
  const pendingEuros = sumCents(authorized) / 100 / 1.15;

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
        {/* Back link */}
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.sec_back_to_space}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-2">
            {t.sec_wallet_title}
          </h1>
          <p className="text-[14px] text-ink-400 mb-8">
            {t.sec_wallet_subtitle}
          </p>

          {error && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 mb-6 text-[13px] text-blush-500 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* DISPONIBLE — hero card with the main balance */}
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.12em] uppercase mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-mint-500" />
              {t.sec_wallet_available}
            </h2>
            <div className="bg-gradient-to-br from-ink-500 to-ink-600 rounded-3xl p-7 lg:p-9 text-cream-50 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-mint-500/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-butter-500/15 blur-2xl" />

              <div className="relative">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-cream-50/60 tracking-[0.12em] uppercase mb-3">
                  <WalletIcon className="w-3.5 h-3.5" />
                  {t.sec_wallet_balance_label}
                </div>
                <div className="text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] num-display mb-1">
                  {formatEuros(availableEuros)}
                </div>
                <p className="text-[13px] text-cream-50/70">
                  {(captured.length > 1 ? t.sec_wallet_tx_count_plural : t.sec_wallet_tx_count_singular).replace('{count}', String(captured.length))}
                </p>

                <button
                  onClick={() => setShowWithdrawForm(!showWithdrawForm)}
                  disabled={availableEuros <= 0}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cream-50 text-ink-600 hover:bg-cream-100 transition-colors text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.sec_wallet_withdraw}
                </button>

                {showWithdrawForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-5 rounded-2xl bg-cream-50/10 backdrop-blur-sm border border-cream-50/20 p-5"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-butter-500/20 text-butter-200 text-[10px] font-bold tracking-wider uppercase mb-3">
                      {t.sec_wallet_coming_soon}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-cream-50/70 tracking-[0.06em] uppercase mb-1.5">
                          IBAN
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder="FR76 …"
                          className="w-full px-4 py-2.5 rounded-xl bg-cream-50/10 border border-cream-50/20 text-cream-50 placeholder:text-cream-50/40 text-[14px] num-display disabled:opacity-60 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-cream-50/70 tracking-[0.06em] uppercase mb-1.5">
                          {t.sec_wallet_account_holder}
                        </label>
                        <input
                          type="text"
                          disabled
                          placeholder={t.sec_wallet_account_holder_placeholder}
                          className="w-full px-4 py-2.5 rounded-xl bg-cream-50/10 border border-cream-50/20 text-cream-50 placeholder:text-cream-50/40 text-[14px] disabled:opacity-60 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-[12px] text-cream-50/60 leading-relaxed pt-1">
                        {t.sec_wallet_withdraw_note_before}{' '}
                        <a
                          href={`mailto:hello@jibly.io?subject=${encodeURIComponent(t.sec_wallet_withdraw_subject)}`}
                          className="underline font-semibold hover:text-cream-50 transition-colors"
                        >
                          hello@jibly.io
                        </a>{' '}
                        {t.sec_wallet_withdraw_note_after}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* EN ATTENTE */}
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.12em] uppercase mb-3">
              <Clock className="w-3.5 h-3.5 text-butter-500" />
              {t.sec_wallet_pending}
            </h2>
            {authorized.length === 0 ? (
              <div className="bg-white rounded-2xl p-5 border border-dashed border-ink-100 text-center text-[13px] text-ink-300">
                {t.sec_wallet_no_pending}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl px-5 py-4 border border-ink-50 mb-3">
                  <div className="text-[12px] text-ink-400 mb-1">{t.sec_wallet_to_receive}</div>
                  <div className="text-2xl font-extrabold text-ink-600 num-display tracking-[-0.02em]">
                    {formatEuros(pendingEuros)}
                  </div>
                </div>
                <div className="space-y-2">
                  {authorized.map((tx) => (
                    <TxRow key={tx.id} tx={tx} kind="pending" />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* HISTORIQUE — captured + failed combined */}
          {(captured.length > 0 || failed.length > 0) && (
            <section className="mb-10">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.12em] uppercase mb-3">
                {t.sec_wallet_history}
              </h2>
              <div className="space-y-2">
                {[...captured, ...failed]
                  .sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
                  .map((tx) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      kind={tx.payment_status === 'captured' ? 'captured' : 'failed'}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Empty state when there are NO transactions at all */}
          {incoming.length === 0 && !error && (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-ink-100 mt-6">
              <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                <WalletIcon className="w-6 h-6 text-ink-300" />
              </div>
              <h3 className="text-lg font-bold text-ink-600 mb-2">
                {t.sec_wallet_empty_title}
              </h3>
              <p className="text-[14px] text-ink-400 mb-6 max-w-sm mx-auto leading-relaxed">
                {t.sec_wallet_empty_body}
              </p>
              <Link
                href="/voyager"
                className="inline-flex items-center px-5 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
              >
                {t.sec_wallet_publish_trip}
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One transaction row in the wallet list. We deliberately keep these dense
// since the wallet page can have many rows. One line, sender + route + net
// amount + date + status icon on the right.
// ---------------------------------------------------------------------------
function TxRow({
  tx,
  kind,
}: {
  tx: WalletTransaction;
  kind: 'captured' | 'pending' | 'failed';
}) {
  const { t, locale } = useI18n();
  const senderName = displayName(tx.sender_profile?.full_name) || t.sec_wallet_sender_fallback;
  const initial = nameInitial(tx.sender_profile?.full_name);
  const netCents = tx.payment_amount ?? 0;
  const netEuros = netCents / 100 / 1.15;

  const statusStyle =
    kind === 'captured'
      ? { color: 'text-mint-600', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: t.sec_wallet_status_captured }
      : kind === 'pending'
        ? { color: 'text-butter-500', icon: <Clock className="w-3.5 h-3.5" />, label: t.sec_wallet_status_pending }
        : { color: 'text-ink-300', icon: <XCircle className="w-3.5 h-3.5" />, label: t.sec_wallet_status_cancelled };

  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[12px] text-ink-500">
          {initial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{senderName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">{cityDisplayName(tx.pickup_city, locale)} → {cityDisplayName(tx.destination_city, locale)}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-400 text-[12px] num-display">{formatShortDate(tx.created_at)}</span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${statusStyle.color}`}>
            {statusStyle.icon}
            <span>{statusStyle.label}</span>
          </span>
          <span className={`font-bold num-display text-[14px] ${kind === 'captured' ? 'text-mint-600' : kind === 'pending' ? 'text-ink-500' : 'text-ink-300 line-through'}`}>
            {formatEuros(netEuros)}
          </span>
        </div>
      </div>
    </div>
  );
}
