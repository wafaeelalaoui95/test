'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Package,
  Plane,
  Bell,
  User,
  Plus,
  ShieldCheck,
  Mail,
  Phone,
  CheckCircle2,
  MapPin,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Wallet,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, VerificationBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import { ITEM_CATEGORIES, SPACE_OPTIONS } from '@/lib/constants';
import { formatShortDate, formatName, nameInitial, displayName } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/i18n/translations';
import type {
  ShippingRequestRow,
  TravelerTripRow,
  MatchRow,
  Profile,
  ItemCategory,
  AvailableSpace,
} from '@/lib/supabase/types';

type TabId = 'overview' | 'requests' | 'trips' | 'matches' | 'profile';

type MatchWithRefs = MatchRow & {
  traveler_trip?: TravelerTripRow | null;
  shipping_request?: ShippingRequestRow | null;
};

// Booking intents that target one of MY open trips — what I (as a traveler)
// see when senders express interest in my route.
type IncomingIntent = {
  id: string;
  sender_id: string;
  traveler_trip_id: string;
  item_category: string;
  item_description: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  payment_intent_id: string | null;
  payment_status: 'unpaid' | 'authorized' | 'captured' | 'canceled' | 'failed';
  payment_amount: number | null;
  sender_profile: { id: string; full_name: string | null; avatar_url: string | null; rating: number; trips_completed: number; verification_level: string } | null;
  traveler_trip: { id: string; departure_city: string; arrival_city: string; departure_date: string } | null;
};

