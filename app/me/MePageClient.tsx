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
  Trash2,
  Wallet,
  Camera,
  X,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, VerificationBadge } from '@/components/ui/Badge';
import { DeliveryProofModal } from '@/components/DeliveryProofModal';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { ChatModal } from '@/components/ChatModal';
import { ReviewModal } from '@/components/ReviewModal';
import { Input } from '@/components/ui/Form';
import { ITEM_CATEGORIES, SPACE_OPTIONS } from '@/lib/constants';
import { formatShortDate, formatName, nameInitial, displayName, formatEuros } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
import type { ReviewForBooking } from '@/lib/supabase/queries';
import { getBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/i18n/translations';
import type {
  ShippingRequestRow,
  TravelerTripRow,
  MatchRow,
  Profile,
  ItemCategory,
  AvailableSpace,
  VerificationLevel,
} from '@/lib/supabase/types';

type TabId = 'trips' | 'sends' | 'profile';

type MatchWithRefs = MatchRow & {
  traveler_trip?: TravelerTripRow | null;
  shipping_request?: ShippingRequestRow | null;
};

// Booking intents that target one of MY open trips — what I (as a traveler)
// see when senders express interest in my route.
type IncomingIntent = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
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
  delivery_proof_url: string | null;
  delivery_proof_uploaded_at: string | null;
  delivery_proof_receiver_name: string | null;
  delivery_proof_notes: string | null;
  received_confirmed_at: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  sender_profile: { id: string; full_name: string | null; avatar_url: string | null; rating: number; trips_completed: number; verification_level: VerificationLevel } | null;
  traveler_trip: { id: string; departure_city: string; arrival_city: string; departure_date: string } | null;
};

