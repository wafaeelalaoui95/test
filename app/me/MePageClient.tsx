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
  Flag,
  KeyRound,
  Inbox,
  ArrowLeft,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, VerificationBadge } from '@/components/ui/Badge';
import { DeliveryProofModal } from '@/components/DeliveryProofModal';
import { ShipmentJourney } from '@/components/ShipmentJourney';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { ChatModal } from '@/components/ChatModal';
import { Input } from '@/components/ui/Form';
// Trust & safety: dispute reporting + code-based handoff verification
import { DisputeModal } from '@/components/DisputeModal';
import { PickupShowCodeModal } from '@/components/PickupShowCodeModal';
import { VerifyIdentityButton } from '@/components/IdentityGate';
import { PayoutStatusCard } from '@/components/PayoutSetup';
import { PickupEnterCodeModal } from '@/components/PickupEnterCodeModal';
import { ViewProofButton } from '@/components/ImageLightbox';
// Reviews — mutual star-rating between sender and traveler once received_confirmed_at is set.
import { ReviewModal } from '@/components/ReviewModal';
import type { ReviewForBooking } from '@/lib/supabase/queries';
import { ITEM_CATEGORIES, SPACE_OPTIONS } from '@/lib/constants';
import { formatShortDate, nameInitial, formatEuros, travelerNetFromTotal, acceptedCategories } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { browser } from '@/lib/supabase/queries';
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

type TabId = 'trips' | 'sends' | 'payouts' | 'profile';

