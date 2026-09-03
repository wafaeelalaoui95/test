'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Clock,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  BadgeCheck,
  Mail,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/Badge';
import { formatShortDate, formatName, nameInitial, displayName, priceBreakdown, formatEuros } from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { useIdentityGate } from '@/components/IdentityGate';
import type { Profile, TravelerTripRow } from '@/lib/supabase/types';

type PublicProfile = Pick<
  Profile,
  'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed' | 'city' | 'country'
> & {
  // Optional fields that may not exist on legacy profiles but are surfaced
  // by recent migrations (07_identity_verification, etc.) — typed as
  // optional so the page renders gracefully when they're missing.
  identity_verified_at?: string | null;
  created_at?: string | null;
};

export function ProfileClient({
  travelerId,
  initialProfile,
  initialTrips,
}: {
  travelerId: string;
  initialProfile: PublicProfile | null;
  initialTrips: TravelerTripRow[];
}) {
  const { t, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const gate = useIdentityGate();
  // Seeded from the server render so the profile paints immediately — no
  // download-JS → hydrate → fetch waterfall on first load.
  const [profile] = useState<PublicProfile | null>(initialProfile);
  const [trips] = useState<TravelerTripRow[]>(initialTrips);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Booking intent modal state
  const [bookingTrip, setBookingTrip] = useState<TravelerTripRow | null>(null);
  const [bookingStep, setBookingStep] = useState<'details' | 'payment' | 'success'>('details');
  const [intentCategory, setIntentCategory] = useState<string>('');
  const [intentTitle, setIntentTitle] = useState('');
  const [intentDescription, setIntentDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);


  function openBooking(trip: TravelerTripRow) {
    // Identity gate, same as /envoyer and /voyager. This page was the way
    // around it: someone could sign up, land on a traveler's profile from the
    // home page, and book a stranger's flight without ever proving who they
    // are — which is precisely the person a traveler is trusting when they put
    // a sealed parcel in their bag.
    if (!gate.ensureVerified()) return;
    setBookingTrip(trip);
    setBookingStep('details');
    setIntentCategory('');
    setIntentTitle('');
    setIntentDescription('');
    setSubmitErr(null);
  }

  // Deep-link support: the "Book this trip" cards on the home page link here
  // with ?book=<tripId>. Once trips + auth have resolved, open that trip's
  // booking modal directly (or bounce through login first, preserving intent).
  useEffect(() => {
    if (authLoading || trips.length === 0) return;
    const bookId = new URLSearchParams(window.location.search).get('book');
    if (!bookId) return;
    const target = trips.find((tr) => tr.id === bookId);
    if (!target) return;
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(`/u/${travelerId}?book=${bookId}`)}`;
      return;
    }
    openBooking(target);
    // Clean the URL so a refresh or back-nav doesn't reopen the modal.
    window.history.replaceState(null, '', `/u/${travelerId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, trips]);

  function handleProceedToPayment() {
    if (!intentCategory) {
      setSubmitErr(t.prof_choose_category);
      return;
    }
    if (!intentTitle.trim()) {
      setSubmitErr(t.send_item_name_label);
      return;
    }
    setSubmitErr(null);
    setBookingStep('payment');
  }

  async function handlePaymentAuthorized(paymentIntentId: string) {
    if (!bookingTrip || !user) return;
    const breakdown = priceBreakdown(bookingTrip.compensation_min);
    setSubmitErr(null);
    setSubmitting(true);
    try {
      await browser.createBookingIntent({
        sender_id: user.id,
        traveler_trip_id: bookingTrip.id,
        item_category: intentCategory,
        item_title: intentTitle.trim() || null,
        item_description: intentDescription || null,
        proposed_price: breakdown.total,
        pickup_city: bookingTrip.departure_city,
        destination_city: bookingTrip.arrival_city,
        payment_intent_id: paymentIntentId,
        payment_status: 'authorized',
        payment_amount: Math.round(breakdown.total * 100),
      });
      setBookingStep('success');
    } catch (e: any) {
      setSubmitErr(e.message ?? t.prof_error_occurred);
    } finally {
      setSubmitting(false);
    }
  }

  function getAcceptedCategories(trip: TravelerTripRow): string[] {
    if (!trip.notes) return [];
    try {
      const parsed = JSON.parse(trip.notes);
      if (Array.isArray(parsed?.accepted_categories)) return parsed.accepted_categories;
    } catch {
      /* not JSON, ignore */
    }
    return [];
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-ink-600 mb-2">{t.prof_not_found}</h1>
          <p className="text-[14px] text-ink-400 mb-6">
            {t.prof_not_found_desc}
          </p>
          <Link href="/">
            <Button variant="outline">{t.prof_back_to_travelers}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initial = nameInitial(profile.full_name);
  const publicName = displayName(profile.full_name) || t.prof_traveler;
  const firstName = publicName.split(' ')[0];

  // Derived trust signals — passed down to the badge grid
  const isIdentityVerified =
    !!profile.identity_verified_at ||
    profile.verification_level === 'id_verified' ||
    profile.verification_level === 'trusted';
  // We treat the profile's email as confirmed by default: Supabase Auth
  // requires email confirmation for signup, so every profile that exists
  // already has a confirmed email.
  const isEmailVerified = true;
  // Member-since year — falls back gracefully if created_at isn't surfaced
  const memberSinceYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <div className="min-h-screen py-8 lg:py-12">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 hover:text-ink-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.prof_back_to_travelers}
        </Link>

        {/* PROFILE HERO — Airbnb / BlaBlaCar inspired
            Big avatar on the left, name + stats on the right.
            Stats are placed right under the name so they're seen
            BEFORE the trips below. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl border border-ink-50 p-6 sm:p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={publicName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-lavender-100 flex items-center justify-center font-extrabold text-3xl sm:text-4xl text-lavender-700">
                  {initial}
                </div>
              )}
              {/* Identity verified mint pill overlapping the avatar — the
                  visual signature of a verified profile, like the Airbnb
                  superhost ribbon. */}
              {isIdentityVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-mint-500 border-[3px] border-white flex items-center justify-center" title={t.prof_identity_verified}>
                  <BadgeCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>

            {/* Name + rating row */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-2">
                {publicName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-400">
                {/* Rating and completed-trip count hidden until they are
                    computed. Neither column is written by anything, so this
                    showed a 0.0 to every real user and a seeded score to the
                    rest — on the page where a sender decides who to trust with
                    their parcel, which is the worst place to invent one. */}
                {profile.city && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{profile.city}{profile.country ? `, ${profile.country}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TRUST BADGES — grid of vérifications, BlaBlaCar style.
              Each cell shows a checkmark or a dimmed pending icon. We
              don't show "Téléphone vérifié" yet because phone validation
              isn't implemented; it'll get added the same way later. */}
          <div className="mt-7 pt-6 border-t border-ink-50">
            <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-300 mb-4">
              {t.prof_verifications}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <TrustBadge
                done={isIdentityVerified}
                icon={BadgeCheck}
                label={t.prof_identity_verified}
                hint={t.prof_identity_verified_hint}
              />
              <TrustBadge
                done={isEmailVerified}
                icon={Mail}
                label={t.prof_email_confirmed}
                hint={t.prof_email_confirmed_hint}
              />
              <TrustBadge
                done={!!memberSinceYear}
                icon={Calendar}
                label={memberSinceYear ? t.prof_member_since.replace('{year}', String(memberSinceYear)) : t.prof_member_recent}
                hint={t.prof_account_age_hint}
                neutral
              />
              <TrustBadge
                done={(profile.trips_completed ?? 0) >= 3}
                icon={TrendingUp}
                label={
                  (profile.trips_completed ?? 0) === 0
                    ? t.prof_new_traveler
                    : (profile.trips_completed ?? 0) >= 10
                      ? t.prof_experienced_traveler
                      : t.prof_trusted_traveler
                }
                hint={
                  (profile.trips_completed ?? 0) > 1
                    ? t.prof_transports_made_other.replace('{count}', String(profile.trips_completed ?? 0))
                    : t.prof_transports_made_one.replace('{count}', String(profile.trips_completed ?? 0))
                }
                neutral
              />
            </div>
          </div>
        </motion.div>

        {/* Open trips */}
        <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-5">
          {t.prof_open_trips}
        </h2>
        {trips.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-ink-100">
            <p className="text-[14px] text-ink-400">
              {t.prof_no_open_trips.replace('{name}', firstName)}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {trips.map((tr, i) => {
              const categories = getAcceptedCategories(tr);
              return (
                <motion.div
                  key={tr.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-6 border border-ink-50 flex flex-col"
                >
                  <div className="mb-4">
                    <div className="text-[17px] font-bold text-ink-600 mb-2 tracking-[-0.01em]">
                      {cityDisplayName(tr.departure_city, locale)}
                      <Plane className="inline w-4 h-4 mx-2 text-ink-400" />
                      {cityDisplayName(tr.arrival_city, locale)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
                      <Clock className="w-3.5 h-3.5" />
                      {formatShortDate(tr.departure_date)}
                      {tr.flight_time && ` · ${tr.flight_time}`}
                    </div>
                  </div>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {categories.map((cat) => {
                        const meta = ITEM_CATEGORIES.find((c) => c.value === cat);
                        if (!meta) return null;
                        return (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lavender-50 text-lavender-700 rounded-full text-[12px] font-medium"
                          >
                            <span>{meta.icon}</span>
                            <span>{t[meta.labelKey]}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-end justify-between mb-5 mt-auto">
                    <div>
                      <div className="text-[13px] text-ink-400">{t.prof_starting_from}</div>
                      <div className="text-[10px] text-ink-300 mt-0.5">{t.prof_jibly_protection_included}</div>
                    </div>
                    <div className="font-bold text-ink-600 text-[20px] num-display tracking-[-0.015em]">
                      {formatEuros(priceBreakdown(tr.compensation_min).total)}
                    </div>
                  </div>
                  <Button
                    onClick={() => (user ? openBooking(tr) : (window.location.href = `/login?next=/u/${travelerId}`))}
                    size="sm"
                    fullWidth
                  >
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    {t.prof_book_this_trip}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking intent modal — UNCHANGED from previous version */}
      <AnimatePresence>
        {bookingTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] overflow-y-auto bg-ink-600/40 backdrop-blur-sm"
            onClick={() => !submitting && setBookingTrip(null)}
          >
            <div className="min-h-full flex items-end sm:items-center justify-center p-3 sm:p-4">
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-cream-50 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-xl my-3 sm:my-0"
              >
              {bookingStep === 'details' && (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
                        {t.prof_booking_step_1}
                      </div>
                      <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
                        {cityDisplayName(bookingTrip.departure_city, locale)} → {cityDisplayName(bookingTrip.arrival_city, locale)}
                      </h2>
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-400 mt-1.5">
                        <Clock className="w-3 h-3" />
                        {formatShortDate(bookingTrip.departure_date)}
                      </div>
                    </div>
                    <button
                      onClick={() => setBookingTrip(null)}
                      className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
                      {t.prof_what_to_send}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ITEM_CATEGORIES.map((c) => {
                        const active = intentCategory === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setIntentCategory(c.value)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-start transition-all ${
                              active
                                ? 'border-lavender-500 bg-lavender-50'
                                : 'border-ink-100 bg-white hover:border-ink-300'
                            }`}
                          >
                            <span className="text-lg">{c.icon}</span>
                            <span className={`text-[13px] font-medium ${active ? 'text-lavender-700' : 'text-ink-500'}`}>
                              {t[c.labelKey]}
                            </span>
                            {active && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-lavender-500 ml-auto" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-2">
                      {t.send_item_name_label}
                    </label>
                    <input
                      type="text"
                      value={intentTitle}
                      onChange={(e) => setIntentTitle(e.target.value)}
                      placeholder={t.send_item_name_placeholder}
                      maxLength={60}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-2">
                      {t.prof_description_optional}
                    </label>
                    <textarea
                      value={intentDescription}
                      onChange={(e) => setIntentDescription(e.target.value)}
                      placeholder={t.prof_description_placeholder}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-3">
                      {t.prof_payment_detail}
                    </label>
                    <div className="rounded-xl bg-white border border-ink-100 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-[14px] text-ink-500">
                        <span>{t.prof_traveler_compensation}</span>
                        <span className="num-display font-medium text-ink-600">
                          {formatEuros(priceBreakdown(bookingTrip.compensation_min).traveler)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[14px] text-ink-500">
                        <span>{t.prof_jibly_protection_fee}</span>
                        <span className="num-display font-medium text-ink-600">
                          {formatEuros(priceBreakdown(bookingTrip.compensation_min).fees)}
                        </span>
                      </div>
                      <div className="h-px bg-ink-50 my-2" />
                      <div className="flex items-baseline justify-between">
                        <span className="text-[15px] font-semibold text-ink-600">{t.prof_total}</span>
                        <span className="text-2xl font-bold text-ink-600 num-display tracking-[-0.02em]">
                          {formatEuros(priceBreakdown(bookingTrip.compensation_min).total)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {submitErr && (
                    <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500 mb-4">
                      {submitErr}
                    </div>
                  )}
                  <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 mb-5 text-[13px] text-ink-500 flex gap-2.5">
                    <Sparkles className="w-4 h-4 text-butter-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-ink-600">{t.prof_no_immediate_charge}</strong>{' '}
                      {t.prof_no_immediate_charge_desc}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => setBookingTrip(null)}
                      className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
                    >
                      {t.prof_cancel}
                    </button>
                    <button
                      onClick={handleProceedToPayment}
                      disabled={!intentCategory || !intentTitle.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {t.prof_continue_to_payment}
                    </button>
                  </div>
                </>
              )}
              {bookingStep === 'payment' && (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
                        {t.prof_payment_step_2}
                      </div>
                      <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
                        {formatEuros(priceBreakdown(bookingTrip.compensation_min).total)}
                      </h2>
                      <div className="text-[13px] text-ink-400 mt-1.5">
                        {cityDisplayName(bookingTrip.departure_city, locale)} → {cityDisplayName(bookingTrip.arrival_city, locale)} · {formatShortDate(bookingTrip.departure_date)}
                      </div>
                    </div>
                    <button
                      onClick={() => setBookingStep('details')}
                      className="text-[13px] font-medium text-ink-400 hover:text-ink-600"
                    >
                      ← {t.prof_modify}
                    </button>
                  </div>
                  {submitErr && (
                    <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500 mb-4">
                      {submitErr}
                    </div>
                  )}
                  <StripePaymentForm
                    amountEuros={priceBreakdown(bookingTrip.compensation_min).total}
                    description={`Jibly · ${cityDisplayName(bookingTrip.departure_city, locale)} → ${cityDisplayName(bookingTrip.arrival_city, locale)}`}
                    onAuthorized={handlePaymentAuthorized}
                    onCancel={() => setBookingStep('details')}
                  />
                  {submitting && (
                    <div className="mt-4 text-center text-[13px] text-ink-400">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                      {t.prof_saving_booking}
                    </div>
                  )}
                </>
              )}
              {bookingStep === 'success' && (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">
                    {t.prof_payment_authorized}
                  </h3>
                  <p className="text-[15px] text-ink-400 mb-7 leading-relaxed">
                    {t.prof_payment_authorized_desc_before} <strong className="text-ink-600 num-display">{formatEuros(priceBreakdown(bookingTrip.compensation_min).total)}</strong>{t.prof_payment_authorized_desc_after}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/me">
                      <Button variant="secondary" fullWidth>
                        {t.prof_view_my_space}
                      </Button>
                    </Link>
                    <button
                      onClick={() => setBookingTrip(null)}
                      className="text-[14px] text-ink-400 hover:text-ink-600 py-2"
                    >
                      {t.prof_close}
                    </button>
                  </div>
                </div>
              )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Without this the gate refuses silently — the button would simply do
          nothing for an unverified user. */}
      {gate.modal}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TrustBadge — small card in the verifications grid.
// -----------------------------------------------------------------------------
//
// Three visual states:
//   - done + green:   verified, mint check
//   - done + neutral: factual info (member since, trip count) — no green,
//                     just lavender accent, no checkmark
//   - !done:          dimmed, subtle "not yet"
function TrustBadge({
  done,
  icon: Icon,
  label,
  hint,
  neutral = false,
}: {
  done: boolean;
  icon: any;
  label: string;
  hint: string;
  neutral?: boolean;
}) {
  const verified = done && !neutral;
  return (
    <div
      className={`
        rounded-2xl p-4 border transition-colors
        ${verified
          ? 'bg-mint-50/40 border-mint-200/70'
          : neutral && done
            ? 'bg-lavender-50/40 border-lavender-200/70'
            : 'bg-cream-50 border-ink-100'}
      `}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className={`
            w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
            ${verified
              ? 'bg-mint-500 text-white'
              : neutral && done
                ? 'bg-lavender-500 text-white'
                : 'bg-ink-100 text-ink-300'}
          `}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <div className="text-[12px] font-bold text-ink-600 leading-tight">
          {label}
        </div>
      </div>
      <div className="text-[11px] text-ink-400 leading-snug">
        {hint}
      </div>
    </div>
  );
}