export default function MyPage({
  initialProfile,
  initialRequests,
  initialTrips,
  initialMatches,
  initialIncomingIntents,
  initialMyBookings,
  initialMyProposals,
  initialReviews = [],
}: {
  initialUser: { id: string; email: string | null };
  initialProfile: Profile | null;
  initialRequests: ShippingRequestRow[];
  initialTrips: TravelerTripRow[];
  initialMatches: MatchWithRefs[];
  initialIncomingIntents: IncomingIntent[];
  initialMyBookings: MyBooking[];
  initialMyProposals: TravelerProposal[];
  initialReviews?: ReviewForBooking[];
}) {
  const { t } = useI18n();
  // `user` and `profile` still come from useAuth so realtime auth changes
  // (sign-out, etc.) reflect immediately. We have server-fetched fallbacks
  // so the page renders fully on first paint — no spinner.
  const { user, profile: liveProfile, loading: authLoading, refreshProfile } = useAuth();
  const profile = liveProfile ?? initialProfile;
  const [tab, setTab] = useState<TabId>('trips');

  // Initialize with server-fetched data — no useEffect waterfall on mount.
  const [requests, setRequests] = useState<ShippingRequestRow[]>(initialRequests);
  const [trips, setTrips] = useState<TravelerTripRow[]>(initialTrips);
  const [matches, setMatches] = useState<MatchWithRefs[]>(initialMatches);
  const [incomingIntents, setIncomingIntents] = useState<IncomingIntent[]>(initialIncomingIntents);
  const [myBookings, setMyBookings] = useState<MyBooking[]>(initialMyBookings);
  const [myProposals, setMyProposals] = useState<TravelerProposal[]>(initialMyProposals);
  // Reviews tied to all the bookings the user is part of. We keep this in
  // local state so we can optimistically lock the UI after submitting a
  // review without a roundtrip.
  const [reviews, setReviews] = useState<ReviewForBooking[]>(initialReviews);
  // ReviewModal target — set when the user clicks "Noter X", null when closed.
  const [reviewing, setReviewing] = useState<{
    bookingIntentId: string;
    reviewedUserId: string;
    reviewedUserName: string;
    reviewedRole: 'sender' | 'traveler';
  } | null>(null);
  // Data is already there on first render — no loading state needed at boot.
  const [dataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the sender accepts a traveler's proposal, we open a Stripe payment
  // modal. The proposal booking is held here while paying.
  const [proposalToPay, setProposalToPay] = useState<MyBooking | null>(null);

  // Chat modal — pick a booking to open. We stash everything the modal
  // needs so it doesn't have to re-query.
  const [chatTarget, setChatTarget] = useState<{
    bookingIntentId: string;
    senderId: string;
    travelerId: string;
    otherName: string;
    otherInitial: string;
    contextLine?: string;
  } | null>(null);

  // Has the current user already reviewed this booking? Used to flip the
  // "Noter" button into a locked "Vous avez noté" badge.
  const hasReviewed = (bookingIntentId: string): boolean =>
    !!user && reviews.some(
      (r) => r.booking_intent_id === bookingIntentId && r.reviewer_id === user.id
    );

  // Did the OTHER party review me on this booking? Used to surface a small
  // "X vous a noté ★★★★★" preview inline on the card.
  const reviewFromOther = (bookingIntentId: string): ReviewForBooking | null => {
    if (!user) return null;
    return (
      reviews.find(
        (r) =>
          r.booking_intent_id === bookingIntentId &&
          r.reviewer_id !== user.id &&
          r.reviewed_user_id === user.id
      ) ?? null
    );
  };

  // Deep-link from notification emails: if the URL contains ?chat={id},
  // open the chat modal once data is loaded. Run on every relevant data
  // refresh in case the user lands while loading.
  useEffect(() => {
    if (dataLoading || !user) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const chatBookingId = params.get('chat');
    if (!chatBookingId || chatTarget) return;

    // Find the booking in one of our lists. It could live in incomingIntents
    // (we're the traveler) OR myBookings (we're the sender) OR myProposals
    // (we're the proposer waiting for sender).
    const incoming = incomingIntents.find((i) => i.id === chatBookingId);
    if (incoming) {
      const otherName = displayName(incoming.sender_profile?.full_name) || 'Expéditeur';
      setChatTarget({
        bookingIntentId: incoming.id,
        senderId: incoming.sender_id,
        travelerId: user.id,
        otherName,
        otherInitial: nameInitial(incoming.sender_profile?.full_name),
        contextLine: `${incoming.pickup_city} → ${incoming.destination_city}`,
      });
      return;
    }
    const booking = myBookings.find((b) => b.id === chatBookingId);
    if (booking && booking.traveler_profile) {
      const otherName = displayName(booking.traveler_profile.full_name) || 'Voyageur';
      setChatTarget({
        bookingIntentId: booking.id,
        senderId: user.id,
        travelerId: booking.traveler_profile.id,
        otherName,
        otherInitial: nameInitial(booking.traveler_profile.full_name),
        contextLine: `${booking.pickup_city} → ${booking.destination_city}`,
      });
      return;
    }
    const proposal = myProposals.find((p) => p.id === chatBookingId);
    if (proposal && proposal.sender_profile) {
      const otherName = displayName(proposal.sender_profile.full_name) || 'Expéditeur';
      setChatTarget({
        bookingIntentId: proposal.id,
        senderId: proposal.sender_id,
        travelerId: user.id,
        otherName,
        otherInitial: nameInitial(proposal.sender_profile.full_name),
        contextLine: `${proposal.pickup_city} → ${proposal.destination_city}`,
      });
    }
  }, [dataLoading, user, incomingIntents, myBookings, myProposals, chatTarget]);

  // Manual refresh helper — call this after a mutation if you really need
  // to re-pull everything. No longer runs on mount: data is server-fetched
  // and passed as props. Prefer optimistic local updates (the rest of this
  // component already does that everywhere) or `router.refresh()` after a
  // server action — they are both much cheaper than re-running all 6 queries.
  const refreshAll = async () => {
    if (!user) return;
    setError(null);

    const withTimeout = <T,>(p: Promise<T>, fallback: T, ms = 12000): Promise<T> =>
      Promise.race([
        p.catch((e) => {
          console.warn('Refresh query failed:', e);
          return fallback;
        }),
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    const [r, tr, m, ii, mb, mp] = await Promise.all([
      withTimeout(browser.listMyRequests(user.id), [] as ShippingRequestRow[]),
      withTimeout(browser.listMyTrips(user.id), [] as TravelerTripRow[]),
      withTimeout(browser.listMyMatches(user.id), [] as MatchRow[]),
      withTimeout(browser.listIncomingBookingIntents(user.id), [] as IncomingIntent[]),
      withTimeout(browser.listMyBookings(user.id), [] as MyBooking[]),
      withTimeout(browser.listMyTravelerProposals(user.id), [] as TravelerProposal[]),
    ]);
    setRequests(r);
    setTrips(tr);
    setMatches(m as MatchWithRefs[]);
    setIncomingIntents(ii as IncomingIntent[]);
    setMyBookings(mb as MyBooking[]);
    setMyProposals(mp as TravelerProposal[]);
  };

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

  const TABS: { id: TabId; label: string; icon: typeof Plane }[] = [
    { id: 'trips', label: 'Mes voyages', icon: Plane },
    { id: 'sends', label: 'Mes envois', icon: Package },
    { id: 'profile', label: t.me_tab_profile, icon: User },
  ];

  const initial = profile?.full_name
    ? nameInitial(profile.full_name)
    : (user.email?.charAt(0).toUpperCase() ?? '·');

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-12">
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
              // Badge logic for the new tabs:
              //   Mes voyages : count of pending incoming requests + bookings to deliver
              //   Mes envois  : count of pending traveler proposals on my requests
              const tripsTodoCount =
                incomingIntents.filter((i) => i.status === 'pending').length +
                incomingIntents.filter((i) => i.status === 'confirmed' && !i.delivery_proof_url).length;
              const sendsTodoCount = myBookings.filter(
                (b) => b.status === 'pending' && b.initiated_by === 'traveler'
              ).length;
              const showTripsBadge = tabItem.id === 'trips' && tripsTodoCount > 0;
              const showSendsBadge = tabItem.id === 'sends' && sendsTodoCount > 0;
              const badgeCount = showTripsBadge ? tripsTodoCount : showSendsBadge ? sendsTodoCount : 0;
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
                  {(showTripsBadge || showSendsBadge) && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-cream-50 text-[10px] font-bold bg-blush-500">
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
              {tab === 'trips' && (
                <TripsView
                  trips={trips}
                  incomingIntents={incomingIntents}
                  myProposals={myProposals}
                  onUpdateIntent={async (id, status) => {
                    await browser.updateBookingIntentStatus(id, status);
                    const intent = incomingIntents.find((i) => i.id === id);
                    if (intent?.payment_intent_id) {
                      const endpoint = status === 'confirmed' ? 'capture' : 'cancel';
                      try {
                        await fetch(`/api/stripe/${endpoint}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            paymentIntentId: intent.payment_intent_id,
                            bookingIntentId: id,
                          }),
                        });
                      } catch (e) {
                        console.warn(`Stripe ${endpoint} error:`, e);
                      }
                    }
                    setIncomingIntents((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, status } : it))
                    );
                  }}
                  onProofUploaded={(id, url, receiverName) => {
                    setIncomingIntents((prev) =>
                      prev.map((it) =>
                        it.id === id
                          ? {
                              ...it,
                              delivery_proof_url: url,
                              delivery_proof_uploaded_at: new Date().toISOString(),
                              delivery_proof_receiver_name: receiverName || null,
                            }
                          : it
                      )
                    );
                  }}
                  onCancelTrip={async (tripId) => {
                    await browser.cancelTrip(tripId);
                    setTrips((prev) =>
                      prev.map((tr) => (tr.id === tripId ? { ...tr, status: 'cancelled' } : tr))
                    );
                  }}
                  onOpenChat={(intent) => {
                    // Traveler side: opens chat with the sender of this incoming
                    // booking. The senderId is the booking's sender_id; the
                    // travelerId is me (the current user).
                    setChatTarget({
                      bookingIntentId: intent.id,
                      senderId: intent.sender_id,
                      travelerId: user.id,
                      otherName: displayName(intent.sender_profile?.full_name) || 'Expéditeur',
                      otherInitial: nameInitial(intent.sender_profile?.full_name),
                      contextLine: `${intent.pickup_city} → ${intent.destination_city}`,
                    });
                  }}
                  onOpenReview={(intent) => {
                    // Traveler reviews the sender of this confirmed booking.
                    setReviewing({
                      bookingIntentId: intent.id,
                      reviewedUserId: intent.sender_id,
                      reviewedUserName:
                        displayName(intent.sender_profile?.full_name) || 'L\'expéditeur',
                      reviewedRole: 'sender',
                    });
                  }}
                  hasReviewed={hasReviewed}
                  reviewFromOther={reviewFromOther}
                  t={t}
                />
              )}

              {tab === 'sends' && (
                <SendsView
                  bookings={myBookings}
                  requests={requests}
                  onAcceptProposal={(b) => setProposalToPay(b)}
                  onDeclineProposal={async (id) => {
                    await browser.updateBookingIntentStatus(id, 'cancelled');
                    setMyBookings((prev) =>
                      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
                    );
                  }}
                  onOpenChat={(booking) => {
                    // Sender side: opens chat with the traveler. travelerId
                    // comes from traveler_profile (which can be the traveler
                    // who proposed, or the owner of the trip booked).
                    if (!booking.traveler_profile) return;
                    setChatTarget({
                      bookingIntentId: booking.id,
                      senderId: user.id,
                      travelerId: booking.traveler_profile.id,
                      otherName: displayName(booking.traveler_profile.full_name) || 'Voyageur',
                      otherInitial: nameInitial(booking.traveler_profile.full_name),
                      contextLine: `${booking.pickup_city} → ${booking.destination_city}`,
                    });
                  }}
                  onConfirmReceipt={async (bookingId) => {
                    // Sender confirms they got their package. This unlocks
                    // mutual reviews. Optimistic update keeps the UI snappy.
                    try {
                      await browser.confirmBookingReceipt(bookingId);
                      setMyBookings((prev) =>
                        prev.map((b) =>
                          b.id === bookingId
                            ? { ...b, received_confirmed_at: new Date().toISOString() }
                            : b
                        )
                      );
                    } catch (e) {
                      console.warn('[me] confirm receipt failed:', e);
                      alert('Impossible de confirmer pour le moment. Réessayez.');
                    }
                  }}
                  onOpenReview={(booking) => {
                    // Sender reviews the traveler of this delivered booking.
                    if (!booking.traveler_profile) return;
                    setReviewing({
                      bookingIntentId: booking.id,
                      reviewedUserId: booking.traveler_profile.id,
                      reviewedUserName:
                        displayName(booking.traveler_profile.full_name) || 'Le voyageur',
                      reviewedRole: 'traveler',
                    });
                  }}
                  hasReviewed={hasReviewed}
                  reviewFromOther={reviewFromOther}
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

      {/* Sender accepts a traveler's proposal → pay via Stripe */}
      <AnimatePresence>
        {proposalToPay && (
          <ProposalPaymentModal
            booking={proposalToPay}
            onClose={() => setProposalToPay(null)}
            onSuccess={(paymentIntentId) => {
              // Mark the booking as confirmed + paid in local state.
              setMyBookings((prev) =>
                prev.map((b) =>
                  b.id === proposalToPay.id
                    ? {
                        ...b,
                        status: 'confirmed',
                        payment_intent_id: paymentIntentId,
                        payment_status: 'authorized',
                      }
                    : b
                )
              );
              setProposalToPay(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Chat modal — opens over the dashboard for confirmed bookings */}
      <AnimatePresence>
        {chatTarget && user && (
          <ChatModal
            bookingIntentId={chatTarget.bookingIntentId}
            senderId={chatTarget.senderId}
            travelerId={chatTarget.travelerId}
            currentUserId={user.id}
            otherName={chatTarget.otherName}
            otherInitial={chatTarget.otherInitial}
            contextLine={chatTarget.contextLine}
            onClose={() => {
              setChatTarget(null);
              // Clean up the ?chat= query param so closing then reopening
              // /me later doesn't auto-open the chat again.
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (url.searchParams.has('chat')) {
                  url.searchParams.delete('chat');
                  window.history.replaceState({}, '', url.toString());
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Review modal — mutual rating after a booking is confirmed received.
          Optimistically inserts the new review into local state so the lock
          (and the "X vous a noté" preview, once the other side reviews) kick
          in without a refetch. */}
      <AnimatePresence>
        {reviewing && user && (
          <ReviewModal
            bookingIntentId={reviewing.bookingIntentId}
            reviewerId={user.id}
            reviewedUserId={reviewing.reviewedUserId}
            reviewedUserName={reviewing.reviewedUserName}
            reviewedRole={reviewing.reviewedRole}
            onClose={() => setReviewing(null)}
            onSuccess={(rating) => {
              setReviews((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  booking_intent_id: reviewing.bookingIntentId,
                  reviewer_id: user.id,
                  reviewed_user_id: reviewing.reviewedUserId,
                  rating,
                  comment: null,
                  created_at: new Date().toISOString(),
                },
              ]);
              setReviewing(null);
            }}
          />
        )}
      </AnimatePresence>
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
        {/* Decorative halo */}
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

      {/* Withdraw modal — informative for now, no real action */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-7 max-w-md w-full shadow-xl text-center"
            >
              <div className="w-14 h-14 rounded-full bg-butter-100 mx-auto flex items-center justify-center mb-5">
                <Wallet className="w-7 h-7 text-butter-500" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
                Le retrait arrive bientôt
              </h3>
              <p className="text-[15px] text-ink-400 leading-relaxed mb-6">
                Nous mettons en place les virements bancaires sécurisés.
                En attendant, vos gains sont conservés sur Jibly et nous vous contactons directement pour vous les transmettre.
              </p>
              <div className="rounded-xl bg-white border border-ink-50 px-4 py-3 mb-6 text-[14px] text-ink-500">
                <div className="text-[11px] font-semibold text-ink-300 tracking-[0.06em] uppercase mb-1">
                  Votre solde
                </div>
                <div className="text-3xl font-extrabold text-ink-600 num-display tracking-[-0.02em]">
                  {walletEuros.toFixed(2)}€
                </div>
              </div>
              <p className="text-[13px] text-ink-400 mb-6">
                Une question ? Écrivez-nous à{' '}
                <a href="mailto:hello@jibly.com" className="font-semibold text-ink-600 underline">
                  hello@jibly.com
                </a>
              </p>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 font-semibold text-[14px] transition-colors"
              >
                Compris
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
// TravelerProposal = a proposal I (as a traveler) made on a public request,
// enriched with the sender's profile so I can see who I offered to help.
type TravelerProposal = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
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
  delivery_proof_url: string | null;
  delivery_proof_uploaded_at: string | null;
  delivery_proof_receiver_name: string | null;
  delivery_proof_notes: string | null;
  received_confirmed_at: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  traveler_user_id: string | null;
  sender_profile: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; verification_level: VerificationLevel; rating: number; trips_completed: number } | null;
};

// MyBooking type = a booking_intent created by ME, enriched with the trip + traveler profile
type MyBooking = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
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
  delivery_proof_url: string | null;
  delivery_proof_uploaded_at: string | null;
  delivery_proof_receiver_name: string | null;
  delivery_proof_notes: string | null;
  received_confirmed_at: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  traveler_trip: { id: string; departure_city: string; arrival_city: string; departure_date: string; user_id: string } | null;
  traveler_profile: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; verification_level: VerificationLevel; rating: number; trips_completed: number } | null;
};

function RequestsTab({
  requests,
  bookings,
  onAcceptProposal,
  onDeclineProposal,
  t,
}: {
  requests: ShippingRequestRow[];
  bookings: MyBooking[];
  onAcceptProposal: (b: MyBooking) => void;
  onDeclineProposal: (id: string) => void;
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
              <BookingCard
                key={b.id}
                booking={b}
                onAcceptProposal={onAcceptProposal}
                onDeclineProposal={onDeclineProposal}
                t={t}
              />
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

function BookingCard({
  booking,
  onAcceptProposal,
  onDeclineProposal,
  onOpenChat,
  onConfirmReceipt,
  onOpenReview,
  hasReviewed,
  otherReview,
  t,
}: {
  booking: MyBooking;
  onAcceptProposal?: (b: MyBooking) => void;
  onDeclineProposal?: (id: string) => void;
  onOpenChat?: (b: MyBooking) => void;
  // The 3 props below are only used in the delivered-card branch — they're
  // optional so callers from the "todo proposals" section don't need them.
  onConfirmReceipt?: (bookingId: string) => void;
  onOpenReview?: (b: MyBooking) => void;
  hasReviewed?: boolean;
  otherReview?: ReviewForBooking | null;
  t: Translations;
}) {
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

  // Confirmed AND already delivered (proof uploaded) — three sub-states:
  //   A) sender hasn't confirmed receipt yet → show "J'ai bien reçu" button
  //   B) confirmed but not yet reviewed → show "Noter" button
  //   C) reviewed → small "Vous avez noté" badge (+ what the other side wrote)
  // All three states keep the compact one-line layout from before; the right
  // side just swaps content based on state.
  if (booking.status === 'confirmed' && booking.delivery_proof_url) {
    const isReceived = !!booking.received_confirmed_at;
    return (
      <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-[15px]">
            {cat?.icon}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
            <span className="font-semibold text-ink-600">{travelerName}</span>
            <span className="text-ink-300">·</span>
            <span className="text-ink-500 truncate">{booking.pickup_city} → {booking.destination_city}</span>
            <span className="text-ink-300">·</span>
            <span className="font-semibold text-ink-600 num-display">{formatEuros(booking.proposed_price)}</span>
            <span className="text-[11px] text-mint-600 ml-1">📸 livré</span>
          </div>
          <a
            href={booking.delivery_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-[12px] font-medium text-ink-400 hover:text-ink-600 underline transition-colors"
          >
            Voir la preuve
          </a>

          {/* State A: not yet confirmed received */}
          {!isReceived && onConfirmReceipt && (
            <button
              type="button"
              onClick={() => onConfirmReceipt(booking.id)}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-mint-500 hover:bg-mint-600 text-white text-[12px] font-semibold transition-colors"
            >
              J&apos;ai bien reçu
            </button>
          )}

          {/* State B: received, not yet reviewed */}
          {isReceived && !hasReviewed && onOpenReview && (
            <button
              type="button"
              onClick={() => onOpenReview(booking)}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[12px] font-semibold transition-colors"
            >
              <Star className="w-3 h-3 fill-white" strokeWidth={0} />
              Noter
            </button>
          )}

          {/* State C: reviewed — locked badge */}
          {isReceived && hasReviewed && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[11px] font-semibold">
              <Star className="w-3 h-3 fill-current" strokeWidth={0} />
              Vous avez noté
            </span>
          )}
        </div>

        {/* If the traveler already reviewed me, show a tiny preview below */}
        {otherReview && (
          <div className="mt-2 ml-11 text-[12px] text-ink-400 flex items-center gap-1.5 flex-wrap">
            <span>{travelerName.split(' ')[0]} vous a noté</span>
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < otherReview.rating ? 'fill-butter-400 text-butter-400' : 'text-ink-200'
                  }`}
                  strokeWidth={0}
                />
              ))}
            </span>
            {otherReview.comment && (
              <span className="text-ink-500">· « {otherReview.comment} »</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Confirmed BUT not yet delivered → rich view. The sender needs the
  // contact info to coordinate the actual handover, and the celebration
  // banner signals progress. Once delivered, we collapse it (above).
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

          {/* Delivery proof — visible only once the traveler has uploaded one */}
          {booking.delivery_proof_url && (
            <div className="rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3.5 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📸</span>
                <div className="text-[13px] font-bold text-mint-700">
                  Preuve de livraison
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={booking.delivery_proof_url}
                alt="Preuve de livraison"
                className="w-full max-h-64 object-cover rounded-lg mb-3 border border-mint-200/40"
              />
              {booking.delivery_proof_receiver_name && (
                <div className="text-[13px] text-ink-500 mb-1">
                  <span className="text-ink-400">Remis à :</span>{' '}
                  <strong className="text-ink-600">{booking.delivery_proof_receiver_name}</strong>
                </div>
              )}
              {booking.delivery_proof_notes && (
                <div className="text-[13px] text-ink-500 leading-relaxed mt-1">
                  <span className="text-ink-400">Note :</span> « {booking.delivery_proof_notes} »
                </div>
              )}
              {booking.delivery_proof_uploaded_at && (
                <div className="text-[11px] text-ink-300 mt-2">
                  Téléversée le {formatShortDate(booking.delivery_proof_uploaded_at)}
                </div>
              )}
            </div>
          )}

          {/* Contact details */}
          <div className="rounded-xl bg-cream-50 px-4 py-3.5 space-y-2.5">
            <div className="text-[11px] font-semibold text-ink-300 tracking-[0.12em] uppercase">
              Comment le contacter
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* In-app messaging — primary, always available */}
              {onOpenChat && (
                <button
                  onClick={() => onOpenChat(booking)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[13px] font-semibold transition-colors"
                >
                  💬 Message
                </button>
              )}
              {traveler?.phone ? (
                <>
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
                </>
              ) : (
                <span className="text-[12px] text-ink-400">
                  WhatsApp non renseigné
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending or cancelled
  // Two pending sub-cases:
  //   A) initiated_by='sender' → I (the sender) made the booking and am
  //      waiting for the traveler. Payment already authorized.
  //   B) initiated_by='traveler' → A traveler responded to my public
  //      request. Payment NOT yet made. I need to Accept & Pay.
  const isTravelerProposal = booking.initiated_by === 'traveler' && booking.status === 'pending';

  return (
    <div className={`bg-white rounded-xl px-3 py-2.5 border ${isTravelerProposal ? 'border-lavender-300' : 'border-ink-50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-[15px]">
          {cat?.icon}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{travelerName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">{booking.pickup_city} → {booking.destination_city}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-ink-600 num-display">{formatEuros(booking.proposed_price)}</span>
          {isTravelerProposal && (
            <span className="text-[11px] text-lavender-600 ml-1">✨ nouveau</span>
          )}
          {booking.status === 'pending' && !isTravelerProposal && (
            <span className="text-[11px] text-ink-300 ml-1">⏳ en attente</span>
          )}
          {booking.status === 'cancelled' && (
            <span className="text-[11px] text-ink-300 ml-1">✕ refusée</span>
          )}
        </div>

        {/* Actions inline */}
        {isTravelerProposal && onAcceptProposal && onDeclineProposal && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onDeclineProposal(booking.id)}
              className="px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={() => onAcceptProposal(booking)}
              className="px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors"
            >
              Payer {formatEuros(booking.proposed_price)}
            </button>
          </div>
        )}
      </div>

      {/* Traveler's message — only when there's one and it's a proposal */}
      {isTravelerProposal && booking.traveler_message && (
        <p className="mt-2 ml-11 text-[12px] text-ink-400 leading-snug line-clamp-2">
          « {booking.traveler_message} »
        </p>
      )}
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
function TripsTab({
  trips,
  onCancel,
  t,
}: {
  trips: TravelerTripRow[];
  onCancel: (tripId: string) => Promise<void>;
  t: Translations;
}) {
  // Only show non-cancelled trips. Cancelled ones live on in DB for history
  // but we don't surface them in the main list.
  const visibleTrips = trips.filter((t) => t.status !== 'cancelled');

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

      {visibleTrips.length === 0 ? (
        <EmptyState message={t.empty_my_trips} />
      ) : (
        <div className="space-y-3">
          {visibleTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onCancel={onCancel} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TripCard({
  trip,
  onCancel,
  t,
}: {
  trip: TravelerTripRow;
  onCancel: (tripId: string) => Promise<void>;
  t: Translations;
}) {
  const space = SPACE_OPTIONS.find((s) => s.value === (trip.available_space as AvailableSpace));
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeBookings, setActiveBookings] = useState<number | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openCancelModal() {
    setShowCancelModal(true);
    setErr(null);
    // Load the count of active bookings so we can warn the user
    setLoadingBookings(true);
    try {
      const { count } = await browser.countActiveBookingsForTrip(trip.id);
      setActiveBookings(count);
    } catch {
      setActiveBookings(null); // unknown — proceed without exact warning
    } finally {
      setLoadingBookings(false);
    }
  }

  async function confirmCancel() {
    setCancelling(true);
    setErr(null);
    try {
      await onCancel(trip.id);
      setShowCancelModal(false);
    } catch (e: any) {
      setErr(e?.message ?? 'Échec de l\'annulation. Réessayez.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-[15px]">
            {space?.icon}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
            <span className="font-semibold text-ink-600">{trip.departure_city} → {trip.arrival_city}</span>
            <span className="text-ink-300">·</span>
            <span className="text-ink-500 num-display">{formatShortDate(trip.departure_date)}</span>
            <span className="text-ink-300">·</span>
            <span className="text-ink-500">à partir de {trip.compensation_min}€</span>
          </div>
          <button
            type="button"
            onClick={openCancelModal}
            className="flex-shrink-0 p-1.5 rounded-full text-ink-300 hover:text-blush-500 hover:bg-blush-50 transition-colors"
            aria-label="Annuler ce trajet"
            title="Annuler ce trajet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cancellation modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => !cancelling && setShowCancelModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-7 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-blush-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-blush-500" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">
                    Annuler ce trajet ?
                  </h3>
                  <p className="text-[14px] text-ink-500 leading-relaxed">
                    {trip.departure_city} → {trip.arrival_city} · {formatShortDate(trip.departure_date)}
                  </p>
                </div>
              </div>

              {/* Booking warning */}
              {loadingBookings ? (
                <div className="rounded-xl bg-cream-100 px-4 py-3 mb-5 text-[13px] text-ink-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Vérification des réservations…
                </div>
              ) : activeBookings && activeBookings > 0 ? (
                <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 mb-5 text-[13px] text-ink-500 leading-relaxed">
                  <strong className="text-ink-600">
                    {activeBookings === 1
                      ? '1 réservation est en cours sur ce trajet.'
                      : `${activeBookings} réservations sont en cours sur ce trajet.`}
                  </strong>
                  <br />
                  Elles seront <strong>automatiquement annulées</strong> et les paiements autorisés seront libérés. Aucun débit ne sera effectué.
                </div>
              ) : (
                <p className="text-[14px] text-ink-400 mb-5 leading-relaxed">
                  Cette action est définitive. Le trajet ne sera plus visible par les expéditeurs.
                </p>
              )}

              {err && (
                <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500 mb-5">
                  {err}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
                >
                  Garder le trajet
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-blush-500 hover:bg-blush-600 disabled:opacity-50 rounded-full transition-colors"
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {cancelling ? 'Annulation…' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// === MATCHES ===
function MatchesTab({
  intents,
  myProposals,
  onUpdate,
  onProofUploaded,
  t,
}: {
  intents: IncomingIntent[];
  myProposals: TravelerProposal[];
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  t: Translations;
}) {
  // Three groups for incoming requests (initiated by senders):
  //   pending      → awaiting traveler decision (Accept / Decline)
  //   toDeliver    → accepted but proof not yet uploaded (show "I delivered" button)
  //   history      → cancelled, or accepted + delivered (proof uploaded)
  const pending = intents.filter((i) => i.status === 'pending');
  const toDeliver = intents.filter(
    (i) => i.status === 'confirmed' && !i.delivery_proof_url
  );
  const history = intents.filter(
    (i) => i.status === 'cancelled' || (i.status === 'confirmed' && i.delivery_proof_url)
  );

  // Proposals I sent on public requests, split into active and historical.
  const activeProposals = myProposals.filter((p) => p.status === 'pending');
  const historyProposals = myProposals.filter((p) => p.status === 'cancelled');
  // Confirmed proposals (sender accepted) become real bookings to deliver,
  // so we surface them in the toDeliver-style flow via the IntentCard pattern.
  // To keep the data flow simple, we display them in their own section.
  const confirmedProposals = myProposals.filter((p) => p.status === 'confirmed');

  return (
    <div className="space-y-10">
      {/* My proposals sent on public requests */}
      {(activeProposals.length > 0 || confirmedProposals.length > 0) && (
        <div>
          <h2 className="text-2xl font-bold text-ink-600 mb-2 tracking-[-0.02em]">
            Mes propositions envoyées
          </h2>
          <p className="text-[14px] text-ink-400 mb-7">
            Demandes publiques sur lesquelles vous avez offert votre aide.
          </p>
          <div className="space-y-3">
            {confirmedProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} accepted />
            ))}
            {activeProposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </div>
      )}

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
              <IntentCard
                key={intent.id}
                intent={intent}
                onUpdate={onUpdate}
                onProofUploaded={onProofUploaded}
              />
            ))}
          </div>
        )}
      </div>

      {toDeliver.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-ink-300 tracking-[0.12em] uppercase mb-4">
            À livrer
          </h3>
          <div className="space-y-3">
            {toDeliver.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                onUpdate={onUpdate}
                onProofUploaded={onProofUploaded}
                showDeliverButton
              />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold text-ink-300 tracking-[0.12em] uppercase mb-4">
            Historique
          </h3>
          <div className="space-y-3 opacity-70">
            {history.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                onUpdate={onUpdate}
                onProofUploaded={onProofUploaded}
                historic
              />
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
  onProofUploaded,
  onOpenChat,
  historic = false,
  showDeliverButton = false,
}: {
  intent: IncomingIntent;
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onOpenChat?: (intent: IncomingIntent) => void;
  historic?: boolean;
  showDeliverButton?: boolean;
}) {
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
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
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
      {/* Single horizontal row: avatar | info | actions */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[12px] text-lavender-700">
          {senderInitial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{senderName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">{intent.pickup_city} → {intent.destination_city}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-mint-600 num-display">{formatEuros(intent.proposed_price / 1.15)}</span>
          {intent.payment_status === 'authorized' && !historic && (
            <span className="text-[11px] text-mint-600 ml-1">💳</span>
          )}
          {intent.payment_status === 'captured' && historic && (
            <span className="text-[11px] text-mint-600 ml-1">✓ encaissé</span>
          )}
          {historic && intent.delivery_proof_url && (
            <span className="text-[11px] text-mint-600 ml-1">📸 livré</span>
          )}
          {historic && !intent.delivery_proof_url && intent.status === 'confirmed' && (
            <span className="text-[11px] text-mint-500 ml-1">✓ acceptée</span>
          )}
          {historic && !intent.delivery_proof_url && intent.status === 'cancelled' && (
            <span className="text-[11px] text-ink-300 ml-1">✕ refusée</span>
          )}
        </div>

        {/* Actions inline on the right */}
        {!historic && !showDeliverButton && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => handle('cancelled')}
              disabled={!!busy}
              className="px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
            >
              {busy === 'cancel' ? '...' : 'Refuser'}
            </button>
            <button
              onClick={() => handle('confirmed')}
              disabled={!!busy}
              className="px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50"
            >
              {busy === 'confirm' ? '...' : 'Accepter'}
            </button>
          </div>
        )}

        {!historic && showDeliverButton && (
          <>
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(intent)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
                aria-label="Ouvrir la conversation"
                title="Messages"
              >
                💬
              </button>
            )}
            <button
              onClick={() => setShowProofModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors"
            >
              <Camera className="w-3 h-3" />
              J&apos;ai livré
            </button>
          </>
        )}
      </div>

      {/* Proof upload modal */}
      <AnimatePresence>
        {showProofModal && (
          <DeliveryProofModal
            bookingIntentId={intent.id}
            onSuccess={(url) => {
              onProofUploaded(intent.id, url, '');
              setShowProofModal(false);
            }}
            onClose={() => setShowProofModal(false)}
          />
        )}
      </AnimatePresence>
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

// ===========================================================================
// ProposalPaymentModal
// ---------------------------------------------------------------------------
// When a traveler responded to my (the sender's) public request, I see their
// proposal in /me → My sends with a button "Accept and pay X€". Clicking it
// opens this modal: it shows the proposal recap and renders the Stripe
// payment form. On authorisation we update the booking_intent in DB so it
// becomes confirmed + payment_status=authorized.
// ===========================================================================
function ProposalPaymentModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: MyBooking;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const traveler = booking.traveler_profile;
  const travelerName = displayName(traveler?.full_name) || 'Le voyageur';

  async function handleAuthorized(paymentIntentId: string) {
    setBusy(true);
    setErr(null);
    try {
      // Persist the authorisation on the booking_intent row.
      // We also flip status to 'confirmed' so both sides see the green light.
      const { error: updErr } = await getBrowserClient()
        .from('booking_intents')
        .update({
          status: 'confirmed',
          payment_intent_id: paymentIntentId,
          payment_status: 'authorized',
        })
        .eq('id', booking.id);
      if (updErr) throw updErr;
      onSuccess(paymentIntentId);
    } catch (e: any) {
      setErr(e?.message ?? 'Échec de la mise à jour. Contactez le support.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              Confirmer et payer
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {formatEuros(booking.proposed_price)}
            </h2>
            <div className="text-[13px] text-ink-400 mt-1.5">
              Avec {travelerName} · {booking.pickup_city} → {booking.destination_city}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">
            {err}
          </div>
        )}

        <StripePaymentForm
          amountEuros={booking.proposed_price}
          description={`Jibly · ${booking.pickup_city} → ${booking.destination_city}`}
          onAuthorized={handleAuthorized}
          onCancel={onClose}
        />
      </motion.div>
    </motion.div>
  );
}

// ===========================================================================
// ProposalCard — what the traveler sees in /me → Matches
// ---------------------------------------------------------------------------
// I (Yassine) responded to Wafae's public request. Now I'm waiting to see if
// she accepts. This card shows the proposal recap + status. When accepted
// (and paid), I see her WhatsApp here and can later upload delivery proof
// (handled by the existing IntentCard flow for confirmed bookings — for
// proposals we use a simpler read-only display).
// ===========================================================================
function ProposalCard({
  proposal,
  accepted = false,
}: {
  proposal: TravelerProposal;
  accepted?: boolean;
}) {
  const senderName = displayName(proposal.sender_profile?.full_name) || 'L\'expéditeur';
  const initial = nameInitial(proposal.sender_profile?.full_name);
  // What I'll actually receive after Jibly's 15% fee
  const netTraveler = Math.round((proposal.proposed_price / 1.15) * 100) / 100;

  return (
    <div className={`bg-white rounded-xl px-3 py-2.5 border ${accepted ? 'border-mint-200' : 'border-ink-50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[12px] text-ink-500">
          {initial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{senderName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">{proposal.pickup_city} → {proposal.destination_city}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-mint-600 num-display">{formatEuros(netTraveler)}</span>
          {accepted ? (
            <span className="text-[11px] text-mint-600 ml-1">✓ acceptée</span>
          ) : (
            <span className="text-[11px] text-ink-300 ml-1">⏳ en attente</span>
          )}
        </div>

        {/* WhatsApp shortcut inline */}
        {accepted && proposal.sender_profile?.phone && (
          <a
            href={`https://wa.me/${proposal.sender_profile.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-mint-500 hover:bg-mint-600 text-white text-[12px] font-semibold transition-colors"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// New simplified views — replace the old Overview/Requests/Matches tangle.
// ===========================================================================
//
// The user's mental model now has three buckets per tab:
//   🔥 À traiter   — items that demand an action right now
//   ⏳ En cours    — items that are progressing, no action needed
//   📜 Historique  — completed or cancelled (collapsible, not shown here —
//                     it's its own top-level tab now)
//
// Each tab focuses on ONE side of the marketplace:
//   - Mes voyages → what I do as a traveler
//   - Mes envois  → what I do as a sender
//   - Historique  → everything finished, mixed together
// ===========================================================================

function GroupHeader({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h3 className="text-[15px] font-bold text-ink-600 tracking-[-0.01em]">{label}</h3>
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-ink-500 text-cream-50 text-[11px] font-bold">
          {count}
        </span>
      )}
    </div>
  );
}

// Renders a list of items with a "Voir tout" toggle. Shows the first `limit`
// items by default (default 3); click reveals the rest. Used for the
// History section inside Voyages and Envois so it doesn't dominate the page.
function CollapsibleList({
  items,
  limit = 3,
  showAllLabel = 'Voir tout',
  showLessLabel = 'Réduire',
}: {
  items: React.ReactNode[];
  limit?: number;
  showAllLabel?: string;
  showLessLabel?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, limit);
  const hidden = items.length - limit;
  return (
    <div className="space-y-3">
      {visible.map((item, i) => (
        <div key={i}>{item}</div>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[13px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
        >
          {showAll ? showLessLabel : `${showAllLabel} (${hidden} de plus)`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TripsView — "Mes voyages" tab
// ---------------------------------------------------------------------------
function TripsView({
  trips,
  incomingIntents,
  myProposals,
  onUpdateIntent,
  onProofUploaded,
  onCancelTrip,
  onOpenChat,
  onOpenReview,
  hasReviewed,
  reviewFromOther,
  t,
}: {
  trips: TravelerTripRow[];
  incomingIntents: IncomingIntent[];
  myProposals: TravelerProposal[];
  onUpdateIntent: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onCancelTrip: (tripId: string) => Promise<void>;
  onOpenChat: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
  t: Translations;
}) {
  // We group the traveler's work by TRIP — the user thinks "what am I
  // carrying on my Marrakech→Toulouse flight on June 9th". Within each
  // trip we list every active booking attached to it (pending requests
  // to decide on, confirmed bookings to deliver, accepted proposals).
  //
  // The dashboard shows ACTIVE only (status != 'cancelled', not yet
  // delivered). Historic items live on /historique.

  const activeTrips = trips.filter((tr) => tr.status !== 'cancelled');

  // Active items linked to a trip: incoming bookings + my proposals.
  // We keep:
  //   - non-delivered active bookings (in flight)
  //   - bookings that are delivered AND confirmed by the sender BUT not
  //     yet reviewed by the traveler (so the "Noter" button is reachable)
  // Once the traveler reviews, the booking is moved to /historique.
  const activeIncoming = incomingIntents.filter(
    (i) =>
      i.status !== 'cancelled' &&
      (!i.delivery_proof_url ||
        (i.received_confirmed_at && !hasReviewed(i.id)))
  );
  const activeProposals = myProposals.filter(
    (p) => p.status !== 'cancelled' && !p.delivery_proof_url
  );

  // Build the map: trip_id → list of "packages" (mixed incoming + proposals)
  type TripPackage =
    | { kind: 'incoming'; row: IncomingIntent }
    | { kind: 'proposal'; row: TravelerProposal };
  const packagesByTrip = new Map<string, TripPackage[]>();
  activeIncoming.forEach((i) => {
    const tripId = i.traveler_trip_id;
    if (!tripId) return;
    const arr = packagesByTrip.get(tripId) ?? [];
    arr.push({ kind: 'incoming', row: i });
    packagesByTrip.set(tripId, arr);
  });
  activeProposals.forEach((p) => {
    const tripId = p.traveler_trip_id;
    if (!tripId) return;
    const arr = packagesByTrip.get(tripId) ?? [];
    arr.push({ kind: 'proposal', row: p });
    packagesByTrip.set(tripId, arr);
  });

  // Sort trips by departure date ascending (next trip first)
  const sortedTrips = [...activeTrips].sort(
    (a, b) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime()
  );

  // History link counter — same definition as before for the bottom link
  const historyCount =
    incomingIntents.filter(
      (i) => i.status === 'cancelled' || (i.status === 'confirmed' && i.delivery_proof_url)
    ).length +
    myProposals.filter(
      (p) => p.status === 'cancelled' || (p.status === 'confirmed' && p.delivery_proof_url)
    ).length +
    trips.filter((tr) => tr.status === 'cancelled').length;

  const hasContent = activeTrips.length > 0 || historyCount > 0;

  if (!hasContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">Mes voyages</h2>
          <Link href="/voyager">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Publier un trajet
            </Button>
          </Link>
        </div>
        <EmptyState message="Aucun trajet pour le moment. Publiez votre premier voyage." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">Mes voyages</h2>
        <Link href="/voyager">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Publier un trajet
          </Button>
        </Link>
      </div>

      {sortedTrips.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-ink-100">
          <p className="text-[14px] text-ink-400 leading-relaxed mb-4">
            Aucun voyage à venir. Ajoutez votre prochain vol pour commencer à transporter.
          </p>
          <Link href="/voyager">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Publier un trajet
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTrips.map((trip) => (
            <TripGroup
              key={trip.id}
              trip={trip}
              packages={packagesByTrip.get(trip.id) ?? []}
              onUpdateIntent={onUpdateIntent}
              onProofUploaded={onProofUploaded}
              onCancelTrip={onCancelTrip}
              onOpenChat={onOpenChat}
              onOpenReview={onOpenReview}
              hasReviewed={hasReviewed}
              reviewFromOther={reviewFromOther}
              t={t}
            />
          ))}
        </div>
      )}

      {historyCount > 0 && (
        <div className="pt-2">
          <Link
            href="/historique?type=transports"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors"
          >
            📜 Voir l&apos;historique ({historyCount})
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TripGroup — one trip with all its packages stacked under it
// ---------------------------------------------------------------------------
function TripGroup({
  trip,
  packages,
  onUpdateIntent,
  onProofUploaded,
  onCancelTrip,
  onOpenChat,
  onOpenReview,
  hasReviewed,
  reviewFromOther,
  t,
}: {
  trip: TravelerTripRow;
  packages: Array<
    | { kind: 'incoming'; row: IncomingIntent }
    | { kind: 'proposal'; row: TravelerProposal }
  >;
  onUpdateIntent: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onCancelTrip: (tripId: string) => Promise<void>;
  onOpenChat: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
  t: Translations;
}) {
  // "Potential earnings" = sum of NET (post-fee) for every package on this
  // trip, including pending ones. The user wants to see "what I could
  // make on this flight". We don't differentiate confirmed vs pending in
  // the headline — they're all things to handle.
  const totalNet = packages.reduce((sum, p) => {
    const ttc = p.row.proposed_price ?? 0;
    return sum + ttc / 1.15;
  }, 0);

  const count = packages.length;
  const isCancelable = packages.every(
    (p) => p.row.status !== 'confirmed' // only allow trip cancel if no confirmed package
  );

  // Airport-code style — prefer the user-provided 3-letter IATA when set,
  // otherwise fall back to the first 3 letters of the city, uppercase.
  // Not strictly IATA-correct in the fallback case (CAS for Casablanca,
  // not CMN) but gives the right ticket vibe without a lookup table.
  const departCode = trip.departure_airport || trip.departure_city.slice(0, 3).toUpperCase();
  const arriveCode = trip.arrival_airport || trip.arrival_city.slice(0, 3).toUpperCase();

  return (
    <section className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
      {/* Boarding-pass-style header. Two zones split by a perforated
          tear-line. Left = trip info (route, codes). Right = earnings panel
          tinted lavender so the money pops as the headline reward. */}
      <div className="relative border-b border-ink-100">
        {/* Perforation notches at the tear line (~63% across) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[63%] -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-ink-100 z-10 hidden sm:block" />
        <div className="absolute top-0 left-[63%] -translate-x-1/2 w-3 h-1.5 rounded-b-full bg-white border-x border-b border-ink-100 hidden sm:block" />
        <div className="absolute bottom-0 left-[63%] -translate-x-1/2 w-3 h-1.5 rounded-t-full bg-white border-x border-t border-ink-100 hidden sm:block" />

        <div className="flex items-stretch">
          {/* LEFT — trip ticket section, on warm cream paper */}
          <div className="flex-1 px-5 py-4 min-w-0 relative bg-gradient-to-br from-cream-50 to-cream-100">
            {/* Flight number stamp at top — visible only when provided.
                Sits above the codes like a real boarding pass header. */}
            {trip.flight_number && (
              <div className="text-[10px] text-ink-400 font-bold tracking-[0.14em] uppercase mb-1.5 num-display">
                Vol {trip.flight_number}
                {trip.flight_time && <span className="ml-2 text-ink-300">· {trip.flight_time}</span>}
              </div>
            )}
            {/* Codes row with a chunkier plane between */}
            <div className="flex items-center gap-3 mb-1">
              <div className="text-[28px] sm:text-[32px] font-extrabold text-ink-600 tracking-tight leading-none num-display">
                {departCode}
              </div>
              <div className="flex-1 flex items-center min-w-0 px-1">
                <div className="h-px bg-ink-200 flex-1" />
                <Plane className="w-6 h-6 sm:w-7 sm:h-7 mx-2 text-ink-400 -rotate-12 flex-shrink-0" />
                <div className="h-px bg-ink-200 flex-1" />
              </div>
              <div className="text-[28px] sm:text-[32px] font-extrabold text-ink-600 tracking-tight leading-none num-display">
                {arriveCode}
              </div>
            </div>
            {/* City names row */}
            <div className="flex items-center justify-between text-[11px] text-ink-400 mb-3">
              <span className="truncate max-w-[40%]">{trip.departure_city}</span>
              <span className="truncate max-w-[40%] text-right">{trip.arrival_city}</span>
            </div>
            {/* Departure date + colis count, stamped style */}
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <div className="text-ink-300 font-semibold tracking-[0.12em] uppercase mb-0.5">
                  Départ
                </div>
                <div className="text-ink-600 font-bold num-display">
                  {formatShortDate(trip.departure_date)}
                </div>
              </div>
              <div className="h-7 w-px bg-ink-100" />
              <div>
                <div className="text-ink-300 font-semibold tracking-[0.12em] uppercase mb-0.5">
                  Colis
                </div>
                <div className="text-ink-600 font-bold num-display">{count}</div>
              </div>
            </div>
          </div>

          {/* RIGHT — earnings panel, tinted lavender to spotlight the money */}
          <div className="w-[35%] flex-shrink-0 border-l border-dashed border-lavender-300/50 px-3 py-4 flex flex-col justify-center items-center text-center relative bg-gradient-to-br from-lavender-50 to-lavender-100/70">
            <div className="text-[28px] sm:text-[32px] font-extrabold text-lavender-700 num-display leading-none">
              {formatEuros(totalNet)}
            </div>
            <div className="text-[11px] sm:text-[12px] text-lavender-700/80 font-medium mt-1.5 leading-snug px-1">
              de gains sur ce vol ✨
            </div>
            {isCancelable && (
              <button
                onClick={() => onCancelTrip(trip.id)}
                className="absolute top-1 right-1 p-1.5 rounded-full text-lavender-400/70 hover:text-blush-500 hover:bg-white/60 transition-colors"
                aria-label="Annuler ce trajet"
                title="Annuler ce trajet"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Packages list */}
      {count === 0 ? (
        // Empty state: encourage the traveler to browse open requests on
        // this route. The link prefills the search via query params so
        // they land on the matching demands immediately.
        <div className="px-4 py-6 text-center space-y-3">
          <p className="text-[13px] text-ink-400 leading-relaxed">
            Aucun colis sur ce vol pour l&apos;instant.
          </p>
          <Link
            href={`/?type=demandes&from=${encodeURIComponent(trip.departure_city)}&to=${encodeURIComponent(trip.arrival_city)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Trouver des colis sur mon trajet
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {packages.map((p, i) => (
            <div key={`${p.kind}-${p.row.id}-${i}`} className="px-3 py-2">
              {p.kind === 'incoming' ? (
                <IntentCardInline
                  intent={p.row}
                  onUpdate={onUpdateIntent}
                  onProofUploaded={onProofUploaded}
                  onOpenChat={onOpenChat}
                  onOpenReview={onOpenReview}
                  hasReviewed={hasReviewed(p.row.id)}
                  otherReview={reviewFromOther(p.row.id)}
                />
              ) : (
                <ProposalCardInline proposal={p.row} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Stripped-down versions of IntentCard/ProposalCard for use inside a
// TripGroup — borderless (the group has its own border), single line,
// dense.
function IntentCardInline({
  intent,
  onUpdate,
  onProofUploaded,
  onOpenChat,
  onOpenReview,
  hasReviewed,
  otherReview,
}: {
  intent: IncomingIntent;
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onOpenChat: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: boolean;
  otherReview: ReviewForBooking | null;
}) {
  const [showProofModal, setShowProofModal] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const senderName = displayName(intent.sender_profile?.full_name) || 'Expéditeur';
  const senderInitial = nameInitial(intent.sender_profile?.full_name);

  async function handle(status: 'confirmed' | 'cancelled') {
    setBusy(status === 'confirmed' ? 'confirm' : 'cancel');
    try {
      await onUpdate(intent.id, status);
    } finally {
      setBusy(null);
    }
  }

  const showAccept = intent.status === 'pending';
  const showDeliver = intent.status === 'confirmed' && !intent.delivery_proof_url;

  // Status pill — shown in the middle area where there's space.
  // pending  → "Nouvelle demande"  (waiting for me to accept)
  // confirmed (paid) → "💳 Paiement réservé"
  // confirmed (not paid) → "À livrer"
  let statusText: string | null = null;
  let statusClass = '';
  if (intent.status === 'pending') {
    statusText = 'Nouvelle demande';
    statusClass = 'text-butter-700 bg-butter-50';
  } else if (intent.status === 'confirmed' && intent.payment_status === 'authorized') {
    statusText = '💳 Paiement réservé';
    statusClass = 'text-mint-700 bg-mint-50';
  } else if (intent.status === 'confirmed') {
    statusText = 'À livrer';
    statusClass = 'text-lavender-700 bg-lavender-50';
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[12px] text-lavender-700">
          {senderInitial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{senderName}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-mint-600 num-display">
            {formatEuros(intent.proposed_price / 1.15)}
          </span>
          {statusText && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
              {statusText}
            </span>
          )}
        </div>
        {showAccept && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => handle('cancelled')}
              disabled={!!busy}
              className="px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
            >
              {busy === 'cancel' ? '...' : 'Refuser'}
            </button>
            <button
              onClick={() => handle('confirmed')}
              disabled={!!busy}
              className="px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50"
            >
              {busy === 'confirm' ? '...' : 'Accepter'}
            </button>
          </div>
        )}
        {showDeliver && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onOpenChat(intent)}
              className="px-2.5 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-500 text-[12px] transition-colors"
              aria-label="Message"
              title="Message"
            >
              💬
            </button>
            <button
              onClick={() => setShowProofModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors"
            >
              <Camera className="w-3 h-3" />
              J&apos;ai livré
            </button>
          </div>
        )}

        {/* Reviews — visible once the booking is delivered AND the sender
            has confirmed receipt. Two states: "Noter" button, then locked. */}
        {intent.delivery_proof_url && intent.received_confirmed_at && (
          <div className="flex-shrink-0">
            {!hasReviewed ? (
              <button
                type="button"
                onClick={() => onOpenReview(intent)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[12px] font-semibold transition-colors"
              >
                <Star className="w-3 h-3 fill-white" strokeWidth={0} />
                Noter
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[11px] font-semibold">
                <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                Vous avez noté
              </span>
            )}
          </div>
        )}
      </div>

      {/* If the sender already reviewed me, show a tiny preview below */}
      {otherReview && (
        <div className="mt-2 ml-11 text-[12px] text-ink-400 flex items-center gap-1.5 flex-wrap">
          <span>{senderName.split(' ')[0]} vous a noté</span>
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < otherReview.rating ? 'fill-butter-400 text-butter-400' : 'text-ink-200'
                }`}
                strokeWidth={0}
              />
            ))}
          </span>
          {otherReview.comment && (
            <span className="text-ink-500">· « {otherReview.comment} »</span>
          )}
        </div>
      )}

      <AnimatePresence>
        {showProofModal && (
          <DeliveryProofModal
            bookingIntentId={intent.id}
            onSuccess={(url) => {
              onProofUploaded(intent.id, url, '');
              setShowProofModal(false);
            }}
            onClose={() => setShowProofModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ProposalCardInline({ proposal }: { proposal: TravelerProposal }) {
  const senderName = displayName(proposal.sender_profile?.full_name) || 'Expéditeur';
  const initial = nameInitial(proposal.sender_profile?.full_name);
  const netTraveler = Math.round((proposal.proposed_price / 1.15) * 100) / 100;
  const accepted = proposal.status === 'confirmed';

  // Status pill style matches IntentCardInline so the visual language is
  // consistent across the trip's package list.
  const statusText = accepted ? '✓ Acceptée' : 'En attente de réponse';
  const statusClass = accepted
    ? 'text-mint-700 bg-mint-50'
    : 'text-ink-400 bg-cream-100';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[12px] text-ink-500">
        {initial}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2 text-[13px] flex-wrap">
        <span className="font-semibold text-ink-600">{senderName}</span>
        <span className="text-ink-300">·</span>
        <span className="font-semibold text-mint-600 num-display">{formatEuros(netTraveler)}</span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
          {statusText}
        </span>
      </div>
      {accepted && proposal.sender_profile?.phone && (
        <a
          href={`https://wa.me/${proposal.sender_profile.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-mint-500 hover:bg-mint-600 text-white text-[12px] font-semibold transition-colors"
        >
          WhatsApp
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SendsView — "Mes envois" tab
// ---------------------------------------------------------------------------
function SendsView({
  bookings,
  requests,
  onAcceptProposal,
  onDeclineProposal,
  onOpenChat,
  onConfirmReceipt,
  onOpenReview,
  hasReviewed,
  reviewFromOther,
  t,
}: {
  bookings: MyBooking[];
  requests: ShippingRequestRow[];
  onAcceptProposal: (b: MyBooking) => void;
  onDeclineProposal: (id: string) => void;
  onOpenChat: (b: MyBooking) => void;
  onConfirmReceipt: (bookingId: string) => void;
  onOpenReview: (b: MyBooking) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
  t: Translations;
}) {
  // 🔥 À traiter: traveler proposals on my requests (accept and pay)
  const todoProposals = bookings.filter(
    (b) => b.status === 'pending' && b.initiated_by === 'traveler'
  );

  // ⏳ En cours
  // ⏳ En cours : pending (initiés par sender), confirmed sans proof, OR
  // delivered but NOT yet confirmed by the sender. The sender must click
  // "J'ai bien reçu" to close out the booking — only then it goes to history.
  const inProgressBookings = bookings.filter(
    (b) =>
      (b.status === 'confirmed' && !b.delivery_proof_url) ||
      (b.status === 'pending' && b.initiated_by === 'sender') ||
      (b.status === 'confirmed' && b.delivery_proof_url && !b.received_confirmed_at)
  );
  const activeRequests = requests.filter((r) => r.status === 'pending');

  // 📜 Historique côté sender: bookings cancelled OR (delivered AND
  // confirmed received by sender — the deal is fully closed).
  const historyBookings = bookings.filter(
    (b) =>
      b.status === 'cancelled' ||
      (b.status === 'confirmed' && b.delivery_proof_url && b.received_confirmed_at)
  );

  const totalTodos = todoProposals.length;
  const hasContent =
    inProgressBookings.length > 0 ||
    activeRequests.length > 0 ||
    totalTodos > 0 ||
    historyBookings.length > 0;

  if (!hasContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">Mes envois</h2>
          <Link href="/envoyer">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Publier une demande
            </Button>
          </Link>
        </div>
        <EmptyState message="Aucun envoi pour le moment. Publiez votre première demande." />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">Mes envois</h2>
        <Link href="/envoyer">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Publier une demande
          </Button>
        </Link>
      </div>

      {totalTodos > 0 && (
        <section>
          <GroupHeader icon="🔥" label="À traiter" count={totalTodos} />
          <div className="space-y-3">
            {todoProposals.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onAcceptProposal={onAcceptProposal}
                onDeclineProposal={onDeclineProposal}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      {(inProgressBookings.length > 0 || activeRequests.length > 0) && (
        <section>
          <GroupHeader icon="⏳" label="En cours" count={inProgressBookings.length + activeRequests.length} />
          <div className="space-y-3">
            {inProgressBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onOpenChat={onOpenChat}
                onConfirmReceipt={onConfirmReceipt}
                onOpenReview={onOpenReview}
                hasReviewed={hasReviewed(b.id)}
                otherReview={reviewFromOther(b.id)}
                t={t}
              />
            ))}
            {activeRequests.map((req) => (
              <RequestCardSimple key={req.id} request={req} t={t} />
            ))}
          </div>
        </section>
      )}

      {historyBookings.length > 0 && (
        <div className="pt-2">
          <Link
            href="/historique?type=envois"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors"
          >
            📜 Voir l&apos;historique ({historyBookings.length})
          </Link>
        </div>
      )}
    </div>
  );
}

// Simple read-only card for an active public request I posted but
// nobody has responded to yet. Just the route + budget + status.
function RequestCardSimple({ request, t }: { request: ShippingRequestRow; t: Translations }) {
  const cat = ITEM_CATEGORIES.find((c) => c.value === (request.item_category as ItemCategory));
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-ink-50">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-[15px]">
          {cat?.icon}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{request.pickup_city} → {request.destination_city}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 num-display">{formatEuros(request.budget)}</span>
          <span className="text-[11px] text-ink-300 ml-1">⏳ en attente de propositions</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HistoryView — combines both sides, completed or cancelled items
// ---------------------------------------------------------------------------
function HistoryView({
  incomingIntents,
  myBookings,
  myProposals,
  trips,
  t,
}: {
  incomingIntents: IncomingIntent[];
  myBookings: MyBooking[];
  myProposals: TravelerProposal[];
  trips: TravelerTripRow[];
  t: Translations;
}) {
  // Incoming as traveler — delivered or cancelled
  const incomingHistory = incomingIntents.filter(
    (i) => i.status === 'cancelled' || (i.status === 'confirmed' && i.delivery_proof_url)
  );
  // My sends as sender — delivered or cancelled
  const sendsHistory = myBookings.filter(
    (b) => b.status === 'cancelled' || (b.status === 'confirmed' && b.delivery_proof_url)
  );
  // My proposals on public requests — declined or fully delivered
  const proposalsHistory = myProposals.filter(
    (p) => p.status === 'cancelled' || (p.status === 'confirmed' && p.delivery_proof_url)
  );
  // Cancelled trips
  const cancelledTrips = trips.filter((tr) => tr.status === 'cancelled');

  const totalCount =
    incomingHistory.length + sendsHistory.length + proposalsHistory.length + cancelledTrips.length;

  if (totalCount === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em] mb-6">Historique</h2>
        <EmptyState message="Votre historique est vide. Acceptez votre première mission pour commencer." />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">
        Historique <span className="text-ink-300 font-normal text-[15px]">· {totalCount}</span>
      </h2>

      {incomingHistory.length > 0 && (
        <section>
          <GroupHeader icon="✈️" label="Missions livrées ou refusées" count={incomingHistory.length} />
          <div className="space-y-3 opacity-80">
            {incomingHistory.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                onUpdate={async () => {}}
                onProofUploaded={() => {}}
                historic
              />
            ))}
          </div>
        </section>
      )}

      {sendsHistory.length > 0 && (
        <section>
          <GroupHeader icon="📦" label="Envois terminés" count={sendsHistory.length} />
          <div className="space-y-3 opacity-80">
            {sendsHistory.map((b) => (
              <BookingCard key={b.id} booking={b} t={t} />
            ))}
          </div>
        </section>
      )}

      {proposalsHistory.length > 0 && (
        <section>
          <GroupHeader icon="💌" label="Propositions terminées" count={proposalsHistory.length} />
          <div className="space-y-3 opacity-80">
            {proposalsHistory.map((p) => (
              <ProposalCard key={p.id} proposal={p} accepted={p.status === 'confirmed'} />
            ))}
          </div>
        </section>
      )}

      {cancelledTrips.length > 0 && (
        <section>
          <GroupHeader icon="🚫" label="Trajets annulés" count={cancelledTrips.length} />
          <div className="space-y-3 opacity-60">
            {cancelledTrips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-2xl p-5 border border-ink-50">
                <div className="flex items-center gap-4">
                  <Plane className="w-4 h-4 text-ink-300" />
                  <div className="flex-1">
                    <div className="text-[14px] text-ink-500">
                      {trip.departure_city} → {trip.arrival_city}
                    </div>
                    <div className="text-[12px] text-ink-400">
                      {formatShortDate(trip.departure_date)} · Annulé
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