export default function MyPage() {
  const { t } = useI18n();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');

  const [requests, setRequests] = useState<ShippingRequestRow[]>([]);
  const [trips, setTrips] = useState<TravelerTripRow[]>([]);
  const [matches, setMatches] = useState<MatchWithRefs[]>([]);
  const [incomingIntents, setIncomingIntents] = useState<IncomingIntent[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    setError(null);

    // Safety: even if one Supabase query hangs forever, never freeze the page.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setDataLoading(false);
    }, 6000);

    // Wrap each query with a short timeout so a single stuck join doesn't
    // block the whole dashboard. Failed queries fall back to empty arrays.
    const withTimeout = <T,>(p: Promise<T>, fallback: T, ms = 5000): Promise<T> =>
      Promise.race([
        p.catch(() => fallback),
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    Promise.allSettled([
      withTimeout(browser.listMyRequests(user.id), [] as ShippingRequestRow[]),
      withTimeout(browser.listMyTrips(user.id), [] as TravelerTripRow[]),
      withTimeout(browser.listMyMatches(user.id), [] as MatchRow[]),
      withTimeout(browser.listIncomingBookingIntents(user.id), [] as IncomingIntent[]),
      withTimeout(browser.listMyBookings(user.id), [] as MyBooking[]),
    ])
      .then(([rRes, trRes, mRes, iRes, bRes]) => {
        if (cancelled) return;
        if (rRes.status === 'fulfilled') setRequests(rRes.value);
        if (trRes.status === 'fulfilled') setTrips(trRes.value);
        if (mRes.status === 'fulfilled') setMatches(mRes.value as MatchWithRefs[]);
        if (iRes.status === 'fulfilled') setIncomingIntents(iRes.value as IncomingIntent[]);
        if (bRes.status === 'fulfilled') setMyBookings(bRes.value as MyBooking[]);
      })
      .finally(() => {
        if (cancelled) return;
        clearTimeout(safetyTimeout);
        setDataLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, [user, authLoading, t.auth_error_generic]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <p className="text-[16px] text-ink-400 mb-6">{t.auth_login_required}</p>
          <Link href="/login?next=/me">
            <Button>{t.auth_login_btn}</Button>
          </Link>
        </div>
      </div>
    );
  }

 // Wallet balance: sum of all captured Stripe payments where I'm the
  // traveler. payment_amount is in cents → divide by 100 to get euros.
  // We only count `captured` (not `authorized`) because authorized funds
  // can still be canceled if I decline.
  const walletEuros = incomingIntents
    .filter((i) => i.payment_status === 'captured' && i.payment_amount)
    .reduce((sum, i) => sum + (i.payment_amount ?? 0), 0) / 100;

  const stats = {
    active: requests.filter((r) => r.status === 'pending' || r.status === 'matched').length
          + trips.filter((trip) => trip.status === 'open' || trip.status === 'matched').length,
    pending: incomingIntents.filter((i) => i.status === 'pending').length,
    earned: walletEuros,
    completed: requests.filter((r) => r.status === 'delivered').length
             + trips.filter((trip) => trip.status === 'completed').length,
  };

  const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: t.me_tab_overview, icon: LayoutGrid },
    { id: 'requests', label: t.me_tab_requests, icon: Package },
    { id: 'trips', label: t.me_tab_trips, icon: Plane },
    { id: 'matches', label: t.me_tab_matches, icon: Bell },
    { id: 'profile', label: t.me_tab_profile, icon: User },
  ];

  const initial = profile?.full_name
    ? nameInitial(profile.full_name)
    : (user.email?.charAt(0).toUpperCase() ?? '·');

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 lg:mb-12 flex items-center gap-5"
        >
          <div className="w-14 h-14 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-xl text-lavender-700">
            {initial}
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.03em]">
              {formatName(profile?.full_name) || t.me_title}
            </h1>
            <p className="text-[14px] text-ink-400 mt-1">{user.email}</p>
          </div>
        </motion.div>

        <div className="mb-10 -mx-5 px-5 overflow-x-auto scrollbar-hide">
          <div className="inline-flex border-b border-ink-100">
            {TABS.map((tabItem) => {
              const active = tab === tabItem.id;
              const pendingCount = incomingIntents.filter((i) => i.status === 'pending').length;
              const confirmedBookings = myBookings.filter((b) => b.status === 'confirmed').length;
              const showMatchesBadge = tabItem.id === 'matches' && pendingCount > 0;
              const showRequestsBadge = tabItem.id === 'requests' && confirmedBookings > 0;
              const badgeCount = showMatchesBadge ? pendingCount : showRequestsBadge ? confirmedBookings : 0;
              const badgeColor = showRequestsBadge ? 'bg-mint-500' : 'bg-blush-500';
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium transition-colors whitespace-nowrap relative -mb-px',
                    active
                      ? 'text-ink-600 border-b-2 border-ink-500'
                      : 'text-ink-300 hover:text-ink-500 border-b-2 border-transparent'
                  )}
                >
                  <tabItem.icon className="w-4 h-4" strokeWidth={2} />
                  <span>{tabItem.label}</span>
                  {(showMatchesBadge || showRequestsBadge) && (
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-cream-50 text-[10px] font-bold',
                      badgeColor
                    )}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-blush-50 rounded-2xl p-6 text-center text-blush-500 text-[14px] max-w-2xl mx-auto">
            {error}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'overview' && (
                <OverviewTab stats={stats} matches={matches} walletEuros={walletEuros} t={t} />
              )}
              {tab === 'requests' && <RequestsTab requests={requests} bookings={myBookings} t={t} />}
              {tab === 'trips' && <TripsTab trips={trips} t={t} />}
              {tab === 'matches' && (
                <MatchesTab
                  intents={incomingIntents}
                  onUpdate={async (id, status) => {
                    // 1. Update the booking_intent status in our DB first
                    await browser.updateBookingIntentStatus(id, status);

                    // 2. If there's a Stripe payment attached, capture (on
                    //    accept) or cancel (on refuse). We don't await this
                    //    in a way that would block the UI — failures are
                    //    logged but don't roll back the status update,
                    //    which would create a worse UX. A real-world
                    //    deployment would use webhooks + reconciliation
                    //    for that, but this is fine for the MVP.
                    const intent = incomingIntents.find((i) => i.id === id);
                    if (intent?.payment_intent_id) {
                      const endpoint = status === 'confirmed' ? 'capture' : 'cancel';
                      try {
                        const res = await fetch(`/api/stripe/${endpoint}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            paymentIntentId: intent.payment_intent_id,
                            bookingIntentId: id,
                          }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          console.warn(`Stripe ${endpoint} failed:`, data);
                        }
                      } catch (e) {
                        console.warn(`Stripe ${endpoint} error:`, e);
                      }
                    }

                    setIncomingIntents((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, status } : it))
                    );
                  }}
                  t={t}
                />
              )}
              {tab === 'profile' && (
                <ProfileTab
                  profile={profile}
                  email={user.email ?? ''}
                  onProfileUpdated={refreshProfile}
                  t={t}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// === OVERVIEW ===
function OverviewTab({
  stats,
  matches,
  walletEuros,
  t,
}: {
  stats: { active: number; pending: number; earned: number; completed: number };
  matches: MatchWithRefs[];
  walletEuros: number;
  t: Translations;
}) {
  const pendingMatches = matches.filter((m) => m.status === 'proposed');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8 lg:gap-x-12">
        <StatItem label={t.me_stats_active} value={stats.active.toString()} />
        <StatItem label={t.me_stats_pending} value={stats.pending.toString()} />
        <StatItem label={t.me_stats_earned} value={`${stats.earned}${t.common_eur}`} />
        <StatItem label={t.me_stats_completed} value={stats.completed.toString()} />
      </div>

      <div className="h-px bg-ink-50" />

      {/* WALLET — total received from Stripe-captured payments */}
      <div className="bg-gradient-to-br from-ink-500 to-ink-600 rounded-3xl p-7 lg:p-9 text-cream-50 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-lavender-500/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-butter-500/15 blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold text-cream-200/80 tracking-[0.12em] uppercase mb-3">
              Mon portefeuille
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl lg:text-6xl font-extrabold tracking-[-0.025em] num-display">
                {walletEuros.toFixed(2)}
              </span>
              <span className="text-2xl font-medium text-cream-200/90">€</span>
            </div>
            <p className="text-[14px] text-cream-200/70 mt-3 max-w-md leading-relaxed">
              {walletEuros > 0
                ? 'Total des paiements reçus pour les colis acheminés.'
                : 'Vos gains s\'afficheront ici dès que vous accepterez votre première demande.'}
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2">
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cream-50 hover:bg-cream-100 text-ink-600 font-semibold text-[14px] transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Retirer mes gains
            </button>
            <span className="text-[11px] text-cream-200/60 italic">
              🔧 Bientôt disponible
            </span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/envoyer"
          className="group bg-white rounded-2xl p-6 border border-ink-50 hover:border-ink-200 transition-colors flex items-center gap-5"
        >
          <div className="w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-ink-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-600 text-[15px]">{t.me_new_request}</div>
            <div className="text-[13px] text-ink-400 mt-0.5">{t.send_subtitle}</div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
        </Link>

        <Link
          href="/voyager"
          className="group bg-white rounded-2xl p-6 border border-ink-50 hover:border-ink-200 transition-colors flex items-center gap-5"
        >
          <div className="w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-ink-500" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-600 text-[15px]">{t.me_new_trip}</div>
            <div className="text-[13px] text-ink-400 mt-0.5">{t.trip_subtitle}</div>
          </div>
          <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 transition-colors" />
        </Link>
      </div>

      {pendingMatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-butter-500" />
              {t.me_section_pending_matches}
            </h2>
            <span className="text-[13px] font-medium text-ink-400 num-display">
              {pendingMatches.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingMatches.map((m) => (
              <MatchCard key={m.id} match={m} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-ink-300 uppercase tracking-[0.1em] mb-3">{label}</div>
      <div className="text-4xl lg:text-5xl font-extrabold text-ink-600 num-display tracking-[-0.03em]">
        {value}
      </div>
    </div>
  );
}

// === REQUESTS ===
// MyBooking type = a booking_intent created by ME, enriched with the trip + traveler profile
type MyBooking = {
  id: string;
  sender_id: string;
  traveler_trip_id: string;
  item_category: string;
  item_description: string | null;
  proposed_price: number;
  pickup_city: string;
  destination_city: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  traveler_trip: { id: string; departure_city: string; arrival_city: string; departure_date: string; user_id: string } | null;
  traveler_profile: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; verification_level: string; rating: number; trips_completed: number } | null;
};

function RequestsTab({
  requests,
  bookings,
  t,
}: {
  requests: ShippingRequestRow[];
  bookings: MyBooking[];
  t: Translations;
}) {
  return (
    <div className="space-y-10">
      {/* Direct bookings — reservations on a specific traveler */}
      {bookings.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-ink-600 mb-2 tracking-[-0.02em]">
            Mes réservations
          </h2>
          <p className="text-[14px] text-ink-400 mb-6">
            Trajets que vous avez réservés directement avec un voyageur.
          </p>
          <div className="space-y-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Public requests — when you publish to /matches without picking anyone */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">
            {t.me_section_my_requests}
          </h2>
          <Link href="/envoyer">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              {t.me_new_request}
            </Button>
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState message={t.empty_my_requests} />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, t }: { booking: MyBooking; t: Translations }) {
  const cat = ITEM_CATEGORIES.find((c) => c.value === (booking.item_category as ItemCategory));
  const trip = booking.traveler_trip;
  const traveler = booking.traveler_profile;
  const travelerName = displayName(traveler?.full_name) || 'Voyageur';
  const initial = nameInitial(traveler?.full_name);

  // Use Supabase auth.users email — we don't have it on the public profile
  // (RLS hides emails). For the contact info to be visible the simplest
  // path is to expose `phone` only, plus a "send a message" mailto via
  // a server route. We'll show the phone if set, and a generic message
  // otherwise — see the "Contact" block below.

  if (booking.status === 'confirmed') {
    return (
      <div className="bg-white rounded-2xl border border-mint-200 overflow-hidden">
        {/* Celebration banner */}
        <div className="bg-mint-50 px-5 py-4 flex items-center gap-3 border-b border-mint-200">
          <span className="text-2xl">🎉</span>
          <div>
            <div className="font-bold text-mint-700 text-[15px]">
              {travelerName.split(' ')[0]} a accepté !
            </div>
            <div className="text-[13px] text-mint-700/80">
              Vous pouvez maintenant convenir des détails du transport.
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-4 mb-5">
            <Link href={`/u/${traveler?.id}`} className="flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[14px] text-lavender-700">
                {initial}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/u/${traveler?.id}`}
                className="font-semibold text-ink-600 text-[15px] hover:underline"
              >
                {travelerName}
              </Link>
              <div className="text-[13px] text-ink-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span>{booking.pickup_city} → {booking.destination_city}</span>
                <span>·</span>
                <span>{trip && formatShortDate(trip.departure_date)}</span>
                <span>·</span>
                <span>{cat ? t[cat.labelKey] : booking.item_category}</span>
                <span>·</span>
                <span className="font-semibold text-ink-600">{booking.proposed_price}€</span>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="rounded-xl bg-cream-50 px-4 py-3.5 space-y-2.5">
            <div className="text-[11px] font-semibold text-ink-300 tracking-[0.12em] uppercase">
              Comment le contacter
            </div>
            {traveler?.phone ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[15px] font-medium text-ink-600 num-display">
                  {traveler.phone}
                </span>
                <a
                  href={`https://wa.me/${traveler.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint-500 hover:bg-mint-600 text-white text-[13px] font-semibold transition-colors"
                >
                  WhatsApp
                </a>
                <a
                  href={`tel:${traveler.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors"
                >
                  Appeler
                </a>
              </div>
            ) : (
              <p className="text-[13px] text-ink-400 leading-relaxed">
                Le voyageur n&apos;a pas encore renseigné de numéro. Une messagerie in-app arrive bientôt — en attendant, vous pouvez{' '}
                <Link href={`/u/${traveler?.id}`} className="underline font-medium text-ink-500">
                  voir son profil
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Pending or cancelled
  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center text-xl">
          {cat?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="font-semibold text-ink-600 flex items-center gap-2 flex-wrap text-[15px]">
              <span>{booking.pickup_city}</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-300" />
              <span>{booking.destination_city}</span>
            </div>
            {booking.status === 'pending' ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-butter-100 text-ink-600 text-[11px] font-semibold uppercase tracking-[0.06em]">
                En attente
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-ink-50 text-ink-400 text-[11px] font-semibold uppercase tracking-[0.06em]">
                Refusée
              </span>
            )}
          </div>
          <div className="text-[13px] text-ink-400">
            Avec <span className="font-medium text-ink-500">{travelerName}</span> ·{' '}
            {cat ? t[cat.labelKey] : ''} ·{' '}
            {trip && formatShortDate(trip.departure_date)} ·{' '}
            {booking.proposed_price}€
          </div>
          {booking.status === 'pending' && (
            <p className="text-[13px] text-ink-400 mt-2 leading-relaxed">
              {travelerName.split(' ')[0]} n&apos;a pas encore répondu. On vous prévient dès qu&apos;il accepte.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, t }: { request: ShippingRequestRow; t: Translations }) {
  const cat = ITEM_CATEGORIES.find((c) => c.value === (request.item_category as ItemCategory));
  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50 hover:border-ink-100 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center text-xl">
          {cat?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="font-semibold text-ink-600 flex items-center gap-2 flex-wrap text-[15px]">
              <span>{request.pickup_city}</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-300" />
              <span>{request.destination_city}</span>
            </div>
            <StatusBadge status={request.status} t={t} />
          </div>
          <div className="text-[13px] text-ink-400">
            {cat ? t[cat.labelKey] : ''} · {formatShortDate(request.desired_delivery_date)} · {request.budget}{t.common_eur}
          </div>
        </div>
      </div>
    </div>
  );
}

// === TRIPS ===
function TripsTab({ trips, t }: { trips: TravelerTripRow[]; t: Translations }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">{t.me_section_my_trips}</h2>
        <Link href="/voyager">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            {t.me_new_trip}
          </Button>
        </Link>
      </div>

      {trips.length === 0 ? (
        <EmptyState message={t.empty_my_trips} />
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, t }: { trip: TravelerTripRow; t: Translations }) {
  const space = SPACE_OPTIONS.find((s) => s.value === (trip.available_space as AvailableSpace));
  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50 hover:border-ink-100 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center text-xl">
          {space?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="font-semibold text-ink-600 flex items-center gap-2 flex-wrap text-[15px]">
              <span>{trip.departure_city}</span>
              <Plane className="w-3.5 h-3.5 text-ink-300" />
              <span>{trip.arrival_city}</span>
            </div>
            <StatusBadge status={trip.status} t={t} />
          </div>
          <div className="text-[13px] text-ink-400">
            {formatShortDate(trip.departure_date)} · {space ? t[space.labelKey] : ''} · {t.matches_min} {trip.compensation_min}{t.common_eur}
          </div>
        </div>
      </div>
    </div>
  );
}

// === MATCHES ===
function MatchesTab({
  intents,
  onUpdate,
  t,
}: {
  intents: IncomingIntent[];
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  t: Translations;
}) {
  const pending = intents.filter((i) => i.status === 'pending');
  const decided = intents.filter((i) => i.status !== 'pending');

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-ink-600 mb-2 tracking-[-0.02em]">
          Demandes reçues
        </h2>
        <p className="text-[14px] text-ink-400 mb-7">
          Des expéditeurs aimeraient confier un objet à un de vos trajets.
        </p>
        {pending.length === 0 ? (
          <EmptyState message="Aucune demande en attente pour le moment." />
        ) : (
          <div className="space-y-3">
            {pending.map((intent) => (
              <IntentCard key={intent.id} intent={intent} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-ink-300 tracking-[0.12em] uppercase mb-4">
            Historique
          </h3>
          <div className="space-y-3 opacity-70">
            {decided.map((intent) => (
              <IntentCard key={intent.id} intent={intent} onUpdate={onUpdate} historic />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IntentCard({
  intent,
  onUpdate,
  historic = false,
}: {
  intent: IncomingIntent;
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  historic?: boolean;
}) {
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const senderName = displayName(intent.sender_profile?.full_name) || 'Quelqu\'un';
  const senderInitial = nameInitial(intent.sender_profile?.full_name);

  async function handle(action: 'confirmed' | 'cancelled') {
    setBusy(action === 'confirmed' ? 'confirm' : 'cancel');
    try {
      await onUpdate(intent.id, action);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[14px] text-lavender-700">
          {senderInitial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink-600 text-[15px]">
            {senderName}
          </div>
          <div className="text-[13px] text-ink-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span>{intent.pickup_city} → {intent.destination_city}</span>
            <span>·</span>
            <span className="capitalize">{intent.item_category.replace('_', ' ')}</span>
            <span>·</span>
            <span className="font-semibold text-ink-600">{intent.proposed_price}€</span>
          </div>
          {intent.item_description && (
            <p className="text-[14px] text-ink-500 mt-2 leading-relaxed line-clamp-2">
              « {intent.item_description} »
            </p>
          )}
          {/* Reassurance: payment is already secured */}
          {intent.payment_status === 'authorized' && !historic && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[12px] font-semibold">
              <span>💳</span>
              <span>Paiement réservé · sécurisé par Stripe</span>
            </div>
          )}
          {intent.payment_status === 'captured' && historic && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[12px] font-semibold">
              <span>✓</span>
              <span>Paiement encaissé</span>
            </div>
          )}
          {historic && (
            <div className="mt-2 text-[12px] font-medium">
              {intent.status === 'confirmed' ? (
                <span className="text-mint-500">✓ Acceptée</span>
              ) : (
                <span className="text-ink-300">✕ Refusée</span>
              )}
            </div>
          )}
        </div>
      </div>

      {!historic && (
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <button
            onClick={() => handle('cancelled')}
            disabled={!!busy}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            {busy === 'cancel' ? '...' : 'Refuser'}
          </button>
          <button
            onClick={() => handle('confirmed')}
            disabled={!!busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50"
          >
            {busy === 'confirm' ? '...' : 'Accepter'}
          </button>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  t,
  expanded = false,
}: {
  match: MatchWithRefs;
  t: Translations;
  expanded?: boolean;
}) {
  const req = match.shipping_request;
  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center text-ink-500">
          <Package className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink-600 text-[15px]">
            {req ? `${req.pickup_city} → ${req.destination_city}` : `Match #${match.id.slice(0, 6)}`}
          </div>
          <div className="text-[13px] text-ink-400 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span>{t.me_status_pending}</span>
            {match.agreed_compensation && (
              <>
                <span>·</span>
                <span className="font-semibold text-ink-600">{match.agreed_compensation}{t.common_eur}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="flex gap-2.5 mt-5 pt-5 border-t border-ink-50">
          <Button size="sm" className="flex-1">
            {t.matches_contact}
          </Button>
          <Button variant="ghost" size="sm">
            {t.common_cancel}
          </Button>
        </div>
      )}
    </div>
  );
}

// === PROFILE ===
function ProfileTab({
  profile,
  email,
  onProfileUpdated,
  t,
}: {
  profile: Profile | null;
  email: string;
  onProfileUpdated: () => Promise<void>;
  t: Translations;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const DELETE_CONFIRM_WORD = t.account_delete_typing_placeholder;

  async function handleDeleteAccount() {
    setDeleteErr(null);
    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed');
      }
      // Hard reload to clear all client state
      window.location.href = '/';
    } catch (e: any) {
      setDeleteErr(e.message ?? t.auth_error_generic);
      setDeleting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      await browser.updateProfile(profile.id, {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
      });
      await onProfileUpdated();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr(e.message ?? t.auth_error_generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={handleSave} className="lg:col-span-2 bg-white rounded-2xl p-7 border border-ink-50">
        <div className="flex items-center gap-4 mb-7 pb-7 border-b border-ink-50">
          <div className="w-14 h-14 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-xl text-lavender-700">
            {fullName ? nameInitial(fullName) : (email.charAt(0).toUpperCase())}
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-ink-600 tracking-[-0.015em]">
              {formatName(fullName) || email}
            </div>
            {profile && (
              <div className="mt-1.5">
                <VerificationBadge level={profile.verification_level} />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Input
            label={t.me_profile_name}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Salma El Amrani"
          />
          <div>
            <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.me_profile_email}</label>
            <div className="px-4 py-3 rounded-xl bg-cream-100 text-[15px] text-ink-500">{email}</div>
          </div>
          <Input
            label={t.me_profile_phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            hint="Utilisé pour vous joindre par WhatsApp ou téléphone après une réservation."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
            />
            <Input
              label="Pays"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="France"
            />
          </div>
        </div>

        {err && (
          <div className="mt-5 rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
            {err}
          </div>
        )}

        <div className="mt-7 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t.common_save}
          </Button>
          {saved && (
            <span className="text-[14px] text-mint-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Sauvegardé
            </span>
          )}
        </div>
      </form>

      <div className="bg-cream-100 rounded-2xl p-7 border border-ink-50">
        <ShieldCheck className="w-6 h-6 text-ink-500 mb-5" strokeWidth={1.75} />
        <h3 className="text-lg font-bold text-ink-600 mb-4 tracking-[-0.015em]">
          {t.me_profile_verification}
        </h3>
        <div className="space-y-2.5 mb-6">
          <CheckRow label={t.verif_email} done />
          <CheckRow label={t.verif_id} done={profile?.verification_level === 'id_verified' || profile?.verification_level === 'trusted'} />
          <CheckRow label={t.verif_trusted} done={profile?.verification_level === 'trusted'} />
        </div>
        <Button size="sm" fullWidth>
          {t.me_profile_verify_now}
        </Button>
      </div>

      {/* Danger zone — full-width, subtle, lives below the form. */}
      <div className="lg:col-span-3 mt-4">
        <div className="bg-blush-50/40 border border-blush-200/60 rounded-2xl p-7">
          <div className="text-[11px] font-semibold text-blush-500 tracking-[0.12em] uppercase mb-4">
            {t.account_danger_zone}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-ink-600 tracking-[-0.01em] mb-1">
                {t.account_delete_title}
              </h3>
              <p className="text-[14px] text-ink-400 leading-relaxed max-w-prose">
                {t.account_delete_text}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteErr(null); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-blush-500 border border-blush-200 hover:bg-blush-50 hover:border-blush-300 rounded-full transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              {t.account_delete_btn}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-7 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-full bg-blush-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-blush-500" strokeWidth={2} />
                </div>
                <button
                  onClick={() => !deleting && setShowDeleteModal(false)}
                  className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400"
                  disabled={deleting}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-xl font-extrabold text-ink-600 tracking-[-0.015em] mb-3">
                {t.account_delete_confirm_title}
              </h2>
              <p className="text-[15px] text-ink-400 leading-relaxed mb-6">
                {t.account_delete_text}
              </p>

              <div className="mb-6">
                <div className="text-[13px] text-ink-500 mb-2">
                  {t.account_delete_confirm_text}{' '}
                  <span className="font-bold text-ink-600 px-1.5 py-0.5 bg-cream-100 rounded">
                    {DELETE_CONFIRM_WORD}
                  </span>
                </div>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={DELETE_CONFIRM_WORD}
                  autoFocus
                  disabled={deleting}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[15px] focus:outline-none focus:ring-2 focus:ring-blush-200 focus:border-blush-300 transition-all disabled:opacity-50"
                />
              </div>

              {deleteErr && (
                <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500 mb-5">
                  {deleteErr}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
                >
                  {t.account_delete_cancel}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm.trim().toLowerCase() !== DELETE_CONFIRM_WORD.toLowerCase()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-blush-500 hover:bg-blush-600 disabled:bg-blush-200 disabled:cursor-not-allowed rounded-full transition-colors"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t.account_delete_confirm_btn}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[14px]">
      <div
        className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
          done ? 'bg-mint-500' : 'border border-ink-200'
        )}
      >
        {done && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className={done ? 'text-ink-600 font-medium' : 'text-ink-400'}>{label}</span>
    </div>
  );
}

// === SHARED ===
function StatusBadge({ status, t }: { status: string; t: Translations }) {
  const map: Record<string, { variant: 'mint' | 'butter' | 'lavender' | 'sky' | 'ink'; key: keyof Translations }> = {
    pending: { variant: 'butter', key: 'me_status_pending' },
    open: { variant: 'lavender', key: 'me_status_open' },
    matched: { variant: 'sky', key: 'me_status_matched' },
    in_transit: { variant: 'sky', key: 'me_status_in_transit' },
    completed: { variant: 'mint', key: 'me_status_completed' },
    delivered: { variant: 'mint', key: 'me_status_completed' },
    cancelled: { variant: 'ink', key: 'me_status_cancelled' },
    flagged: { variant: 'blush' as any, key: 'me_status_cancelled' },
    draft: { variant: 'ink', key: 'me_status_pending' },
  };
  const entry = map[status] ?? map.pending;
  return <Badge variant={entry.variant}>{t[entry.key]}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-16 border border-dashed border-ink-100 text-center">
      <p className="text-[15px] text-ink-400">{message}</p>
    </div>
  );
}
