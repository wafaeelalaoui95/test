'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Plane, Package } from 'lucide-react';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';
import { ViewProofButton } from '@/components/ImageLightbox';
import {
  displayName,
  nameInitial,
  formatShortDate,
  formatEuros,
  travelerNetFromTotal,
} from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import type { ItemCategory } from '@/lib/types';

/**
 * /historique — All terminated bookings (delivered or cancelled), separated
 * by role. The user lands here from the "Voir l'historique" links inside
 * /me → Mes transports and /me → Mes envois.
 *
 * Two tabs, mirroring /me:
 *   - Transports : the bookings where I'm the traveler
 *   - Envois     : the bookings where I'm the sender
 *
 * Default tab is decided by ?type=transports|envois in the URL.
 */
type RoleTab = 'transports' | 'envois';

export default function HistoriquePage() {
  // useSearchParams requires a Suspense boundary at build time
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
        </div>
      }
    >
      <HistoriqueContent />
    </Suspense>
  );
}

function HistoriqueContent() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('type') === 'envois' ? 'envois' : 'transports') as RoleTab;
  const [tab, setTab] = useState<RoleTab>(initialTab);

  // Data: we re-fetch with the same queries the /me page uses, then
  // filter locally to keep only terminated rows.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomingIntents, setIncomingIntents] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [myProposals, setMyProposals] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      browser.listIncomingBookingIntents(user.id),
      browser.listMyBookings(user.id),
      browser.listMyTravelerProposals(user.id),
      browser.listMyTrips(user.id),
    ])
      .then(([iRes, bRes, pRes, tRes]) => {
        if (cancelled) return;
        if (iRes.status === 'fulfilled') setIncomingIntents(iRes.value);
        if (bRes.status === 'fulfilled') setMyBookings(bRes.value);
        if (pRes.status === 'fulfilled') setMyProposals(pRes.value);
        if (tRes.status === 'fulfilled') setTrips(tRes.value);
        if ([iRes, bRes, pRes, tRes].every((r) => r.status === 'rejected')) {
          setError(t.sec_load_error);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Compute the historic items for the selected tab.
  const items = useMemo(() => {
    if (tab === 'transports') {
      // Traveler-side history:
      //   - incoming bookings delivered or cancelled
      //   - my proposals delivered or cancelled
      //   - cancelled trips
      const out: Array<{ kind: 'incoming' | 'proposal' | 'trip'; row: any }> = [];
      incomingIntents
        .filter((i) =>
          i.status === 'cancelled' ||
          (i.status === 'confirmed' && i.delivery_proof_url)
        )
        .forEach((i) => out.push({ kind: 'incoming', row: i }));
      myProposals
        .filter((p) =>
          p.status === 'cancelled' ||
          (p.status === 'confirmed' && p.delivery_proof_url)
        )
        .forEach((p) => out.push({ kind: 'proposal', row: p }));
      trips
        .filter((tr) => tr.status === 'cancelled')
        .forEach((tr) => out.push({ kind: 'trip', row: tr }));
      // sort by created_at/departure_date desc
      return out.sort((a, b) => {
        const aDate = a.row.created_at ?? a.row.departure_date;
        const bDate = b.row.created_at ?? b.row.departure_date;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
    } else {
      // Sender-side history: bookings where I'm the sender
      return myBookings
        .filter((b) =>
          b.status === 'cancelled' ||
          (b.status === 'confirmed' && b.delivery_proof_url)
        )
        .map((b) => ({ kind: 'booking' as const, row: b }))
        .sort(
          (a, b) =>
            new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime()
        );
    }
  }, [tab, incomingIntents, myBookings, myProposals, trips]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-ink-500">{t.sec_hist_login_prompt}</p>
        <Link
          href="/login?next=/historique"
          className="px-5 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
        >
          {t.sec_login}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
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
            {t.sec_hist_title}
          </h1>
          <p className="text-[14px] text-ink-400 mb-8">
            {t.sec_hist_subtitle}
          </p>

          {/* Tabs */}
          <div className="inline-flex border-b border-ink-100 mb-8">
            <button
              onClick={() => setTab('transports')}
              className={`flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium transition-colors -mb-px ${
                tab === 'transports'
                  ? 'text-ink-600 border-b-2 border-ink-500'
                  : 'text-ink-300 hover:text-ink-500 border-b-2 border-transparent'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>{t.sec_hist_tab_transports}</span>
            </button>
            <button
              onClick={() => setTab('envois')}
              className={`flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium transition-colors -mb-px ${
                tab === 'envois'
                  ? 'text-ink-600 border-b-2 border-ink-500'
                  : 'text-ink-300 hover:text-ink-500 border-b-2 border-transparent'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t.sec_hist_tab_envois}</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-ink-100">
              <h3 className="text-lg font-bold text-ink-600 mb-2">
                {t.sec_hist_empty_title}
              </h3>
              <p className="text-[14px] text-ink-400 max-w-sm mx-auto leading-relaxed">
                {tab === 'transports'
                  ? t.sec_hist_empty_transports
                  : t.sec_hist_empty_envois}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it, i) => (
                <HistoryRow key={`${it.kind}-${it.row.id}-${i}`} kind={it.kind} row={it.row} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryRow — a single condensed line for any kind of historic item.
// Reuses the compact 1-line style we built for /me.
// ---------------------------------------------------------------------------
function HistoryRow({
  kind,
  row,
}: {
  kind: 'incoming' | 'proposal' | 'trip' | 'booking';
  row: any;
}) {
  const { t, locale } = useI18n();
  // Cancelled trip — special compact row
  if (kind === 'trip') {
    return (
      <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50 opacity-70">
        <div className="flex items-center gap-3 text-[13px]">
          <Plane className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
          <span className="text-ink-500">
            {cityDisplayName(row.departure_city, locale)} → {cityDisplayName(row.arrival_city, locale)}
          </span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-400 num-display">
            {formatShortDate(row.departure_date)}
          </span>
          <span className="text-[11px] text-ink-300 ml-auto">{t.sec_hist_status_cancelled_trip}</span>
        </div>
      </div>
    );
  }

  // The other kinds share the same shape: avatar + name + route + price + status
  const otherProfile =
    kind === 'incoming'
      ? row.sender_profile
      : kind === 'proposal'
        ? row.sender_profile
        : row.traveler_profile;
  const otherName = displayName(otherProfile?.full_name) || '-';
  const initial = nameInitial(otherProfile?.full_name);
  const cat = ITEM_CATEGORIES.find((c) => c.value === (row.item_category as ItemCategory));

  // Price shown: for traveler-side (incoming/proposal) we show NET earned.
  // For sender-side (booking) we show TTC paid.
  const priceLabel =
    kind === 'booking'
      ? formatEuros(row.proposed_price)
      : formatEuros(travelerNetFromTotal(row.proposed_price ?? 0));

  const statusLabel = (() => {
    if (row.status === 'cancelled') return { text: t.sec_hist_status_declined, tone: 'text-ink-300' };
    if (row.delivery_proof_url) return { text: t.sec_hist_status_delivered, tone: 'text-mint-600' };
    return { text: t.sec_hist_status_confirmed, tone: 'text-mint-500' };
  })();

  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[12px] text-ink-500">
          {cat?.icon ?? initial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{otherName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">
            {cityDisplayName(row.pickup_city, locale)} → {cityDisplayName(row.destination_city, locale)}
          </span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-ink-600 num-display">{priceLabel}</span>
          <span className={`text-[11px] ml-1 ${statusLabel.tone}`}>{statusLabel.text}</span>
        </div>
        {row.delivery_proof_url && (
          <ViewProofButton url={row.delivery_proof_url} label={t.sec_hist_view_proof} />
        )}
      </div>
    </div>
  );
}
