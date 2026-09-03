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
import { formatEuros, formatShortDate, displayName, nameInitial, travelerNetFromTotal } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';

// Copy for the parts this page rewrote. Kept local rather than added to
// translations.ts because the old keys described a withdrawable balance that
// no longer exists, and inventing replacements for them there would leave the
// obsolete ones sitting alongside. Fold in when the wording has settled.
const COPY = {
  fr: {
    heroTitle: 'Tes gains',
    earnedLabel: 'Versés',
    heldLabel: 'En attente',
  },
  en: {
    heroTitle: 'Your earnings',
    earnedLabel: 'Paid out',
    heldLabel: 'Pending',
  },
} as const;

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
  const { t, locale } = useI18n();
  const w = COPY[locale === 'en' ? 'en' : 'fr'];
  const [transactions] = useState<WalletTransaction[]>(initialTransactions);
  const [error] = useState<string | null>(null);

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

  // Three states, and the distinction that was missing before.
  //
  // PAID: delivery was confirmed, so the money was transferred to this
  // traveler's own Stripe account and Stripe pays it out to their bank on its
  // own schedule. It is no longer ours and there is nothing to withdraw.
  //
  // HELD: the sender has paid and we are holding it until the recipient
  // confirms delivery. This is the only figure Jibly actually owes.
  //
  // The old page summed every captured booking ever, divided by 1.15, and
  // called the result a withdrawable balance — so money already sitting in a
  // traveler's bank account was counted again, forever, next to a button that
  // promised to send it a second time.
  const paid = incoming.filter((t) => t.transfer_id);
  const held = captured.filter((t) => !t.transfer_id);

  const netEuros = (rows: WalletTransaction[]) =>
    rows.reduce(
      (s, r) => s + travelerNetFromTotal((r.payment_amount ?? 0) / 100),
      0
    );

  // transfer_amount is what Stripe actually moved — the record of the payout,
  // not a re-derivation of it.
  const paidEuros =
    paid.reduce((s, r) => s + (r.transfer_amount ?? 0), 0) / 100;
  const heldEuros = netEuros(held);
  const pendingEuros = netEuros(authorized);

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

          {/* Earnings: what has actually been paid, and what is still in escrow. */}
          <section className="mb-10">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink-400 tracking-[0.12em] uppercase mb-3">
              <CheckCircle2 className="w-3.5 h-3.5 text-mint-500" />
              {w.heroTitle}
            </h2>
            <div className="bg-gradient-to-br from-ink-500 to-ink-600 rounded-3xl p-7 lg:p-9 text-cream-50 relative overflow-hidden">
              <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-mint-500/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-butter-500/15 blur-2xl" />

              {/* Two numbers, nothing else. Every explanation that used to sit
                  here — the counts, how payouts reach the bank, where to set
                  them up — was answering a question nobody had asked yet, and
                  buried the only two figures a traveler opens this page for. */}
              <div className="relative flex flex-wrap gap-x-12 gap-y-6">
                <div>
                  <div className="text-[12px] font-semibold text-cream-50/60 tracking-[0.12em] uppercase mb-2">
                    {w.earnedLabel}
                  </div>
                  <div className="text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] num-display">
                    {formatEuros(paidEuros)}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-cream-50/60 tracking-[0.12em] uppercase mb-2">
                    {w.heldLabel}
                  </div>
                  <div className="text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] num-display">
                    {formatEuros(heldEuros)}
                  </div>
                </div>
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
  // What was actually PAID takes precedence over what we would compute: once a
  // transfer exists, transfer_amount is the real figure and re-deriving it from
  // payment_amount can only disagree with it — as it did, showing "5 €" beside
  // a transfer that had actually sent 4.89.
  const netEuros =
    tx.transfer_amount != null
      ? tx.transfer_amount / 100
      : travelerNetFromTotal((tx.payment_amount ?? 0) / 100);

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