// ─── NAME DISPLAY HELPERS ─────────────────────────────────────────────────
// User-entered names come in unpredictable casing ("wafae el alaoui",
// "YASSINE", "Marie-Claire"). We don't trust the data layer to normalize
// (it's free text), so we format AT DISPLAY TIME with these helpers.
//
// `titleCaseName` — every word's first letter uppercased, the rest
// lowercased. Handles compound names ("jean-paul" → "Jean-Paul") and
// names with apostrophes ("d'arcy" → "D'Arcy"). Falls back to '' if
// the input is nullish.
function titleCaseName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(/(\s|-|')/) // split on space/hyphen/apostrophe AND keep them
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// `shortName` — render a name as "Firstname L." (first name in title
// case + initial of the last name with a period). Used in notifications
// and any compact mention of "the other party" in cards so we don't
// drown the UI in full names. Example: "wafae el alaoui" → "Wafae E.".
// If the input has only one token, returns just that token title-cased.
function shortName(name: string | null | undefined): string {
  if (!name) return '';
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return titleCaseName(tokens[0]);
  const first = titleCaseName(tokens[0]);
  const lastInitial = tokens[tokens.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}


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
  item_title: string | null;
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
  delivery_early_reason?: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  // Trust & safety fields (08_trust_and_safety.sql)
  pickup_code?: string | null;
  delivery_code?: string | null;
  pickup_confirmed_at?: string | null;
  pickup_confirmed_by?: string | null;
  received_confirmed_at?: string | null;
  // Set once the payout actually left for the traveler's Stripe account. Null
  // after delivery means the money is still on the platform balance, waiting
  // for them to finish payout setup.
  transfer_id?: string | null;
  transferred_at?: string | null;
  sender_profile: { id: string; full_name: string | null; avatar_url: string | null; rating: number; trips_completed: number; verification_level: VerificationLevel } | null;
  traveler_trip: { id: string; departure_city: string; arrival_city: string; departure_date: string } | null;
};

// Props passed from the server-side `app/me/page.tsx`. They server-fetch
// the initial data so the dashboard renders fully on first paint. This
// version of MePageClient doesn't yet wire those props through to local
// state — it still does a client-side refetch in useEffect — but the
// signature must match what the server passes for the build to typecheck.
// A future cleanup will hydrate the useState with the initial* props
// directly, removing the boot spinner entirely.
export default function MyPage(
  _props: {
    initialUser: { id: string; email: string | null };
    initialProfile: Profile | null;
    initialRequests: ShippingRequestRow[];
    initialTrips: TravelerTripRow[];
    initialMatches: MatchWithRefs[];
    initialIncomingIntents: IncomingIntent[];
    initialMyBookings: MyBooking[];
    initialMyProposals: TravelerProposal[];
    initialReviews?: any[];
  }
) {
  const { t, locale } = useI18n();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [tab, setTab] = useState<TabId>('trips');

  // Land on the Payouts tab when we arrive from Stripe's hosted onboarding
  // (?payouts=done or ?payouts=refresh) or from the reminder link on /voyager
  // (?tab=payouts). Without this the traveler finishes at Stripe, comes back,
  // and sees their trips — with no sign anything happened. The param is then
  // stripped so a later refresh doesn't yank them off whatever tab they moved
  // to, matching how the `booking` param is handled below.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const wantsPayouts =
      url.searchParams.has('payouts') ||
      url.searchParams.get('tab') === 'payouts';
    if (!wantsPayouts) return;
    setTab('payouts');
    url.searchParams.delete('payouts');
    url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const [requests, setRequests] = useState<ShippingRequestRow[]>([]);
  const [trips, setTrips] = useState<TravelerTripRow[]>([]);
  const [matches, setMatches] = useState<MatchWithRefs[]>([]);
  const [incomingIntents, setIncomingIntents] = useState<IncomingIntent[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myProposals, setMyProposals] = useState<TravelerProposal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // When the sender accepts a traveler's proposal, we open a Stripe payment
  // modal. The proposal booking is held here while paying.
  const [proposalToPay, setProposalToPay] = useState<MyBooking | null>(null);
  // Incoming request whose details popup is open (opened from the card's
  // "Voir la demande" button OR deep-linked from a notification via ?booking=).
  const [detailsFor, setDetailsFor] = useState<IncomingIntent | null>(null);

  // Accept/decline an incoming request: update status, capture/cancel the
  // Stripe hold, reflect locally. Shared by the trips list and the details
  // popup (from a notification).
  async function handleUpdateIntent(id: string, status: 'confirmed' | 'cancelled') {
    await browser.updateBookingIntentStatus(id, status);
    const intent = incomingIntents.find((i) => i.id === id);
    if (intent?.payment_intent_id) {
      const endpoint = status === 'confirmed' ? 'capture' : 'cancel';
      try {
        await fetch(`/api/stripe/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: intent.payment_intent_id, bookingIntentId: id }),
        });
      } catch (e) {
        console.warn(`Stripe ${endpoint} error:`, e);
      }
    }
    setIncomingIntents((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  }

  // Deep-link from a booking notification: ?booking=<id> opens the request
  // details popup once the incoming requests have loaded.
  useEffect(() => {
    if (typeof window === 'undefined' || detailsFor) return;
    const id = new URLSearchParams(window.location.search).get('booking');
    if (!id) return;
    const found = incomingIntents.find((i) => i.id === id);
    if (found) {
      setDetailsFor(found);
      const url = new URL(window.location.href);
      url.searchParams.delete('booking');
      window.history.replaceState({}, '', url.toString());
    }
  }, [incomingIntents, detailsFor]);

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

  // ─── DISPUTE MODAL (trust & safety) ──────────────────────────────────────
  // Either side of a booking can flag a problem (not delivered, damaged,
  // wrong item, etc.) from the active card. The dispute creation goes
  // through DisputeModal → browser.createDispute (08_trust_and_safety.sql),
  // and the DB trigger auto-restricts the reported user for serious
  // categories. We carry the reporter's role so the modal shows the right
  // list of categories (sender-side vs traveler-side).
  const [disputeFor, setDisputeFor] = useState<{
    bookingId: string;
    reporterRole: 'sender' | 'traveler';
    reportedUserId: string;
    reportedUserName: string;
  } | null>(null);

  // ─── CODE-BASED HANDOFF MODALS (trust & safety) ──────────────────────────
  // Two pairs of code-driven moments in the lifecycle of every booking:
  //   PICKUP — sender shows a 6-digit code at handoff; traveler types it
  //            to mark `pickup_confirmed_at`.
  //   DELIVERY — traveler shows a 6-digit code at drop-off; sender types
  //              it on their side, which we use as the gate before calling
  //              the existing /api/confirm-receipt route.
  // Each modal stays open until the user closes it or the code verifies.

  // Sender opens this to SEE the pickup code and read it aloud to the traveler.
  const [pickupShowingFor, setPickupShowingFor] = useState<{
    bookingId: string;
    code: string;
    travelerName: string;
  } | null>(null);

  // Traveler opens this to TYPE the pickup code spoken by the sender.
  const [pickupEnteringFor, setPickupEnteringFor] = useState<{
    bookingId: string;
    senderName: string;
  } | null>(null);

  // Traveler opens this AFTER uploading delivery proof — shows the
  // delivery code, which they read aloud to the recipient/sender on arrival.
  const [deliveryShowingFor, setDeliveryShowingFor] = useState<{
    bookingId: string;
    code: string;
    senderName: string;
  } | null>(null);

  // Sender opens this to TYPE the delivery code spoken at drop-off.
  // On verify → call existing onConfirmReceipt to capture the payment.
  const [deliveryEnteringFor, setDeliveryEnteringFor] = useState<{
    bookingId: string;
    travelerName: string;
  } | null>(null);

  // ─── REVIEWS (mutual star ratings) ───────────────────────────────────────
  // Once received_confirmed_at is set on a booking, both parties can post a
  // 1-5 star review of the other side. We fetch reviews up-front for the
  // user's known bookings, then keep them in state so "Noter" buttons can
  // lock themselves immediately after a successful submit (no refetch).
  const [reviews, setReviews] = useState<ReviewForBooking[]>([]);

  // Modal control: null when closed, set when an "Noter" button is clicked.
  // Carries everything the modal needs (the booking and who's being reviewed).
  const [reviewing, setReviewing] = useState<{
    bookingIntentId: string;
    reviewedUserId: string;
    reviewedUserName: string;
    reviewedRole: 'sender' | 'traveler';
  } | null>(null);

  // Has the current user already reviewed this booking? Used to swap the
  // "Noter" button for a "Vous avez noté" lock badge.
  function hasReviewed(bookingIntentId: string): boolean {
    if (!user) return false;
    return reviews.some(
      (r) => r.booking_intent_id === bookingIntentId && r.reviewer_id === user.id
    );
  }

  // Did the OTHER party already review me on this booking? Used to surface
  // a small inline preview "X vous a noté ★★★★★" once their review is in.
  function reviewFromOther(bookingIntentId: string): ReviewForBooking | null {
    if (!user) return null;
    return (
      reviews.find(
        (r) =>
          r.booking_intent_id === bookingIntentId &&
          r.reviewer_id !== user.id &&
          r.reviewed_user_id === user.id
      ) ?? null
    );
  }

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
      const otherName = shortName(incoming.sender_profile?.full_name) || t.me2_role_sender;
      setChatTarget({
        bookingIntentId: incoming.id,
        senderId: incoming.sender_id,
        travelerId: user.id,
        otherName,
        otherInitial: nameInitial(incoming.sender_profile?.full_name),
        contextLine: `${cityDisplayName(incoming.pickup_city, locale)} → ${cityDisplayName(incoming.destination_city, locale)}`,
      });
      return;
    }
    const booking = myBookings.find((b) => b.id === chatBookingId);
    if (booking && booking.traveler_profile) {
      const otherName = shortName(booking.traveler_profile.full_name) || t.me2_role_traveler;
      setChatTarget({
        bookingIntentId: booking.id,
        senderId: user.id,
        travelerId: booking.traveler_profile.id,
        otherName,
        otherInitial: nameInitial(booking.traveler_profile.full_name),
        contextLine: `${cityDisplayName(booking.pickup_city, locale)} → ${cityDisplayName(booking.destination_city, locale)}`,
      });
      return;
    }
    const proposal = myProposals.find((p) => p.id === chatBookingId);
    if (proposal && proposal.sender_profile) {
      const otherName = shortName(proposal.sender_profile.full_name) || t.me2_role_sender;
      setChatTarget({
        bookingIntentId: proposal.id,
        senderId: proposal.sender_id,
        travelerId: user.id,
        otherName,
        otherInitial: nameInitial(proposal.sender_profile.full_name),
        contextLine: `${cityDisplayName(proposal.pickup_city, locale)} → ${cityDisplayName(proposal.destination_city, locale)}`,
      });
    }
  }, [dataLoading, user, incomingIntents, myBookings, myProposals, chatTarget]);

  // Fetch reviews for the booking-set the user is involved in. Triggered
  // whenever the data set changes (initial load, or after refresh). We pull
  // both directions (reviews the user wrote + reviews received) by querying
  // on every known booking id; RLS limits what comes back to what's allowed.
  useEffect(() => {
    if (dataLoading || !user) return;
    const allBookingIds = Array.from(
      new Set<string>([
        ...incomingIntents.map((i) => i.id),
        ...myBookings.map((b) => b.id),
        ...myProposals.map((p) => p.id),
      ])
    );
    if (allBookingIds.length === 0) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await browser.listReviewsByBookingIds(allBookingIds);
        if (cancelled) return;
        setReviews(rows);
      } catch (e) {
        console.warn('[me] listReviewsByBookingIds failed:', e);
        if (!cancelled) setReviews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Stringify the id lists in the dep to avoid useless refetches when the
    // refs change but content is the same.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataLoading,
    user,
    incomingIntents.map((i) => i.id).join('|'),
    myBookings.map((b) => b.id).join('|'),
    myProposals.map((p) => p.id).join('|'),
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    setError(null);

    // Per-query timeout. We bumped this from 5s to 12s because Supabase
    // can be slow on cold queries (especially with our RLS policies that
    // need to evaluate joins). 12s is still well under the user's
    // patience but covers ~99% of real-world latencies.
    const withTimeout = <T,>(p: Promise<T>, fallback: T, ms = 12000): Promise<T> =>
      Promise.race([
        p.catch((e) => {
          console.warn('Query failed:', e);
          return fallback;
        }),
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    // Progressive loading: each query updates its own state as soon as
    // it finishes, rather than waiting for the slowest one. The dataLoading
    // flag flips off once the first one returns — after that, we still
    // wait for the others but the user already sees something.
    let firstDone = false;
    const flipLoadingOnce = () => {
      if (!cancelled && !firstDone) {
        firstDone = true;
        setDataLoading(false);
      }
    };

    withTimeout(browser.listMyRequests(user.id), [] as ShippingRequestRow[])
      .then((v) => { if (!cancelled) { setRequests(v); flipLoadingOnce(); } });
    withTimeout(browser.listMyTrips(user.id), [] as TravelerTripRow[])
      .then((v) => { if (!cancelled) { setTrips(v); flipLoadingOnce(); } });
    withTimeout(browser.listMyMatches(user.id), [] as MatchRow[])
      .then((v) => { if (!cancelled) { setMatches(v as MatchWithRefs[]); flipLoadingOnce(); } });
    withTimeout(browser.listIncomingBookingIntents(user.id), [])
      .then((v) => { if (!cancelled) { setIncomingIntents(v as IncomingIntent[]); flipLoadingOnce(); } });
    withTimeout(browser.listMyBookings(user.id), [])
      .then((v) => { if (!cancelled) { setMyBookings(v as MyBooking[]); flipLoadingOnce(); } });
    withTimeout(browser.listMyTravelerProposals(user.id), [])
      .then((v) => { if (!cancelled) { setMyProposals(v as TravelerProposal[]); flipLoadingOnce(); } });

    // Hard ceiling: even if every single query hangs, never leave the
    // spinner up past 15 seconds. At that point we show whatever we have.
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setDataLoading(false);
    }, 15000);

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

  const TABS: { id: TabId; label: string; icon: typeof Plane }[] = [
    { id: 'trips', label: t.me2_tab_trips, icon: Plane },
    { id: 'sends', label: t.me2_tab_sends, icon: Package },
    { id: 'payouts', label: t.me2_tab_payouts, icon: Wallet },
    { id: 'profile', label: t.me_tab_profile, icon: User },
  ];

  const initial = profile?.full_name
    ? nameInitial(profile.full_name)
    : (user.email?.charAt(0).toUpperCase() ?? '·');

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="px-6 sm:px-8 lg:px-10">
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
              {titleCaseName(profile?.full_name) || t.me_title}
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
                  onUpdateIntent={handleUpdateIntent}
                  onProofUploaded={(id, url, receiverName) => {
                    const patch = {
                      delivery_proof_url: url,
                      delivery_proof_uploaded_at: new Date().toISOString(),
                      delivery_proof_receiver_name: receiverName || null,
                    };
                    // The row lives in incomingIntents (sender-booked) OR
                    // myProposals (traveler-initiated, now accepted); patch by
                    // id in both — it only exists in one.
                    setIncomingIntents((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
                    );
                    setMyProposals((prev) =>
                      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
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
                      otherName: shortName(intent.sender_profile?.full_name) || t.me2_role_sender,
                      otherInitial: nameInitial(intent.sender_profile?.full_name),
                      contextLine: `${cityDisplayName(intent.pickup_city, locale)} → ${cityDisplayName(intent.destination_city, locale)}`,
                    });
                  }}
                  onReportProblem={(intent) => {
                    // Traveler reports the sender on this incoming booking.
                    setDisputeFor({
                      bookingId: intent.id,
                      reporterRole: 'traveler',
                      reportedUserId: intent.sender_id,
                      reportedUserName:
                        shortName(intent.sender_profile?.full_name) || t.me2_role_sender_lc,
                    });
                  }}
                  onEnterPickupCode={(intent) => {
                    // Traveler (receiver) SHOWS their pickup code; the sender
                    // enters it to confirm the handover. This way the code is
                    // held by the person receiving the parcel, so they can't
                    // later deny having received it. (Prop name kept for
                    // backward compatibility.)
                    if (!intent.pickup_code) {
                      alert(t.me2_pickup_code_unavailable);
                      return;
                    }
                    setPickupShowingFor({
                      bookingId: intent.id,
                      code: intent.pickup_code,
                      // Name shown = the person you read the code to (sender).
                      travelerName:
                        shortName(intent.sender_profile?.full_name) || t.me2_role_sender_lc,
                    });
                  }}
                  onShowDeliveryCode={(intent) => {
                    // Traveler ENTERS the code the recipient (sender or their
                    // relative) gives them at drop-off, to confirm delivery.
                    // (Prop name kept for backward compatibility.)
                    setDeliveryEnteringFor({
                      bookingId: intent.id,
                      travelerName:
                        shortName(intent.sender_profile?.full_name) || t.me2_role_sender_lc,
                    });
                  }}
                  onOpenReview={(intent) => {
                    // Traveler rates the sender. Reviewable only once
                    // received_confirmed_at is set; the card guards that.
                    setReviewing({
                      bookingIntentId: intent.id,
                      reviewedUserId: intent.sender_id,
                      reviewedUserName:
                        shortName(intent.sender_profile?.full_name) || t.me2_role_sender,
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
                      otherName: shortName(booking.traveler_profile.full_name) || t.me2_role_traveler,
                      otherInitial: nameInitial(booking.traveler_profile.full_name),
                      contextLine: `${cityDisplayName(booking.pickup_city, locale)} → ${cityDisplayName(booking.destination_city, locale)}`,
                    });
                  }}
                  onReportProblem={(booking) => {
                    // Sender reports the traveler on this booking.
                    if (!booking.traveler_profile) return;
                    setDisputeFor({
                      bookingId: booking.id,
                      reporterRole: 'sender',
                      reportedUserId: booking.traveler_profile.id,
                      reportedUserName:
                        shortName(booking.traveler_profile.full_name) || t.me2_role_traveler_lc,
                    });
                  }}
                  onShowPickupCode={(booking) => {
                    // Sender (hander) ENTERS the code the traveler shows them,
                    // to confirm the handover. (Prop name kept for backward
                    // compatibility.)
                    setPickupEnteringFor({
                      bookingId: booking.id,
                      // Name shown = whose code you're entering (the traveler).
                      senderName:
                        shortName(booking.traveler_profile?.full_name) || t.me2_role_traveler_lc,
                    });
                  }}
                  onEnterDeliveryCode={(booking) => {
                    // Sender (recipient side) SHOWS/holds the delivery code; the
                    // traveler enters it. Share it with a relative if they
                    // receive on your behalf. (Prop name kept for compat.)
                    if (!booking.delivery_code) {
                      alert(t.me2_delivery_code_unavailable);
                      return;
                    }
                    setDeliveryShowingFor({
                      bookingId: booking.id,
                      code: booking.delivery_code,
                      senderName:
                        shortName(booking.traveler_profile?.full_name) || t.me2_role_traveler_lc,
                    });
                  }}
                  onOpenReview={(booking) => {
                    // Sender rates the traveler. Reviewable only once
                    // received_confirmed_at is set; the card guards that.
                    if (!booking.traveler_profile) return;
                    setReviewing({
                      bookingIntentId: booking.id,
                      reviewedUserId: booking.traveler_profile.id,
                      reviewedUserName:
                        shortName(booking.traveler_profile.full_name) || t.me2_role_traveler_lc,
                      reviewedRole: 'traveler',
                    });
                  }}
                  hasReviewed={hasReviewed}
                  reviewFromOther={reviewFromOther}
                  t={t}
                />
              )}

              {tab === 'payouts' && (
                <div className="max-w-xl">
                  <div className="bg-cream-100 rounded-2xl p-7 border border-ink-50">
                    <Wallet className="w-6 h-6 text-ink-500 mb-5" strokeWidth={1.75} />
                    <h3 className="text-lg font-bold text-ink-600 mb-4 tracking-[-0.015em]">
                      {t.payout_setup_title}
                    </h3>
                    <PayoutStatusCard />
                  </div>

                  {/* The only way into /wallet now that the header pill is
                      gone. It belongs here rather than in the top bar: nobody
                      needs their earnings on every page, but everybody looking
                      at their payout settings is thinking about them. */}
                  <Link
                    href="/wallet"
                    className="mt-4 inline-flex items-center gap-2 text-[13px] text-ink-600 underline underline-offset-2"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {locale === 'en' ? 'See my earnings' : 'Voir mes gains'}
                  </Link>
                </div>
              )}

              {tab === 'profile' && (
                <ProfileTab
                  profile={profile}
                  email={user.email ?? ''}
                  onProfileUpdated={refreshProfile}
                  t={t}
                  locale={locale}
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

      {/* Dispute modal — "Signaler un problème" from either side of a
          booking. Creates a row in `disputes`; a DB trigger auto-restricts
          the reported user when the category is serious (08_trust_and_safety.sql). */}
      <AnimatePresence>
        {disputeFor && user && (
          <DisputeModal
            open
            bookingId={disputeFor.bookingId}
            reporterId={user.id}
            reporterRole={disputeFor.reporterRole}
            reportedUserId={disputeFor.reportedUserId}
            reportedUserName={disputeFor.reportedUserName}
            onClose={() => setDisputeFor(null)}
            onSuccess={() => {
              // We could optimistically reflect the disputed state on the
              // booking card here, but for the MVP we just close and let
              // the next refresh pull the latest from DB.
              setDisputeFor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Incoming request details popup (from a card or a notification). */}
      {detailsFor && (
        <RequestDetailsModal
          intent={detailsFor}
          tripDepartureDate={trips.find((tr) => tr.id === detailsFor.traveler_trip_id)?.departure_date}
          tripCategories={(() => {
            const tr = trips.find((x) => x.id === detailsFor.traveler_trip_id);
            return tr ? acceptedCategories(tr) : undefined;
          })()}
          onClose={() => setDetailsFor(null)}
          onAccept={async () => {
            const id = detailsFor.id;
            setDetailsFor(null);
            await handleUpdateIntent(id, 'confirmed');
          }}
          onDecline={async () => {
            const id = detailsFor.id;
            setDetailsFor(null);
            await handleUpdateIntent(id, 'cancelled');
          }}
        />
      )}

      {/* PICKUP code — SHOW side (sender reads the code aloud) */}
      <PickupShowCodeModal
        open={!!pickupShowingFor}
        code={pickupShowingFor?.code ?? ''}
        travelerName={pickupShowingFor?.travelerName ?? ''}
        onClose={() => setPickupShowingFor(null)}
      />

      {/* PICKUP code — ENTER side (traveler types it). On success, the
          modal sets pickup_confirmed_at via browser.confirmPickupWithCode,
          then we optimistically update local state so the UI flips out of
          the "in progress" view. */}
      <PickupEnterCodeModal
        open={!!pickupEnteringFor}
        bookingId={pickupEnteringFor?.bookingId ?? ''}
        travelerId={user?.id ?? ''}
        senderName={pickupEnteringFor?.senderName ?? ''}
        onClose={() => setPickupEnteringFor(null)}
        onSuccess={() => {
          if (!pickupEnteringFor || !user) return;
          const stamp = new Date().toISOString();
          const patch = { pickup_confirmed_at: stamp, pickup_confirmed_by: user.id };
          // The sender confirms from their bookings list; also patch the
          // traveler-side lists in case the same row is present.
          setMyBookings((prev) =>
            prev.map((b) => (b.id === pickupEnteringFor.bookingId ? { ...b, ...patch } : b))
          );
          setIncomingIntents((prev) =>
            prev.map((it) => (it.id === pickupEnteringFor.bookingId ? { ...it, ...patch } : it))
          );
          setMyProposals((prev) =>
            prev.map((it) => (it.id === pickupEnteringFor.bookingId ? { ...it, ...patch } : it))
          );
          setPickupEnteringFor(null);
        }}
      />

      {/* DELIVERY code — SHOW side (traveler reads it aloud at drop-off) */}
      <PickupShowCodeModal
        open={!!deliveryShowingFor}
        code={deliveryShowingFor?.code ?? ''}
        travelerName={deliveryShowingFor?.senderName ?? ''}
        mode="delivery"
        onClose={() => setDeliveryShowingFor(null)}
      />

      {/* DELIVERY code — ENTER side (sender types it).
          We pass mode='delivery' so the modal calls confirmDeliveryWithCode
          instead of confirmPickupWithCode. On success → call the existing
          /api/confirm-receipt route which captures the Stripe
          authorization and sets received_confirmed_at server-side. We
          ALSO optimistically update local state so the UI doesn't wait
          for a refetch. */}
      <PickupEnterCodeModal
        open={!!deliveryEnteringFor}
        bookingId={deliveryEnteringFor?.bookingId ?? ''}
        travelerId={user?.id ?? ''}
        senderName={deliveryEnteringFor?.travelerName ?? ''}
        mode="delivery"
        onClose={() => setDeliveryEnteringFor(null)}
        onSuccess={async () => {
          if (!deliveryEnteringFor) return;
          // The traveler entered the recipient's code; /api/confirm-receipt
          // verified it, recorded receipt and captured the payment. Reflect it
          // optimistically across whichever list holds this booking.
          const stamp = new Date().toISOString();
          const patch = { received_confirmed_at: stamp, payment_status: 'captured' as const };
          setIncomingIntents((prev) =>
            prev.map((it) => (it.id === deliveryEnteringFor.bookingId ? { ...it, ...patch } : it))
          );
          setMyProposals((prev) =>
            prev.map((it) => (it.id === deliveryEnteringFor.bookingId ? { ...it, ...patch } : it))
          );
          setMyBookings((prev) =>
            prev.map((b) => (b.id === deliveryEnteringFor.bookingId ? { ...b, ...patch } : b))
          );
          setDeliveryEnteringFor(null);
        }}
      />

      {/* Review modal — opened from any card once the booking is fully
          received. Submits a star + optional comment; on success we
          optimistically insert into local `reviews` state so the calling
          card's "Noter" button flips to "Vous avez noté" without a
          refetch. The DB trigger has already recomputed the user's
          average rating server-side. */}
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
              {t.me2_wallet_label}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl lg:text-6xl font-extrabold tracking-[-0.025em] num-display">
                {walletEuros.toFixed(2)}
              </span>
              <span className="text-2xl font-medium text-cream-200/90">€</span>
            </div>
            <p className="text-[14px] text-cream-200/70 mt-3 max-w-md leading-relaxed">
              {walletEuros > 0
                ? t.me2_wallet_total_received
                : t.me2_wallet_empty_hint}
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2">
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cream-50 hover:bg-cream-100 text-ink-600 font-semibold text-[14px] transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {t.me2_withdraw_earnings}
            </button>
            <span className="text-[11px] text-cream-200/60 italic">
              🔧 {t.me2_coming_soon}
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
                {t.me2_withdraw_modal_title}
              </h3>
              <p className="text-[15px] text-ink-400 leading-relaxed mb-6">
                {t.me2_withdraw_modal_text}
              </p>
              <div className="rounded-xl bg-white border border-ink-50 px-4 py-3 mb-6 text-[14px] text-ink-500">
                <div className="text-[11px] font-semibold text-ink-300 tracking-[0.06em] uppercase mb-1">
                  {t.me2_your_balance}
                </div>
                <div className="text-3xl font-extrabold text-ink-600 num-display tracking-[-0.02em]">
                  {walletEuros.toFixed(2)}€
                </div>
              </div>
              <p className="text-[13px] text-ink-400 mb-6">
                {t.me2_withdraw_question}{' '}
                <a href="mailto:hello@jibly.io" className="font-semibold text-ink-600 underline">
                  hello@jibly.io
                </a>
              </p>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 font-semibold text-[14px] transition-colors"
              >
                {t.me2_got_it}
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
  item_title: string | null;
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
  delivery_early_reason?: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  traveler_user_id: string | null;
  // Trust & safety fields (08_trust_and_safety.sql)
  pickup_code?: string | null;
  delivery_code?: string | null;
  pickup_confirmed_at?: string | null;
  pickup_confirmed_by?: string | null;
  received_confirmed_at?: string | null;
  sender_profile: { id: string; full_name: string | null; avatar_url: string | null; phone: string | null; verification_level: VerificationLevel; rating: number; trips_completed: number } | null;
};

// MyBooking type = a booking_intent created by ME, enriched with the trip + traveler profile
type MyBooking = {
  id: string;
  sender_id: string;
  traveler_trip_id: string | null;
  item_category: string;
  item_title: string | null;
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
  delivery_early_reason?: string | null;
  shipping_request_id: string | null;
  traveler_message: string | null;
  initiated_by: 'sender' | 'traveler';
  // Trust & safety fields (08_trust_and_safety.sql)
  pickup_code?: string | null;
  delivery_code?: string | null;
  pickup_confirmed_at?: string | null;
  pickup_confirmed_by?: string | null;
  received_confirmed_at?: string | null;
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
            {t.me2_my_reservations}
          </h2>
          <p className="text-[14px] text-ink-400 mb-6">
            {t.me2_my_reservations_subtitle}
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
  onReportProblem,
  onShowPickupCode,
  onEnterDeliveryCode,
  onOpenReview,
  hasReviewed,
  otherReview,
  t,
}: {
  booking: MyBooking;
  onAcceptProposal?: (b: MyBooking) => void;
  onDeclineProposal?: (id: string) => void;
  onOpenChat?: (b: MyBooking) => void;
  onReportProblem?: (b: MyBooking) => void;
  onShowPickupCode?: (b: MyBooking) => void;
  onEnterDeliveryCode?: (b: MyBooking) => void;
  onOpenReview?: (b: MyBooking) => void;
  hasReviewed?: boolean;
  otherReview?: ReviewForBooking | null;
  t: Translations;
}) {
  const { locale } = useI18n();
  const cat = ITEM_CATEGORIES.find((c) => c.value === (booking.item_category as ItemCategory));
  const trip = booking.traveler_trip;
  const traveler = booking.traveler_profile;
  const travelerName = shortName(traveler?.full_name) || t.me2_role_traveler;
  const initial = nameInitial(traveler?.full_name);

  // "X accepted!" is a one-time celebration: show it as a popup the first
  // time the sender sees this booking as confirmed, then never again (gated
  // per booking in localStorage). Keeps the card itself light.
  const [showAcceptedPopup, setShowAcceptedPopup] = useState(false);
  useEffect(() => {
    if (booking.status !== 'confirmed' || booking.delivery_proof_url) return;
    const key = `jibly:booking-accepted-seen:${booking.id}`;
    try {
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
      setShowAcceptedPopup(true);
    } catch {
      /* private mode etc. — just skip the popup */
    }
  }, [booking.id, booking.status, booking.delivery_proof_url]);

  // Use Supabase auth.users email — we don't have it on the public profile
  // (RLS hides emails). For the contact info to be visible the simplest
  // path is to expose `phone` only, plus a "send a message" mailto via
  // a server route. We'll show the phone if set, and a generic message
  // otherwise — see the "Contact" block below.

  // Confirmed (any phase, up to fully received) → full detailed view with the
  // progress journey. We intentionally do NOT collapse to a compact card once
  // delivered, so the sender and the traveler always see the same level of
  // detail (symmetry). Post-delivery actions (confirm reception, rate) live
  // inside this view.
  if (booking.status === 'confirmed') {
    return (
      <>
      <div className="bg-white rounded-2xl border border-mint-200 overflow-hidden">
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
                <span>{cityDisplayName(booking.pickup_city, locale)} → {cityDisplayName(booking.destination_city, locale)}</span>
                <span>·</span>
                <span>{trip && formatShortDate(trip.departure_date)}</span>
                <span>·</span>
                <span>{cat ? t[cat.labelKey] : booking.item_category}</span>
                <span>·</span>
                <span className="font-semibold text-ink-600">{booking.proposed_price}€</span>
              </div>
            </div>
            {/* Single contact channel — Message right next to the name.
                Everything stays on Jibly (traceable, dispute-protected). */}
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(booking)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[13px] font-semibold transition-colors"
              >
                💬 {t.me2_message}
              </button>
            )}
          </div>

          {/* Progress journey — role-aware reminders (sender side) */}
          <div className="mb-4">
            <ShipmentJourney
              booking={booking}
              role="sender"
              otherFirstName={travelerName.split(' ')[0]}
              departureDate={trip?.departure_date}
              t={t}
            />
          </div>

          {/* Delivery proof — visible only once the traveler has uploaded one */}
          {booking.delivery_proof_url && (
            <div className="rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📸</span>
                {/* Compact: a small link that opens the photo in a popup,
                    instead of a big inline thumbnail. */}
                <ViewProofButton
                  url={booking.delivery_proof_url}
                  label={t.me2_delivery_proof}
                  className="text-[13px] font-semibold text-mint-700 hover:text-mint-800 underline"
                />
              </div>
              {booking.delivery_proof_receiver_name && (
                <div className="text-[13px] text-ink-500 mb-1">
                  <span className="text-ink-400">{t.me2_handed_to}</span>{' '}
                  <strong className="text-ink-600">{booking.delivery_proof_receiver_name}</strong>
                </div>
              )}
              {booking.delivery_proof_notes && (
                <div className="text-[13px] text-ink-500 leading-relaxed mt-1">
                  <span className="text-ink-400">{t.me2_note_label}</span> « {booking.delivery_proof_notes} »
                </div>
              )}
              {booking.delivery_early_reason && (
                <div className="text-[13px] text-ink-500 leading-relaxed mt-1">
                  <span className="text-ink-400">{t.me2_early_reason_label}</span> « {booking.delivery_early_reason} »
                </div>
              )}
              {booking.delivery_proof_uploaded_at && (
                <div className="text-[11px] text-ink-300 mt-2">
                  {t.me2_uploaded_on.replace('{date}', formatShortDate(booking.delivery_proof_uploaded_at))}
                </div>
              )}
            </div>
          )}

          {/* Delivery code — the recipient side (you, or a relative receiving
              on your behalf) holds this code and gives it to the traveler, who
              enters it to confirm delivery and release the payment. Tap to see
              it (and share it with your relative if they receive for you). */}
          {booking.pickup_confirmed_at && !booking.received_confirmed_at && onEnterDeliveryCode && (
            <button
              type="button"
              onClick={() => onEnterDeliveryCode(booking)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[13px] font-semibold transition-colors mt-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t.me2_view_delivery_code}
            </button>
          )}

          {/* Once reception is confirmed, the sender can rate the traveler. */}
          {booking.received_confirmed_at && onOpenReview && (
            <div className="mt-2 flex justify-end">
              {!hasReviewed ? (
                <button
                  type="button"
                  onClick={() => onOpenReview(booking)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[12px] font-semibold transition-colors"
                >
                  <Star className="w-3 h-3 fill-white" strokeWidth={0} />
                  {t.me2_rate}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[11px] font-semibold">
                  <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                  {t.me2_you_rated}
                </span>
              )}
            </div>
          )}

          {/* Traveler's review of the sender, when posted */}
          {otherReview && (
            <div className="mt-2 text-[12px] text-ink-400 flex items-center gap-1.5 flex-wrap">
              <span>{t.me2_x_rated_you.replace('{name}', travelerName.split(' ')[0])}</span>
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

          {/* Pickup code block — sender's side of the trust handoff.
              Visible only BEFORE the traveler has confirmed pickup. Once
              they have, the code has no use anymore and we hide the block
              to declutter the card. */}
          {onShowPickupCode && !booking.pickup_confirmed_at && (
            <div className="rounded-xl bg-lavender-50/60 border border-lavender-200/60 px-4 py-3 mt-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-lavender-100 flex items-center justify-center">
                  <KeyRound className="w-4 h-4 text-lavender-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink-600 leading-tight">
                    {t.me2_handoff_code_title}
                  </div>
                  <div className="text-[12px] text-ink-500 leading-snug mt-0.5">
                    {t.me2_handoff_code_desc.replace('{name}', travelerName.split(' ')[0])}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onShowPickupCode(booking)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[12px] font-semibold transition-colors"
                >
                  {t.me2_view_code}
                </button>
              </div>
            </div>
          )}

          {/* "Remis ✓" status — once the traveler has typed the code on
              their side, we surface that visually so the sender knows
              the package is now on its way. */}
          {booking.pickup_confirmed_at && !booking.delivery_proof_url && (
            <div className="rounded-xl bg-mint-50 border border-mint-200/60 px-4 py-3 mt-3 flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-mint-700 flex-shrink-0" />
              <div className="text-[13px] font-semibold text-mint-700">
                {t.me2_package_handed_to.replace('{name}', travelerName.split(' ')[0])} ✓
              </div>
            </div>
          )}

          {/* Trust & safety — discreet "Signaler un problème" link.
              Subtle by design: we don't want to encourage misuse, but it
              must be one click away if something genuinely goes wrong. */}
          {onReportProblem && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onReportProblem(booking)}
                className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-blush-500 transition-colors"
              >
                <Flag className="w-3 h-3" strokeWidth={1.75} />
                {t.me2_report_problem}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* One-time "X accepted!" celebration — shown once, then dismissed. */}
      <AnimatePresence>
        {showAcceptedPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => setShowAcceptedPopup(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-cream-50 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">
                {t.me2_x_accepted.replace('{name}', travelerName.split(' ')[0])}
              </h3>
              <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
                {t.me2_arrange_transport_details}
              </p>
              <button
                onClick={() => setShowAcceptedPopup(false)}
                className="w-full px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
              >
                {t.common_close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>
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
          <span className="text-ink-500 truncate">{cityDisplayName(booking.pickup_city, locale)} → {cityDisplayName(booking.destination_city, locale)}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-ink-600 num-display">{formatEuros(booking.proposed_price)}</span>
          {isTravelerProposal && (
            <span className="text-[11px] text-lavender-600 ml-1">✨ {t.me2_status_new}</span>
          )}
          {booking.status === 'pending' && !isTravelerProposal && (
            <span className="text-[11px] text-ink-300 ml-1">⏳ {t.me2_status_pending}</span>
          )}
          {booking.status === 'cancelled' && (
            <span className="text-[11px] text-ink-300 ml-1">✕ {t.me2_status_declined}</span>
          )}
        </div>

        {/* Actions inline */}
        {isTravelerProposal && onAcceptProposal && onDeclineProposal && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onDeclineProposal(booking.id)}
              className="px-3 py-1.5 text-[12px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
            >
              {t.me2_decline}
            </button>
            <button
              onClick={() => onAcceptProposal(booking)}
              className="px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors"
            >
              {t.me2_pay.replace('{amount}', formatEuros(booking.proposed_price))}
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
  const { locale } = useI18n();
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
              <span>{cityDisplayName(request.pickup_city, locale)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-ink-300" />
              <span>{cityDisplayName(request.destination_city, locale)}</span>
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
  const { locale } = useI18n();
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
      setErr(e?.message ?? t.me2_cancel_failed);
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
            <span className="font-semibold text-ink-600">{cityDisplayName(trip.departure_city, locale)} → {cityDisplayName(trip.arrival_city, locale)}</span>
            <span className="text-ink-300">·</span>
            <span className="text-ink-500 num-display">{formatShortDate(trip.departure_date)}</span>
            <span className="text-ink-300">·</span>
            <span className="text-ink-500">{t.me2_from_price.replace('{amount}', String(trip.compensation_min))}</span>
          </div>
          <button
            type="button"
            onClick={openCancelModal}
            className="flex-shrink-0 p-1.5 rounded-full text-ink-300 hover:text-blush-500 hover:bg-blush-50 transition-colors"
            aria-label={t.me2_cancel_trip}
            title={t.me2_cancel_trip}
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
                    {t.me2_cancel_trip_q}
                  </h3>
                  <p className="text-[14px] text-ink-500 leading-relaxed">
                    {cityDisplayName(trip.departure_city, locale)} → {cityDisplayName(trip.arrival_city, locale)} · {formatShortDate(trip.departure_date)}
                  </p>
                </div>
              </div>

              {/* Booking warning */}
              {loadingBookings ? (
                <div className="rounded-xl bg-cream-100 px-4 py-3 mb-5 text-[13px] text-ink-400 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.me2_checking_bookings}
                </div>
              ) : activeBookings && activeBookings > 0 ? (
                <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 mb-5 text-[13px] text-ink-500 leading-relaxed">
                  <strong className="text-ink-600">
                    {activeBookings === 1
                      ? t.me2_one_booking_in_progress
                      : t.me2_n_bookings_in_progress.replace('{n}', String(activeBookings))}
                  </strong>
                  <br />
                  {t.me2_bookings_auto_cancel_before}<strong>{t.me2_bookings_auto_cancel_bold}</strong>{t.me2_bookings_auto_cancel_after}
                </div>
              ) : (
                <p className="text-[14px] text-ink-400 mb-5 leading-relaxed">
                  {t.me2_cancel_trip_final}
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
                  {t.me2_keep_trip}
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-blush-500 hover:bg-blush-600 disabled:opacity-50 rounded-full transition-colors"
                >
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {cancelling ? t.me2_cancelling : t.me2_confirm_cancel}
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
            {t.me2_my_proposals_sent}
          </h2>
          <p className="text-[14px] text-ink-400 mb-7">
            {t.me2_my_proposals_sent_subtitle}
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
          {t.me2_requests_received}
        </h2>
        <p className="text-[14px] text-ink-400 mb-7">
          {t.me2_requests_received_subtitle}
        </p>
        {pending.length === 0 ? (
          <EmptyState message={t.me2_no_pending_requests} />
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
            {t.me2_to_deliver}
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
            {t.me2_history}
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
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const senderName = shortName(intent.sender_profile?.full_name) || t.me2_role_someone;
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
          <span className="text-ink-500 truncate">{cityDisplayName(intent.pickup_city, locale)} → {cityDisplayName(intent.destination_city, locale)}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-mint-600 num-display">{formatEuros(travelerNetFromTotal(intent.proposed_price))}</span>
          {intent.payment_status === 'authorized' && !historic && (
            <span className="text-[11px] text-mint-600 ml-1">💳</span>
          )}
          {intent.payment_status === 'captured' && historic && (
            <span className="text-[11px] text-mint-600 ml-1">✓ {t.me2_status_cashed_in}</span>
          )}
          {historic && intent.delivery_proof_url && (
            <span className="text-[11px] text-mint-600 ml-1">📸 {t.me2_status_delivered}</span>
          )}
          {historic && !intent.delivery_proof_url && intent.status === 'confirmed' && (
            <span className="text-[11px] text-mint-500 ml-1">✓ {t.me2_status_accepted}</span>
          )}
          {historic && !intent.delivery_proof_url && intent.status === 'cancelled' && (
            <span className="text-[11px] text-ink-300 ml-1">✕ {t.me2_status_declined}</span>
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
              {busy === 'cancel' ? '...' : t.me2_decline}
            </button>
            <button
              onClick={() => handle('confirmed')}
              disabled={!!busy}
              className="px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50"
            >
              {busy === 'confirm' ? '...' : t.me2_accept}
            </button>
          </div>
        )}

        {!historic && showDeliverButton && (
          <>
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(intent)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
                aria-label={t.me2_open_conversation}
                title={t.me2_messages}
              >
                💬
              </button>
            )}
            <button
              onClick={() => setShowProofModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors"
            >
              <Camera className="w-3 h-3" />
              {t.me2_i_delivered}
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
  const { locale } = useI18n();
  const req = match.shipping_request;
  return (
    <div className="bg-white rounded-2xl p-5 border border-ink-50">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center text-ink-500">
          <Package className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink-600 text-[15px]">
            {req ? `${cityDisplayName(req.pickup_city, locale)} → ${cityDisplayName(req.destination_city, locale)}` : `Match #${match.id.slice(0, 6)}`}
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
  locale,
}: {
  profile: Profile | null;
  email: string;
  onProfileUpdated: () => Promise<void>;
  t: Translations;
  locale: string;
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
        // The API returns a human-readable `message` for expected cases (e.g.
        // an active obligation blocking deletion); fall back to `error`.
        throw new Error(body.message || body.error || 'Failed');
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
        // Normalised here as well as on blur: the blur handler can be skipped
        // by submitting with the keyboard, and this is the value that gets
        // shown to every other user.
        full_name: titleCaseName(fullName.trim()) || null,
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
              {titleCaseName(fullName) || email}
            </div>
            {profile && (
              <div className="mt-1.5">
                <VerificationBadge level={profile.verification_level} />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Locked once identity is verified: this name was checked against a
              government document, and letting someone edit it afterwards means
              the name a sender sees no longer matches the one that was
              verified — which is the entire value of the badge beside it.
              Before verification it stays editable, but is normalised on save
              so nobody appears as "YASSINE" or "yassine". */}
          {profile?.identity_verified_at ? (
            <div>
              <label className="block text-[13px] font-medium text-ink-500 mb-2">
                {t.me_profile_name}
              </label>
              <div className="px-4 py-3 rounded-xl bg-cream-100 text-[15px] text-ink-500">
                {titleCaseName(fullName)}
              </div>
              <p className="mt-1.5 text-[12px] text-ink-400">
                {locale === 'en'
                  ? 'Matches your verified ID and cannot be changed.'
                  : 'Correspond à votre pièce d’identité vérifiée et ne peut pas être modifié.'}
              </p>
            </div>
          ) : (
            <Input
              label={t.me_profile_name}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setFullName(titleCaseName(fullName))}
              placeholder="Salma El Amrani"
            />
          )}
          <div>
            <label className="block text-[13px] font-medium text-ink-500 mb-2">{t.me_profile_email}</label>
            <div className="px-4 py-3 rounded-xl bg-cream-100 text-[15px] text-ink-500">{email}</div>
          </div>
          <Input
            label={t.me_profile_phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            hint={t.me2_phone_hint}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t.me2_city}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
            />
            <Input
              label={t.me2_country}
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
              {t.me2_saved}
            </span>
          )}
        </div>
      </form>

    <div className="bg-cream-100 rounded-2xl p-7 border border-ink-50">
        <ShieldCheck className="w-6 h-6 text-ink-500 mb-5" strokeWidth={1.75} />
        <h3 className="text-lg font-bold text-ink-600 mb-4 tracking-[-0.015em]">
          {t.me2_verify_identity_title}
        </h3>
        <p className="text-[13px] text-ink-400 leading-relaxed mb-5">
          <strong className="text-ink-600">{t.me2_mandatory}</strong> {t.me2_verify_identity_desc}
        </p>
        <div className="space-y-2.5 mb-6">
          <CheckRow label={t.verif_email} done />
          <CheckRow
            label={t.me2_id_verified_label}
            done={!!profile?.identity_verified_at}
          />
        </div>
        {profile?.identity_verified_at ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-mint-50 text-mint-700 text-[13px] font-semibold w-full justify-center">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
            {t.me2_identity_verified}
          </div>
        ) : (
          <VerifyIdentityButton />
        )}
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
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Once the card is authorised we show a confirmation screen instead of
  // closing instantly, then sync the parent on the CTA / close.
  const [paidIntentId, setPaidIntentId] = useState<string | null>(null);

  const traveler = booking.traveler_profile;
  const travelerName = shortName(traveler?.full_name) || t.me2_role_traveler;

  async function handleAuthorized(paymentIntentId: string) {
    setBusy(true);
    setErr(null);
    try {
      // Record the authorisation server-side: it verifies the PaymentIntent
      // with Stripe and writes the money columns (status/payment_status/
      // payment_amount) with the service-role client. The browser is not
      // allowed to write those columns directly.
      const res = await fetch('/api/booking/record-authorization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIntentId: booking.id, paymentIntentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t.me2_update_failed);
      }
      setPaidIntentId(paymentIntentId);
    } catch (e: any) {
      setErr(e?.message ?? t.me2_update_failed);
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
      onClick={() => {
        if (busy) return;
        paidIntentId ? onSuccess(paidIntentId) : onClose();
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {paidIntentId ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">
              {t.pay_success_title}
            </h3>
            <p className="text-[15px] text-ink-400 mb-7 leading-relaxed">
              {t.pay_success_text}
            </p>
            <Button fullWidth onClick={() => onSuccess(paidIntentId)}>
              {t.pay_success_cta}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
                  {t.me2_confirm_and_pay}
                </div>
                <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
                  {formatEuros(booking.proposed_price)}
                </h2>
                <div className="text-[13px] text-ink-400 mt-1.5">
                  {t.me2_with_traveler.replace('{name}', travelerName)} · {cityDisplayName(booking.pickup_city, locale)} → {cityDisplayName(booking.destination_city, locale)}
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
              description={`Jibly · ${cityDisplayName(booking.pickup_city, locale)} → ${cityDisplayName(booking.destination_city, locale)}`}
              onAuthorized={handleAuthorized}
              onCancel={onClose}
            />
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ===========================================================================
// ProposalCard — what the traveler sees in /me → Matches
// ---------------------------------------------------------------------------
// I (Yassine) responded to Wafae's public request. Now I'm waiting to see if
// she accepts. This card shows the proposal recap + status. Once accepted,
// coordination happens through in-app chat; delivery proof is uploaded later
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
  const { t, locale } = useI18n();
  const senderName = shortName(proposal.sender_profile?.full_name) || t.me2_role_sender;
  const initial = nameInitial(proposal.sender_profile?.full_name);
  // What I will actually receive — see travelerNetFromTotal.
  const netTraveler = travelerNetFromTotal(proposal.proposed_price);

  return (
    <div className={`bg-white rounded-xl px-3 py-2.5 border ${accepted ? 'border-mint-200' : 'border-ink-50'}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[12px] text-ink-500">
          {initial}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] flex-wrap">
          <span className="font-semibold text-ink-600">{senderName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500 truncate">{cityDisplayName(proposal.pickup_city, locale)} → {cityDisplayName(proposal.destination_city, locale)}</span>
          <span className="text-ink-300">·</span>
          <span className="font-semibold text-mint-600 num-display">{formatEuros(netTraveler)}</span>
          {accepted ? (
            <span className="text-[11px] text-mint-600 ml-1">✓ {t.me2_status_accepted}</span>
          ) : (
            <span className="text-[11px] text-ink-300 ml-1">⏳ {t.me2_status_pending}</span>
          )}
        </div>

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

// =============================================================================
// MASTER-DETAIL views — restored from prior architecture, merged with current
// trust & safety callbacks (signaler + codes pickup/delivery).
// =============================================================================
// Pattern: master-detail like Airbnb / Gmail.
//   - Desktop: list on the left, detail panel on the right
//   - Mobile : list takes the full screen; tapping an item slides a
//     full-screen overlay with the detail; a back button returns to the list
//
// This block replaces the older GroupHeader / TripsView / TripGroup /
// IntentCardInline / ProposalCardInline / SendsView / CollapsibleSection /
// RequestCardSimple. The pre-master-detail buildout was lost when we
// rebased on an older uploaded source; this file restores it AND keeps the
// trust & safety wiring we just shipped (signaler + pickup/delivery codes).
//
// Reviews system (Star, ReviewModal, hasReviewed, reviewFromOther) was
// also lost. Reintroducing it is a separate pass — for now the master-
// detail does NOT surface "Noter" buttons; we'll add that in a follow-up.
// =============================================================================

// ---------------------------------------------------------------------------
// SHARED — small components used by both Sends and Trips master-detail views
// ---------------------------------------------------------------------------

// A bucket header inside the master list. Small caption + count.
function ListBucketHeader({ label, count, tone = 'default' }: { label: string; count: number; tone?: 'default' | 'urgent' | 'success' }) {
  const toneClass =
    tone === 'urgent' ? 'text-butter-700' : tone === 'success' ? 'text-mint-700' : 'text-ink-400';
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-2">
      <span className={`text-[10px] font-bold tracking-[0.14em] uppercase ${toneClass}`}>
        {label}
      </span>
      <span className="text-[10px] text-ink-300 num-display">({count})</span>
    </div>
  );
}

// A clickable row in the master list. Compact, scannable, with a colored
// dot on the left to signal status at a glance.
function ListRow({
  selected,
  onClick,
  emoji,
  title,
  subtitle,
  rightLabel,
  dotClass,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle: string;
  rightLabel?: string;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start px-3 py-2.5 flex items-center gap-3 transition-colors ${
        selected ? 'bg-lavender-50/80 border-l-2 border-lavender-500' : 'hover:bg-cream-50 border-l-2 border-transparent'
      }`}
    >
      <span className="flex-shrink-0 text-[18px]">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink-600 truncate">{title}</div>
        <div className="text-[12px] text-ink-400 truncate">{subtitle}</div>
      </div>
      {rightLabel && (
        <div className="flex-shrink-0 text-[12px] font-semibold text-ink-500 num-display">{rightLabel}</div>
      )}
      {dotClass && (
        <span className={`flex-shrink-0 w-2 h-2 rounded-full ${dotClass}`} />
      )}
    </button>
  );
}

// Empty-state placeholder shown in the detail panel when nothing is selected
// or the user has no items at all.
function DetailEmpty({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <div className="w-12 h-12 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-4">
          <Inbox className="w-5 h-5 text-ink-300" />
        </div>
        <p className="text-[14px] text-ink-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// Wrapper that lays out master + detail. Desktop: side-by-side. Mobile:
// only one panel visible at a time, controlled by `detailOpen`.
function MasterDetailLayout({
  master,
  detail,
  detailOpen,
  onCloseDetail,
}: {
  master: React.ReactNode;
  detail: React.ReactNode;
  detailOpen: boolean;
  onCloseDetail: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="md:grid md:grid-cols-[320px_1fr] md:gap-4 md:min-h-[600px]">
      {/* Master list */}
      <aside className={`bg-white rounded-2xl border border-ink-50 overflow-hidden ${detailOpen ? 'hidden md:block' : 'block'}`}>
        {master}
      </aside>

      {/* Detail panel — on desktop sits next to master. On mobile,
          slides in over the list as a full-screen sheet. */}
      <section
        className={`bg-white rounded-2xl border border-ink-50 overflow-hidden ${detailOpen ? 'fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col md:relative md:inset-auto md:top-auto md:z-auto md:block' : 'hidden md:block'}`}
      >
        {/* Mobile back bar — only visible when detail is open on mobile */}
        <div className="md:hidden flex items-center gap-2 px-3 py-3 border-b border-ink-50 bg-cream-50 flex-shrink-0">
          <button
            type="button"
            onClick={onCloseDetail}
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-500 hover:text-ink-600"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.me2_back}
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 md:flex-none md:max-h-[80vh]">
          {detail}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SENDS — master list of booking_intents I sent, detail panel for the picked one
// ---------------------------------------------------------------------------
// Buckets, in the order they appear:
//   🔥 À traiter — proposals to accept/pay, OR proof uploaded I need to confirm
//   ⏳ En cours  — paid + accepted, in transit (no proof yet)
//   ✓ Livrés   — confirmed received (fully closed)
//   🔍 En recherche — public requests with no traveler yet
//   ❌ Annulés
// ---------------------------------------------------------------------------

type SendItem =
  | { kind: 'booking'; row: MyBooking }
  | { kind: 'request'; row: ShippingRequestRow };

function bucketForSendBooking(b: MyBooking): 'todo' | 'inProgress' | 'delivered' | 'cancelled' {
  if (b.status === 'cancelled') return 'cancelled';
  // I need to act on it:
  //  - a traveler proposed and I haven't accepted/paid yet
  //  - the traveler delivered + uploaded proof, I need to click "I received"
  if (b.status === 'pending' && b.initiated_by === 'traveler') return 'todo';
  if (b.status === 'confirmed' && b.delivery_proof_url && !b.received_confirmed_at)
    return 'todo';
  // Fully closed
  if (b.status === 'confirmed' && b.received_confirmed_at) return 'delivered';
  // In flight / accepted but not yet delivered, OR I'm waiting for accept
  return 'inProgress';
}

function SendsView({
  bookings,
  requests,
  onAcceptProposal,
  onDeclineProposal,
  onOpenChat,
  onReportProblem,
  onShowPickupCode,
  onEnterDeliveryCode,
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
  onReportProblem: (b: MyBooking) => void;
  onShowPickupCode: (b: MyBooking) => void;
  onEnterDeliveryCode: (b: MyBooking) => void;
  onOpenReview: (b: MyBooking) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
  t: Translations;
}) {
  const todoBookings = bookings.filter((b) => bucketForSendBooking(b) === 'todo');
  const inProgressBookings = bookings.filter((b) => bucketForSendBooking(b) === 'inProgress');
  const deliveredBookings = bookings.filter((b) => bucketForSendBooking(b) === 'delivered');
  const cancelledBookings = bookings.filter((b) => bucketForSendBooking(b) === 'cancelled');
  // "En recherche": public requests that don't have a confirmed booking
  // tied to them yet (so the sender is still actively looking for a traveler).
  const linkedRequestIds = new Set(
    bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'pending')
      .map((b) => b.shipping_request_id)
      .filter(Boolean)
  );
  const searchingRequests = requests.filter(
    (r) => r.status === 'pending' && !linkedRequestIds.has(r.id)
  );

  // Build the flat ordered list of items that will appear in the master list.
  // Order matters: actionable first, then progress, then closed/searching/cancelled.
  const orderedItems: SendItem[] = [
    ...todoBookings.map<SendItem>((row) => ({ kind: 'booking', row })),
    ...inProgressBookings.map<SendItem>((row) => ({ kind: 'booking', row })),
    ...searchingRequests.map<SendItem>((row) => ({ kind: 'request', row })),
    ...deliveredBookings.map<SendItem>((row) => ({ kind: 'booking', row })),
    ...cancelledBookings.map<SendItem>((row) => ({ kind: 'booking', row })),
  ];

  // Default selection: first actionable item, else first item, else null.
  const firstItem = orderedItems[0];
  const initialId = firstItem
    ? firstItem.kind === 'booking'
      ? `b:${firstItem.row.id}`
      : `r:${firstItem.row.id}`
    : null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);

  // If the items list changes (e.g. user accepts a proposal → bucket changes),
  // re-seed selection so it doesn't point at a nonexistent id.
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(initialId);
      return;
    }
    const stillThere = orderedItems.some(
      (it) =>
        (it.kind === 'booking' ? `b:${it.row.id}` : `r:${it.row.id}`) === selectedId
    );
    if (!stillThere) setSelectedId(initialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedItems.length, initialId]);

  const selected =
    orderedItems.find(
      (it) => (it.kind === 'booking' ? `b:${it.row.id}` : `r:${it.row.id}`) === selectedId
    ) ?? null;

  const hasContent = orderedItems.length > 0;

  if (!hasContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">{t.me2_my_packages}</h2>
          <Link href="/envoyer">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              {t.me2_publish_request}
            </Button>
          </Link>
        </div>
        <EmptyState message={t.me2_no_sends} />
      </div>
    );
  }

  function selectItem(id: string) {
    setSelectedId(id);
    setDetailOpenMobile(true);
  }

  // Master list — bucket by bucket
  const master = (
    <div className="overflow-y-auto md:max-h-[80vh]">
      {todoBookings.length > 0 && (
        <>
          <ListBucketHeader label={`🔥 ${t.me2_bucket_todo}`} count={todoBookings.length} tone="urgent" />
          {todoBookings.map((b) => {
            const id = `b:${b.id}`;
            return (
              <SendListRow
                key={id}
                booking={b}
                selected={selectedId === id}
                onClick={() => selectItem(id)}
                tone="urgent"
              />
            );
          })}
        </>
      )}

      {inProgressBookings.length > 0 && (
        <>
          <ListBucketHeader label={`⏳ ${t.me2_bucket_in_progress}`} count={inProgressBookings.length} />
          {inProgressBookings.map((b) => {
            const id = `b:${b.id}`;
            return (
              <SendListRow
                key={id}
                booking={b}
                selected={selectedId === id}
                onClick={() => selectItem(id)}
              />
            );
          })}
        </>
      )}

      {searchingRequests.length > 0 && (
        <>
          <ListBucketHeader label={`🔍 ${t.me2_bucket_searching}`} count={searchingRequests.length} />
          {searchingRequests.map((r) => {
            const id = `r:${r.id}`;
            return (
              <RequestListRow
                key={id}
                request={r}
                selected={selectedId === id}
                onClick={() => selectItem(id)}
              />
            );
          })}
        </>
      )}

      {deliveredBookings.length > 0 && (
        <>
          <ListBucketHeader label={`✓ ${t.me2_bucket_delivered}`} count={deliveredBookings.length} tone="success" />
          {deliveredBookings.map((b) => {
            const id = `b:${b.id}`;
            return (
              <SendListRow
                key={id}
                booking={b}
                selected={selectedId === id}
                onClick={() => selectItem(id)}
              />
            );
          })}
        </>
      )}

      {cancelledBookings.length > 0 && (
        <>
          <ListBucketHeader label={t.me2_bucket_cancelled} count={cancelledBookings.length} />
          {cancelledBookings.map((b) => {
            const id = `b:${b.id}`;
            return (
              <SendListRow
                key={id}
                booking={b}
                selected={selectedId === id}
                onClick={() => selectItem(id)}
              />
            );
          })}
        </>
      )}
    </div>
  );

  // Detail panel — shows the selected item with all current trust&safety
  // callbacks passed through to BookingCard.
  const detail = selected ? (
    selected.kind === 'booking' ? (
      <div className="p-4">
        <BookingCard
          booking={selected.row}
          onAcceptProposal={onAcceptProposal}
          onDeclineProposal={onDeclineProposal}
          onOpenChat={onOpenChat}
          onReportProblem={onReportProblem}
          onShowPickupCode={onShowPickupCode}
          onEnterDeliveryCode={onEnterDeliveryCode}
          onOpenReview={onOpenReview}
          hasReviewed={hasReviewed(selected.row.id)}
          otherReview={reviewFromOther(selected.row.id)}
          t={t}
        />
      </div>
    ) : (
      <div className="p-4">
        <RequestDetailCard request={selected.row} t={t} />
      </div>
    )
  ) : (
    <DetailEmpty message={t.me2_select_send} />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">{t.me2_my_packages}</h2>
        <Link href="/envoyer">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            {t.me2_publish_request}
          </Button>
        </Link>
      </div>

      <MasterDetailLayout
        master={master}
        detail={detail}
        detailOpen={detailOpenMobile}
        onCloseDetail={() => setDetailOpenMobile(false)}
      />
    </div>
  );
}

// One row in the Sends master list. Picks emoji + subtitle based on bucket.
function SendListRow({
  booking,
  selected,
  onClick,
  tone,
}: {
  booking: MyBooking;
  selected: boolean;
  onClick: () => void;
  tone?: 'urgent';
}) {
  const { t, locale } = useI18n();
  const cat = ITEM_CATEGORIES.find((c) => c.value === (booking.item_category as ItemCategory));
  const emoji = cat?.icon ?? '📦';
  const travelerName = shortName(booking.traveler_profile?.full_name) || t.me2_role_traveler;
  const bucket = bucketForSendBooking(booking);

  // Status line (without the route — the route is prepended below).
  let statusText = '';
  if (bucket === 'todo' && booking.status === 'pending') {
    statusText = t.me2_sub_proposes.replace('{name}', travelerName);
  } else if (bucket === 'todo' && booking.delivery_proof_url) {
    statusText = `📸 ${t.me2_sub_delivered_by.replace('{name}', travelerName)} · ${t.me2_sub_to_confirm}`;
  } else if (bucket === 'inProgress' && booking.status === 'confirmed') {
    statusText = `${travelerName} · ${t.me2_sub_in_transit}`;
  } else if (bucket === 'inProgress') {
    statusText = t.me2_sub_waiting_for.replace('{name}', travelerName);
  } else if (bucket === 'delivered') {
    statusText = t.me2_sub_delivered_by.replace('{name}', travelerName);
  } else {
    statusText = t.me2_sub_cancelled;
  }

  const route = `${cityDisplayName(booking.pickup_city, locale)} → ${cityDisplayName(booking.destination_city, locale)}`;
  // Show the parcel's title (what it is) as the headline; route + status below.
  const title = booking.item_title || (cat ? t[cat.labelKey] : '') || route;

  return (
    <ListRow
      selected={selected}
      onClick={onClick}
      emoji={emoji}
      title={title}
      subtitle={`${route} · ${statusText}`}
      rightLabel={formatEuros(booking.proposed_price)}
      dotClass={tone === 'urgent' ? 'bg-butter-500' : undefined}
    />
  );
}

// One row in the Sends master list for a public request without a traveler.
function RequestListRow({
  request,
  selected,
  onClick,
}: {
  request: ShippingRequestRow;
  selected: boolean;
  onClick: () => void;
}) {
  const { t, locale } = useI18n();
  const cat = ITEM_CATEGORIES.find((c) => c.value === (request.item_category as ItemCategory));
  const route = `${cityDisplayName(request.pickup_city, locale)} → ${cityDisplayName(request.destination_city, locale)}`;
  const title = request.item_title || (cat ? t[cat.labelKey] : '') || route;
  return (
    <ListRow
      selected={selected}
      onClick={onClick}
      emoji={cat?.icon ?? '📦'}
      title={title}
      subtitle={`${route} · ${t.me2_before_date.replace('{date}', formatShortDate(request.desired_delivery_date))}`}
      rightLabel={formatEuros(request.budget)}
    />
  );
}

// Detail panel for a request without traveler — simple card with route +
// budget + reassurance message. Minimal because there's not much to do yet.
function RequestDetailCard({ request, t }: { request: ShippingRequestRow; t: Translations }) {
  const { locale } = useI18n();
  const cat = ITEM_CATEGORIES.find((c) => c.value === (request.item_category as ItemCategory));
  return (
    <div className="bg-white rounded-2xl border border-ink-50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center text-xl">
          {cat?.icon ?? '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-bold text-ink-600">
            {cityDisplayName(request.pickup_city, locale)} → {cityDisplayName(request.destination_city, locale)}
          </div>
          <div className="text-[13px] text-ink-400">
            {t.me2_before_date.replace('{date}', formatShortDate(request.desired_delivery_date))}
          </div>
        </div>
        <div className="text-[16px] font-bold text-ink-600 num-display">
          {formatEuros(request.budget)}
        </div>
      </div>

      {request.item_description && (
        <div className="rounded-xl bg-cream-50 px-4 py-3 mb-4">
          <div className="text-[11px] font-semibold text-ink-300 tracking-[0.08em] uppercase mb-1">
            {t.me2_description}
          </div>
          <p className="text-[14px] text-ink-500 leading-relaxed">
            « {request.item_description} »
          </p>
        </div>
      )}

      <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 text-[13px] text-ink-500 leading-relaxed flex gap-2.5">
        <Sparkles className="w-4 h-4 text-butter-500 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-ink-600">{t.me2_searching_traveler_title}</strong>{' '}
          {t.me2_searching_traveler_text}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TRIPS — master list of my trips, detail panel with boarding-pass + packages
// ---------------------------------------------------------------------------

function TripsView({
  trips,
  incomingIntents,
  myProposals,
  onUpdateIntent,
  onProofUploaded,
  onCancelTrip,
  onOpenChat,
  onReportProblem,
  onEnterPickupCode,
  onShowDeliveryCode,
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
  onReportProblem: (intent: IncomingIntent) => void;
  onEnterPickupCode: (intent: IncomingIntent) => void;
  onShowDeliveryCode: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
  t: Translations;
}) {
  // Split trips into "upcoming" (today's date and onward, non-cancelled)
  // and "past" (departure date in the past, or cancelled). The upcoming
  // set is the working surface — that's where senders can still propose
  // packages and that's what we show in the master list by default. The
  // past set is shown in a collapsible "Anciens voyages" section at the
  // bottom so the user can still see their history (for earnings,
  // ratings received, etc.) without it cluttering the active view.
  const today = new Date().toISOString().slice(0, 10);
  const upcomingTrips = trips.filter(
    (tr) => tr.status !== 'cancelled' && tr.departure_date >= today
  );
  const pastTrips = trips.filter(
    (tr) => tr.status === 'cancelled' || tr.departure_date < today
  );
  const activeIncoming = incomingIntents.filter((i) => {
    if (i.status === 'cancelled') return false;
    // Keep delivered+confirmed packages visible until the user has
    // posted their review — that's the real close marker now that
    // reviews are wired.
    const fullyClosed = !!i.received_confirmed_at && hasReviewed(i.id);
    return !fullyClosed;
  });
  const activeProposals = myProposals.filter((p) => {
    if (p.status === 'cancelled') return false;
    const fullyClosed = !!p.received_confirmed_at && hasReviewed(p.id);
    return !fullyClosed;
  });

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

  // The same grouping WITHOUT the "closed" filter, because a flight's parcel
  // count and its earnings are history: they cannot go down.
  //
  // The card used to read both from the active list, so posting a review —
  // which closes a package — turned "5€ de gains sur ce vol" into "0€ de gains
  // sur ce vol" on a flight that had genuinely earned 5€. The list should hide
  // finished work; the total must not forget it.
  const allPackagesByTrip = new Map<string, TripPackage[]>();
  incomingIntents
    .filter((i) => i.status !== 'cancelled')
    .forEach((i) => {
      const tripId = i.traveler_trip_id;
      if (!tripId) return;
      const arr = allPackagesByTrip.get(tripId) ?? [];
      arr.push({ kind: 'incoming', row: i });
      allPackagesByTrip.set(tripId, arr);
    });
  myProposals
    .filter((p) => p.status !== 'cancelled')
    .forEach((p) => {
      const tripId = p.traveler_trip_id;
      if (!tripId) return;
      const arr = allPackagesByTrip.get(tripId) ?? [];
      arr.push({ kind: 'proposal', row: p });
      allPackagesByTrip.set(tripId, arr);
    });

  // Sort upcoming: soonest-departure first
  const sortedTrips = [...upcomingTrips].sort((a, b) =>
    a.departure_date.localeCompare(b.departure_date)
  );
  // Sort past: most recent first (you usually want last week's trip
  // before last year's)
  const sortedPastTrips = [...pastTrips].sort((a, b) =>
    b.departure_date.localeCompare(a.departure_date)
  );

  // Pick default selection: first upcoming trip with packages > first trip.
  const firstWithPackages = sortedTrips.find((tr) => (packagesByTrip.get(tr.id) ?? []).length > 0);
  const initialId = firstWithPackages?.id ?? sortedTrips[0]?.id ?? null;
  const [selectedTripId, setSelectedTripId] = useState<string | null>(initialId);
  const [detailOpenMobile, setDetailOpenMobile] = useState(false);
  // Past trips are collapsed by default — they're informational
  // (earnings history, ratings received) but rarely actionable.
  const [showPastTrips, setShowPastTrips] = useState(false);

  useEffect(() => {
    if (!selectedTripId) {
      setSelectedTripId(initialId);
      return;
    }
    if (!sortedTrips.find((tr) => tr.id === selectedTripId)) {
      setSelectedTripId(initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedTrips.length, initialId]);

  const selectedTrip =
    sortedTrips.find((tr) => tr.id === selectedTripId) ??
    sortedPastTrips.find((tr) => tr.id === selectedTripId) ??
    null;

  if (sortedTrips.length === 0 && sortedPastTrips.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">{t.me2_my_trips}</h2>
          <Link href="/voyager">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              {t.me2_publish_trip}
            </Button>
          </Link>
        </div>
        <EmptyState message={t.me2_no_trips} />
      </div>
    );
  }

  function selectTrip(id: string) {
    setSelectedTripId(id);
    setDetailOpenMobile(true);
  }

  const master = (
    <div className="overflow-y-auto md:max-h-[80vh]">
      <ListBucketHeader label={`✈️ ${t.me2_my_trips}`} count={sortedTrips.length} />
      {sortedTrips.map((tr) => {
        const pkgs = allPackagesByTrip.get(tr.id) ?? [];
        const isPast = tr.departure_date < today;
        return (
          <TripListRow
            key={tr.id}
            trip={tr}
            packagesCount={pkgs.length}
            selected={selectedTripId === tr.id}
            onClick={() => selectTrip(tr.id)}
            isPast={isPast}
          />
        );
      })}

      {/* Collapsible "Anciens voyages" — past or cancelled trips. Kept
          out of the way by default since they're not actionable (senders
          can't book them anymore), but still accessible so the user can
          audit their history and earnings. */}
      {sortedPastTrips.length > 0 && (
        <div className="mt-4 border-t border-ink-50">
          <button
            type="button"
            onClick={() => setShowPastTrips((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-[12px] font-semibold text-ink-400 hover:text-ink-600 hover:bg-cream-50 transition-colors uppercase tracking-[0.08em]"
            aria-expanded={showPastTrips}
          >
            <span className="flex items-center gap-2">
              <span className="text-base">🗂️</span>
              {t.me2_past_trips}
              <span className="text-ink-300 normal-case font-medium tracking-normal">
                · {sortedPastTrips.length}
              </span>
            </span>
            <span className={`transition-transform ${showPastTrips ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {showPastTrips && (
            <div className="opacity-70">
              {sortedPastTrips.map((tr) => {
                const pkgs = allPackagesByTrip.get(tr.id) ?? [];
                return (
                  <TripListRow
                    key={tr.id}
                    trip={tr}
                    packagesCount={pkgs.length}
                    selected={selectedTripId === tr.id}
                    onClick={() => selectTrip(tr.id)}
                    isPast={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const detail = selectedTrip ? (
    <div className="p-4">
      <TripDetailCard
        trip={selectedTrip}
        packages={packagesByTrip.get(selectedTrip.id) ?? []}
        allPackages={allPackagesByTrip.get(selectedTrip.id) ?? []}
        onUpdateIntent={onUpdateIntent}
        onProofUploaded={onProofUploaded}
        onCancelTrip={onCancelTrip}
        onOpenChat={onOpenChat}
        onReportProblem={onReportProblem}
        onEnterPickupCode={onEnterPickupCode}
        onShowDeliveryCode={onShowDeliveryCode}
        onOpenReview={onOpenReview}
        hasReviewed={hasReviewed}
        reviewFromOther={reviewFromOther}
      />
    </div>
  ) : (
    <DetailEmpty message={t.me2_select_trip} />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">{t.me2_my_trips}</h2>
        <Link href="/voyager">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            {t.me2_publish_trip}
          </Button>
        </Link>
      </div>

      <MasterDetailLayout
        master={master}
        detail={detail}
        detailOpen={detailOpenMobile}
        onCloseDetail={() => setDetailOpenMobile(false)}
      />
    </div>
  );
}

// One row in the Trips master list. Short, scannable: date, route, count.
function TripListRow({
  trip,
  packagesCount,
  selected,
  onClick,
  isPast,
}: {
  trip: TravelerTripRow;
  packagesCount: number;
  selected: boolean;
  onClick: () => void;
  isPast: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start px-3 py-2.5 flex items-center gap-3 transition-colors ${
        selected
          ? 'bg-lavender-50/80 border-l-2 border-lavender-500'
          : 'hover:bg-cream-50 border-l-2 border-transparent'
      } ${isPast ? 'opacity-60' : ''}`}
    >
      <span className="flex-shrink-0 text-[18px]">✈️</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-ink-600 truncate">
          {cityDisplayName(trip.departure_city, locale)} → {cityDisplayName(trip.arrival_city, locale)}
        </div>
        <div className="text-[12px] text-ink-400 truncate num-display">
          {formatShortDate(trip.departure_date)}
          {trip.flight_number && <span className="ml-1.5 text-ink-300">· {trip.flight_number}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 text-[12px] font-semibold text-ink-500">
        {packagesCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span className="num-display">{packagesCount}</span>
            <span className="text-ink-400">{t.me2_packages_unit}</span>
          </span>
        ) : (
          <span className="text-ink-300">-</span>
        )}
      </div>
    </button>
  );
}

// Detail panel for a trip: boarding-pass header + packages list.
// Reuses the same boarding-pass visual language (perforation + lavender
// earnings panel) so the design feels familiar.
function TripDetailCard({
  trip,
  packages,
  allPackages,
  onUpdateIntent,
  onProofUploaded,
  onCancelTrip,
  onOpenChat,
  onReportProblem,
  onEnterPickupCode,
  onShowDeliveryCode,
  onOpenReview,
  hasReviewed,
  reviewFromOther,
}: {
  trip: TravelerTripRow;
  packages: Array<
    | { kind: 'incoming'; row: IncomingIntent }
    | { kind: 'proposal'; row: TravelerProposal }
  >;
  /** Same list without the closed ones — see totalNet. */
  allPackages: Array<
    | { kind: 'incoming'; row: IncomingIntent }
    | { kind: 'proposal'; row: TravelerProposal }
  >;
  onUpdateIntent: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onCancelTrip: (tripId: string) => Promise<void>;
  onOpenChat: (intent: IncomingIntent) => void;
  onReportProblem: (intent: IncomingIntent) => void;
  onEnterPickupCode: (intent: IncomingIntent) => void;
  onShowDeliveryCode: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: (bookingIntentId: string) => boolean;
  reviewFromOther: (bookingIntentId: string) => ReviewForBooking | null;
}) {
  const { t, locale } = useI18n();
  // From allPackages, not packages: what a flight carried and earned is
  // history. Reading these off the active list meant a delivered, reviewed
  // parcel took its own earnings off the card with it.
  const totalNet = allPackages.reduce((sum, p) => {
    const ttc = p.row.proposed_price ?? 0;
    return sum + travelerNetFromTotal(ttc);
  }, 0);
  const count = allPackages.length;
  // Everything on this flight is delivered and closed — different from never
  // having had a parcel at all, and worth saying so.
  const allDone = packages.length === 0 && allPackages.length > 0;
  const isCancelable = packages.every((p) => p.row.status !== 'confirmed');

  const departCode = trip.departure_airport || trip.departure_city.slice(0, 3).toUpperCase();
  const arriveCode = trip.arrival_airport || trip.arrival_city.slice(0, 3).toUpperCase();

  return (
    <section className="rounded-2xl border border-ink-100 bg-white overflow-hidden">
      {/* Boarding-pass-style header */}
      <div className="relative border-b border-ink-100">
        <div className="absolute top-1/2 -translate-y-1/2 left-[63%] -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-ink-100 z-10 hidden sm:block" />
        <div className="absolute top-0 left-[63%] -translate-x-1/2 w-3 h-1.5 rounded-b-full bg-white border-x border-b border-ink-100 hidden sm:block" />
        <div className="absolute bottom-0 left-[63%] -translate-x-1/2 w-3 h-1.5 rounded-t-full bg-white border-x border-t border-ink-100 hidden sm:block" />

        <div className="flex items-stretch">
          <div className="flex-1 px-5 py-4 min-w-0 relative bg-gradient-to-br from-cream-50 to-cream-100">
            {trip.flight_number && (
              <div className="text-[10px] text-ink-400 font-bold tracking-[0.14em] uppercase mb-1.5 num-display">
                {t.me2_flight.replace('{number}', trip.flight_number)}
                {trip.flight_time && <span className="ml-2 text-ink-300">· {trip.flight_time}</span>}
              </div>
            )}
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
            <div className="flex items-center justify-between text-[11px] text-ink-400 mb-3">
              <span className="truncate max-w-[40%]">{cityDisplayName(trip.departure_city, locale)}</span>
              <span className="truncate max-w-[40%] text-right">{cityDisplayName(trip.arrival_city, locale)}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div>
                <div className="text-ink-300 font-semibold tracking-[0.12em] uppercase mb-0.5">{t.me2_departure}</div>
                <div className="text-ink-600 font-bold num-display">{formatShortDate(trip.departure_date)}</div>
              </div>
              <div className="h-7 w-px bg-ink-100" />
              <div>
                <div className="text-ink-300 font-semibold tracking-[0.12em] uppercase mb-0.5">{t.me2_packages_unit_caps}</div>
                <div className="text-ink-600 font-bold num-display">{count}</div>
              </div>
            </div>
          </div>

          <div className="w-[35%] flex-shrink-0 border-l border-dashed border-lavender-300/50 px-3 py-4 flex flex-col justify-center items-center text-center relative bg-gradient-to-br from-lavender-50 to-lavender-100/70">
            <div className="text-[28px] sm:text-[32px] font-extrabold text-lavender-700 num-display leading-none">
              {formatEuros(totalNet)}
            </div>
            <div className="text-[11px] sm:text-[12px] text-lavender-700/80 font-medium mt-1.5 leading-snug px-1">
              {t.me2_earnings_on_flight} ✨
            </div>
            {isCancelable && (
              <button
                onClick={() => onCancelTrip(trip.id)}
                className="absolute top-1 right-1 p-1.5 rounded-full text-lavender-400/70 hover:text-blush-500 hover:bg-white/60 transition-colors"
                aria-label={t.me2_cancel_trip}
                title={t.me2_cancel_trip}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Packages list */}
      {count === 0 ? (
        <div className="px-4 py-6 text-center space-y-3">
          <p className="text-[13px] text-ink-400 leading-relaxed">
            {allDone
              ? locale === 'en'
                ? 'Every parcel on this flight has been delivered.'
                : 'Tous les colis de ce vol ont été livrés.'
              : t.me2_no_packages_on_flight}
          </p>
          <Link
            href={`/?type=demandes&from=${encodeURIComponent(trip.departure_city)}&to=${encodeURIComponent(trip.arrival_city)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[13px] font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.me2_find_packages_on_route}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-ink-50">
          {packages.map((p, i) => (
            <div key={`${p.kind}-${p.row.id}-${i}`} className="px-3 py-2">
              {p.kind === 'incoming' || p.row.status === 'confirmed' ? (
                // Incoming bookings, AND traveler-initiated proposals the sender
                // has accepted+paid, both need the full pickup/deliver/handover
                // actions. A proposal row has the same shape as an incoming one
                // (both are booking_intents); it just lacks the unused
                // traveler_trip field, so we fill it in.
                <IntentCardInline
                  intent={p.kind === 'incoming' ? p.row : ({ ...p.row, traveler_trip: null } as IncomingIntent)}
                  onUpdate={onUpdateIntent}
                  onProofUploaded={onProofUploaded}
                  onOpenChat={onOpenChat}
                  onReportProblem={onReportProblem}
                  onEnterPickupCode={onEnterPickupCode}
                  onShowDeliveryCode={onShowDeliveryCode}
                  onOpenReview={onOpenReview}
                  hasReviewed={hasReviewed(p.row.id)}
                  otherReview={reviewFromOther(p.row.id)}
                  tripDepartureDate={trip.departure_date}
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

// ---------------------------------------------------------------------------
// INLINE PACKAGE CARDS — used inside TripDetailCard. These are the SAME
// trust&safety-aware cards we built in the recent passes (pickup/delivery
// codes + signaler). The status pill distinguishes pickup-pending vs in-
// transit vs delivery-handoff vs done.
// ---------------------------------------------------------------------------

// Page-level details popup for an incoming request. Same content as the
// card's accept flow, but rendered at the page so it can be opened from a
// notification deep-link (?booking=) regardless of which trip is selected.
function RequestDetailsModal({
  intent,
  tripDepartureDate,
  tripCategories,
  onClose,
  onAccept,
  onDecline,
}: {
  intent: IncomingIntent;
  tripDepartureDate?: string;
  // What this traveler ticked they'd carry. Empty means they didn't say, which
  // is not the same as "carries nothing" — see the note below.
  tripCategories?: string[];
  onClose: () => void;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [ack, setAck] = useState(false);
  const senderName = shortName(intent.sender_profile?.full_name) || t.me2_role_sender;
  const verified =
    intent.sender_profile?.verification_level === 'id_verified' ||
    intent.sender_profile?.verification_level === 'trusted';
  const cat = ITEM_CATEGORIES.find((x) => x.value === (intent.item_category as ItemCategory));
  const itemLabel = cat ? `${cat.icon} ${t[cat.labelKey]}` : intent.item_category;

  // Deliberately not a gate. Senders and travelers don't classify the same
  // parcel the same way, and refusing the booking over a mismatched dropdown
  // would kill real trips for no safety gain — the traveler still has the
  // parcel in front of them at handover.
  //
  // Only shown when the traveler actually ticked something: an empty list means
  // they skipped the question, and flagging every request in that case turns
  // the note into noise nobody reads.
  const categoryUnlisted =
    !!tripCategories?.length && !tripCategories.includes(intent.item_category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em]">
            {t.me2_accept_check_title}
          </h3>
          <button
            onClick={onClose}
            aria-label={t.me2_accept_cancel}
            className="text-ink-400 hover:text-ink-600 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl bg-cream-100 p-4 mb-4 space-y-2.5 text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-ink-600 text-[14px]">{senderName}</span>
            {verified && <ShieldCheck className="w-3.5 h-3.5 text-mint-500" strokeWidth={2.5} />}
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink-400">{t.send_recap_route}</span>
            <span className="font-medium text-ink-600 text-end">
              {cityDisplayName(intent.pickup_city, locale)} → {cityDisplayName(intent.destination_city, locale)}
            </span>
          </div>
          {tripDepartureDate && (
            <div className="flex justify-between gap-3">
              <span className="text-ink-400">{t.send_recap_date}</span>
              <span className="font-medium text-ink-600 num-display">{formatShortDate(tripDepartureDate)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-ink-400">{t.send_recap_item}</span>
            <span className="font-medium text-ink-600 text-end">
              {intent.item_title ? `${itemLabel} · ${intent.item_title}` : itemLabel}
            </span>
          </div>
          {intent.item_description && (
            <p className="text-ink-500 leading-relaxed pt-1">{intent.item_description}</p>
          )}
          {/* Sits right under the item, where the traveler is already reading
              what they'd be carrying. Neutral styling on purpose: this is a
              prompt to ask a question, not a warning about the sender. */}
          {categoryUnlisted && (
            <p className="text-ink-400 leading-relaxed pt-1 border-t border-ink-100 mt-1">
              {t.me2_category_unlisted}
            </p>
          )}
          <div className="flex justify-between gap-3 pt-2 border-t border-ink-100">
            <span className="text-ink-400">{t.disc_you_receive}</span>
            <span className="font-bold text-mint-600 num-display">
              {formatEuros(travelerNetFromTotal(intent.proposed_price))}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-ink-500 text-cream-50 px-4 py-2.5 mb-4 text-[13px] font-semibold">
          {t.me2_accept_doubt}
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-500 focus:ring-2 focus:ring-lavender-500/30 cursor-pointer"
          />
          <span className="text-[13px] text-ink-600 leading-relaxed">{t.me2_accept_check_label}</span>
        </label>
        <div className="flex gap-2.5">
          <button
            onClick={() => onDecline()}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-blush-600 bg-blush-50 hover:bg-blush-100 rounded-full transition-colors"
          >
            {t.me2_decline}
          </button>
          <button
            disabled={!ack}
            onClick={() => onAccept()}
            className="flex-1 px-4 py-2.5 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.me2_accept_confirm}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function IntentCardInline({
  intent,
  onUpdate,
  onProofUploaded,
  onOpenChat,
  onReportProblem,
  onEnterPickupCode,
  onShowDeliveryCode,
  onOpenReview,
  hasReviewed,
  otherReview,
  tripDepartureDate,
}: {
  intent: IncomingIntent;
  onUpdate: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onProofUploaded: (id: string, url: string, receiverName: string) => void;
  onOpenChat: (intent: IncomingIntent) => void;
  onReportProblem: (intent: IncomingIntent) => void;
  onEnterPickupCode: (intent: IncomingIntent) => void;
  onShowDeliveryCode: (intent: IncomingIntent) => void;
  onOpenReview: (intent: IncomingIntent) => void;
  hasReviewed: boolean;
  otherReview: ReviewForBooking | null;
  // The trip's flight date (YYYY-MM-DD). Used to warn on delivery before the
  // flight — the traveler may genuinely travel earlier, so we confirm, not block.
  tripDepartureDate?: string;
}) {
  const { t, locale } = useI18n();
  const [showProofModal, setShowProofModal] = useState(false);
  // Safety gate before accepting: the traveler must acknowledge they can
  // inspect the item and refuse without penalty.
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptAck, setAcceptAck] = useState(false);
  // Delivery-before-flight confirmation.
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyAck, setEarlyAck] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isBeforeFlight = !!tripDepartureDate && today < tripDepartureDate;
  // Clicking "I delivered": warn if the flight hasn't happened yet, else go
  // straight to the proof upload.
  function startDeliver() {
    if (isBeforeFlight) {
      setEarlyAck(false);
      setShowEarlyModal(true);
    } else {
      setShowProofModal(true);
    }
  }
  const senderName = shortName(intent.sender_profile?.full_name) || t.me2_role_sender;
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
  // Three distinct phases once accepted:
  //   - pickup not confirmed → traveler hasn't met the sender yet
  //   - pickup confirmed but no proof → traveler is in transit
  //   - proof uploaded but receipt not confirmed → drop-off moment, show
  //     the delivery code to the sender/recipient
  const showPickup =
    intent.status === 'confirmed' &&
    !intent.pickup_confirmed_at &&
    !intent.delivery_proof_url;
  const showDeliver =
    intent.status === 'confirmed' &&
    !!intent.pickup_confirmed_at &&
    !intent.delivery_proof_url;
  const showDeliveryHandoff =
    intent.status === 'confirmed' &&
    !!intent.delivery_proof_url &&
    !intent.received_confirmed_at;
  // Reviewable phase: sender has confirmed reception. Traveler can rate
  // the sender now. We keep the package visible in the trips list until
  // the review is posted (handled by the parent's filter).
  const showReview =
    intent.status === 'confirmed' &&
    !!intent.received_confirmed_at;

  // Status pill with all phases
  let statusText: string | null = null;
  let statusClass = '';
  if (intent.status === 'pending') {
    statusText = t.me2_pill_new_request;
    statusClass = 'text-butter-700 bg-butter-50';
  } else if (intent.status === 'confirmed' && intent.received_confirmed_at && intent.transfer_id) {
    // Delivered AND paid. "Livraison confirmée" alone left the traveler
    // wondering where their money was; this is the state they actually want
    // to see, and transfer_id is proof it left.
    statusText = locale === 'en' ? '✓ Paid' : '✓ Payé';
    statusClass = 'text-mint-700 bg-mint-50';
  } else if (intent.status === 'confirmed' && intent.received_confirmed_at) {
    // Delivered, no transfer. Almost always because the traveler hasn't
    // finished their payout setup — transferToTraveler skips with
    // 'not_onboarded' and the money waits on the platform balance until the
    // account.updated webhook retries. Say so rather than showing a bare tick.
    statusText = locale === 'en' ? '⏳ Payment on the way' : '⏳ Paiement en route';
    statusClass = 'text-butter-700 bg-butter-50';
  } else if (intent.status === 'confirmed' && intent.delivery_proof_url) {
    statusText = `📸 ${t.me2_pill_delivered_give_code}`;
    statusClass = 'text-butter-700 bg-butter-50';
  } else if (intent.status === 'confirmed' && intent.pickup_confirmed_at && !intent.delivery_proof_url) {
    statusText = `✓ ${t.me2_pill_picked_up_to_deliver}`;
    statusClass = 'text-mint-700 bg-mint-50';
  } else if (intent.status === 'confirmed' && !intent.pickup_confirmed_at && intent.payment_status === 'authorized') {
    statusText = `💳 ${t.me2_pill_payment_held_to_pickup}`;
    statusClass = 'text-lavender-700 bg-lavender-50';
  } else if (intent.status === 'confirmed') {
    statusText = t.me2_pill_to_deliver;
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
            {formatEuros(travelerNetFromTotal(intent.proposed_price))}
          </span>
          {statusText && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
              {statusText}
            </span>
          )}
        </div>

        {showAccept && (
          <div className="flex-shrink-0">
            <button
              onClick={() => { setAcceptAck(false); setShowAcceptModal(true); }}
              disabled={!!busy}
              className="px-3.5 py-1.5 text-[12px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50"
            >
              {busy ? '...' : t.me2_view_request}
            </button>
          </div>
        )}

        {showPickup && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onOpenChat(intent)}
              className="px-2.5 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-500 text-[12px] transition-colors"
              aria-label={t.me2_message}
              title={t.me2_message}
            >
              💬
            </button>
            <button
              onClick={() => onReportProblem(intent)}
              className="px-2.5 py-1.5 rounded-full text-ink-400 hover:text-blush-500 hover:bg-blush-50 transition-colors"
              aria-label={t.me2_report_problem}
              title={t.me2_report_problem}
            >
              <Flag className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => onEnterPickupCode(intent)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-mint-500 hover:bg-mint-600 rounded-full transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              {t.me2_i_picked_up}
            </button>
          </div>
        )}

        {showDeliver && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onOpenChat(intent)}
              className="px-2.5 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-500 text-[12px] transition-colors"
              aria-label={t.me2_message}
              title={t.me2_message}
            >
              💬
            </button>
            <button
              onClick={() => onReportProblem(intent)}
              className="px-2.5 py-1.5 rounded-full text-ink-400 hover:text-blush-500 hover:bg-blush-50 transition-colors"
              aria-label={t.me2_report_problem}
              title={t.me2_report_problem}
            >
              <Flag className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={startDeliver}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors"
            >
              <Camera className="w-3 h-3" />
              {t.me2_i_delivered}
            </button>
          </div>
        )}

        {showDeliveryHandoff && (
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => onOpenChat(intent)}
              className="px-2.5 py-1.5 rounded-full bg-cream-100 hover:bg-cream-200 text-ink-500 text-[12px] transition-colors"
              aria-label={t.me2_message}
              title={t.me2_message}
            >
              💬
            </button>
            <button
              onClick={() => onReportProblem(intent)}
              className="px-2.5 py-1.5 rounded-full text-ink-400 hover:text-blush-500 hover:bg-blush-50 transition-colors"
              aria-label={t.me2_report_problem}
              title={t.me2_report_problem}
            >
              <Flag className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => onShowDeliveryCode(intent)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors"
            >
              <KeyRound className="w-3 h-3" />
              {t.me2_confirm_delivery}
            </button>
          </div>
        )}

        {showReview && (
          // Reception confirmed → traveler can rate the sender. Once
          // rated, the card stays visible (with a lock badge) until the
          // parent filter removes it on the next render.
          <div className="flex-shrink-0">
            {!hasReviewed ? (
              <button
                type="button"
                onClick={() => onOpenReview(intent)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-lavender-500 hover:bg-lavender-600 text-white text-[12px] font-semibold transition-colors"
              >
                <Star className="w-3 h-3 fill-white" strokeWidth={0} />
                {t.me2_rate}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-[11px] font-semibold">
                <Star className="w-3 h-3 fill-current" strokeWidth={0} />
                {t.me2_you_rated}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress journey — role-aware reminders (traveler side). Shown once
          the booking is accepted (not on a pending request). */}
      {!showAccept && (
        <div className="mt-3 ml-1">
          <ShipmentJourney
            booking={intent}
            role="traveler"
            otherFirstName={senderName.split(' ')[0]}
            departureDate={intent.traveler_trip?.departure_date}
            t={t}
          />
        </div>
      )}

      {/* When the other party has already posted their review, show it
          inline below the card so the user sees how they were rated. */}
      {otherReview && (
        <div className="mt-2 ml-11 text-[12px] text-ink-400 flex items-center gap-1.5 flex-wrap">
          <span>{t.me2_x_rated_you.replace('{name}', senderName.split(' ')[0])}</span>
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
            earlyReason={earlyReason.trim() || undefined}
            onClose={() => setShowProofModal(false)}
            onSuccess={(url) => {
              onProofUploaded(intent.id, url, '');
              setShowProofModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Safety acknowledgement before accepting a request. */}
      <AnimatePresence>
        {showAcceptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => !busy && setShowAcceptModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em]">
                  {t.me2_accept_check_title}
                </h3>
                <button
                  onClick={() => setShowAcceptModal(false)}
                  disabled={!!busy}
                  aria-label={t.me2_accept_cancel}
                  className="text-ink-400 hover:text-ink-600 text-lg leading-none px-1 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              {/* Full request details so the traveler can decide from here. */}
              <div className="rounded-2xl bg-cream-100 p-4 mb-4 space-y-2.5 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink-600 text-[14px]">{senderName}</span>
                  {(intent.sender_profile?.verification_level === 'id_verified' ||
                    intent.sender_profile?.verification_level === 'trusted') && (
                    <ShieldCheck className="w-3.5 h-3.5 text-mint-500" strokeWidth={2.5} />
                  )}
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-400">{t.send_recap_route}</span>
                  <span className="font-medium text-ink-600 text-end">
                    {cityDisplayName(intent.pickup_city, locale)} → {cityDisplayName(intent.destination_city, locale)}
                  </span>
                </div>
                {tripDepartureDate && (
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-400">{t.send_recap_date}</span>
                    <span className="font-medium text-ink-600 num-display">{formatShortDate(tripDepartureDate)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-ink-400">{t.send_recap_item}</span>
                  <span className="font-medium text-ink-600 text-end">
                    {(() => {
                      const c = ITEM_CATEGORIES.find((x) => x.value === (intent.item_category as ItemCategory));
                      const label = c ? `${c.icon} ${t[c.labelKey]}` : intent.item_category;
                      return intent.item_title ? `${label} · ${intent.item_title}` : label;
                    })()}
                  </span>
                </div>
                {intent.item_description && (
                  <p className="text-ink-500 leading-relaxed pt-1">{intent.item_description}</p>
                )}
                <div className="flex justify-between gap-3 pt-2 border-t border-ink-100">
                  <span className="text-ink-400">{t.disc_you_receive}</span>
                  <span className="font-bold text-mint-600 num-display">
                    {formatEuros(travelerNetFromTotal(intent.proposed_price))}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-ink-500 text-cream-50 px-4 py-2.5 mb-4 text-[13px] font-semibold">
                {t.me2_accept_doubt}
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={acceptAck}
                  onChange={(e) => setAcceptAck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-500 focus:ring-2 focus:ring-lavender-500/30 cursor-pointer"
                />
                <span className="text-[13px] text-ink-600 leading-relaxed">
                  {t.me2_accept_check_label}
                </span>
              </label>
              <div className="flex gap-2.5">
                <button
                  onClick={async () => { setShowAcceptModal(false); await handle('cancelled'); }}
                  disabled={!!busy}
                  className="flex-1 px-4 py-2.5 text-[14px] font-medium text-blush-600 bg-blush-50 hover:bg-blush-100 rounded-full transition-colors disabled:opacity-50"
                >
                  {t.me2_decline}
                </button>
                <button
                  disabled={!acceptAck || !!busy}
                  onClick={async () => {
                    setShowAcceptModal(false);
                    await handle('confirmed');
                  }}
                  className="flex-1 px-4 py-2.5 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.me2_accept_confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery-before-flight confirmation (soft — never blocks). */}
      <AnimatePresence>
        {showEarlyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => setShowEarlyModal(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
                {t.me2_early_deliver_title}
              </h3>
              <p className="text-[14px] text-ink-500 leading-relaxed mb-4">
                {t.me2_early_deliver_text.replace(
                  '{date}',
                  tripDepartureDate ? formatShortDate(tripDepartureDate) : ''
                )}
              </p>
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-ink-600 mb-2">
                  {t.me2_early_deliver_reason_label}
                </label>
                <textarea
                  value={earlyReason}
                  onChange={(e) => setEarlyReason(e.target.value)}
                  placeholder={t.me2_early_deliver_reason_placeholder}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
                />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={earlyAck}
                  onChange={(e) => setEarlyAck(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-500 focus:ring-2 focus:ring-lavender-500/30 cursor-pointer"
                />
                <span className="text-[13px] text-ink-600 leading-relaxed">
                  {t.me2_early_deliver_ack}
                </span>
              </label>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowEarlyModal(false)}
                  className="flex-1 px-4 py-2.5 text-[14px] font-medium text-ink-500 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
                >
                  {t.me2_accept_cancel}
                </button>
                <button
                  disabled={!earlyAck || !earlyReason.trim()}
                  onClick={() => { setShowEarlyModal(false); setShowProofModal(true); }}
                  className="flex-1 px-4 py-2.5 text-[14px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.me2_early_deliver_confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ProposalCardInline({ proposal }: { proposal: TravelerProposal }) {
  const { t } = useI18n();
  const senderName = shortName(proposal.sender_profile?.full_name) || t.me2_role_sender;
  const initial = nameInitial(proposal.sender_profile?.full_name);
  const netTraveler = travelerNetFromTotal(proposal.proposed_price);

  const accepted = proposal.status === 'confirmed';
  const statusText = accepted ? `✓ ${t.me2_status_accepted}` : proposal.status === 'cancelled' ? `✕ ${t.me2_status_declined}` : `⏳ ${t.me2_status_pending}`;
  const statusClass = accepted
    ? 'text-mint-700 bg-mint-50'
    : proposal.status === 'cancelled'
      ? 'text-ink-400 bg-cream-100'
      : 'text-butter-700 bg-butter-50';

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
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupHeader — used by HistoryView for its section headers. The master-
// detail refactor removed this from the active /me views (those use
// ListBucketHeader now), but the history page below still uses the older
// big-section style so we keep it here.
// ---------------------------------------------------------------------------
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
  const { locale } = useI18n();
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
        <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em] mb-6">{t.me2_history}</h2>
        <EmptyState message={t.me2_history_empty} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <h2 className="text-2xl font-bold text-ink-600 tracking-[-0.02em]">
        {t.me2_history} <span className="text-ink-300 font-normal text-[15px]">· {totalCount}</span>
      </h2>

      {incomingHistory.length > 0 && (
        <section>
          <GroupHeader icon="✈️" label={t.me2_history_missions} count={incomingHistory.length} />
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
          <GroupHeader icon="📦" label={t.me2_history_sends} count={sendsHistory.length} />
          <div className="space-y-3 opacity-80">
            {sendsHistory.map((b) => (
              <BookingCard key={b.id} booking={b} t={t} />
            ))}
          </div>
        </section>
      )}

      {proposalsHistory.length > 0 && (
        <section>
          <GroupHeader icon="💌" label={t.me2_history_proposals} count={proposalsHistory.length} />
          <div className="space-y-3 opacity-80">
            {proposalsHistory.map((p) => (
              <ProposalCard key={p.id} proposal={p} accepted={p.status === 'confirmed'} />
            ))}
          </div>
        </section>
      )}

      {cancelledTrips.length > 0 && (
        <section>
          <GroupHeader icon="🚫" label={t.me2_history_cancelled_trips} count={cancelledTrips.length} />
          <div className="space-y-3 opacity-60">
            {cancelledTrips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-2xl p-5 border border-ink-50">
                <div className="flex items-center gap-4">
                  <Plane className="w-4 h-4 text-ink-300" />
                  <div className="flex-1">
                    <div className="text-[14px] text-ink-500">
                      {cityDisplayName(trip.departure_city, locale)} → {cityDisplayName(trip.arrival_city, locale)}
                    </div>
                    <div className="text-[12px] text-ink-400">
                      {formatShortDate(trip.departure_date)} · {t.me2_cancelled_label}
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
