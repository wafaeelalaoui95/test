'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plane,
  Star,
  Calendar,
  MapPin,
  Search,
  Loader2,
  X,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroScene } from '@/components/illustrations/HeroScene';
import { VerificationBadge } from '@/components/ui/Badge';
import { CountryCityPicker } from '@/components/ui/CountryCityPicker';
import { getCitiesForCountry, cityDisplayName } from '@/lib/countries';
import { formatShortDate, nameInitial, displayName, priceBreakdown, formatEuros } from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { TravelerTripRow, Profile, ShippingRequestRow } from '@/lib/supabase/types';
import { useAuth } from '@/lib/supabase/auth-provider';
import { RespondToRequestModal } from '@/components/RespondToRequestModal';

type TripWithProfile = TravelerTripRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

type RequestWithProfile = ShippingRequestRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

type Mode = 'travelers' | 'requests';

/**
 * Does a row's location fall within the selected country? Used when the user
 * picks a country but no city. Matches on the stored country, and falls back
 * to "is this city one of that country's cities" so legacy rows (saved with an
 * empty country) still match.
 */
function cityInCountry(rowCountry: string, rowCity: string, selectedCountry: string): boolean {
  const sel = selectedCountry.toLowerCase();
  if (rowCountry && rowCountry.toLowerCase() === sel) return true;
  return getCitiesForCountry(selectedCountry).some((c) => c.toLowerCase() === rowCity.toLowerCase());
}

export default function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();

  // Mode toggle: are we showing travelers or shipping requests?
  const [mode, setMode] = useState<Mode>('travelers');

  // Live data — both sides
  const [trips, setTrips] = useState<TripWithProfile[]>([]);
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state for "respond to a request"
  const [respondingTo, setRespondingTo] = useState<RequestWithProfile | null>(null);

  // Search box state (uncontrolled until user clicks search)
  const [searchFrom, setSearchFrom] = useState('');
  const [searchFromCountry, setSearchFromCountry] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchToCountry, setSearchToCountry] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Active filters (applied after Search button or advanced toggle)
  const [activeFrom, setActiveFrom] = useState('');
  const [activeFromCountry, setActiveFromCountry] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [activeToCountry, setActiveToCountry] = useState('');
  const [activeDate, setActiveDate] = useState('');

  // Advanced filters (collapsible)
  const [maxBudget, setMaxBudget] = useState<number | ''>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Travelers is the default tab, so render it as soon as its query returns
    // — don't block the spinner on the requests query too (that was the main
    // source of the slow first paint). Requests load in the background.
    browser
      .listOpenTrips({ limit: 30 })
      .then((d) => { if (!cancelled) setTrips(d as TripWithProfile[]); })
      .catch(() => { if (!cancelled) setError(t.sec_load_error); })
      .finally(() => { if (!cancelled) setLoading(false); });
    browser
      .listOpenRequestsWithProfile()
      .then((d) => { if (!cancelled) setRequests(d as RequestWithProfile[]); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function handleSearch() {
    setActiveFrom(searchFrom);
    setActiveFromCountry(searchFromCountry);
    setActiveTo(searchTo);
    setActiveToCountry(searchToCountry);
    setActiveDate(searchDate);
    const el = document.getElementById('results');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetAll() {
    setSearchFrom('');
    setSearchFromCountry('');
    setSearchTo('');
    setSearchToCountry('');
    setSearchDate('');
    setActiveFrom('');
    setActiveFromCountry('');
    setActiveTo('');
    setActiveToCountry('');
    setActiveDate('');
    setMaxBudget('');
  }

  const filteredTrips = useMemo(() => {
    const cityHit = (city: string, q: string) => city.toLowerCase().includes(q.toLowerCase());
    // A side matches if the exact city matches OR (broaden) the row is in the
    // searched country. So "Paris → Tunis" also surfaces other France→Tunisia
    // trips instead of only the exact city pair.
    const depExact = (tv: TripWithProfile) => !activeFrom || cityHit(tv.departure_city, activeFrom);
    const arrExact = (tv: TripWithProfile) => !activeTo || cityHit(tv.arrival_city, activeTo);
    const out = trips.filter((tv) => {
      // Hide the user's own trips — they're not going to book themselves.
      // Anonymous users see everything (user is null).
      if (user && tv.user_id === user.id) return false;
      const depOk =
        (!activeFrom && !activeFromCountry) ||
        depExact(tv) ||
        (!!activeFromCountry && cityInCountry(tv.departure_country, tv.departure_city, activeFromCountry));
      if (!depOk) return false;
      const arrOk =
        (!activeTo && !activeToCountry) ||
        arrExact(tv) ||
        (!!activeToCountry && cityInCountry(tv.arrival_country, tv.arrival_city, activeToCountry));
      if (!arrOk) return false;
      if (activeDate && tv.departure_date > activeDate) return false;
      if (maxBudget !== '' && tv.compensation_min > Number(maxBudget)) return false;
      return true;
    });
    // Exact city matches first, broadened (country-level) ones after.
    return out.sort((a, b) => {
      const ra = depExact(a) && arrExact(a) ? 0 : 1;
      const rb = depExact(b) && arrExact(b) ? 0 : 1;
      return ra - rb;
    });
  }, [trips, user, activeFrom, activeFromCountry, activeTo, activeToCountry, activeDate, maxBudget]);

  // Same filtering logic but applied to shipping requests:
  //   - hide my own requests
  //   - filter by route (from/to substring)
  //   - filter by date: keep requests whose deadline is >= the chosen date
  //     (the chosen date represents "I can deliver before this")
  //   - filter by budget: keep requests where budget >= maxBudget (the traveler
  //     wants requests that pay at least the entered amount)
  //   - verified filter is symmetric: check the SENDER's verification
  const filteredRequests = useMemo(() => {
    const cityHit = (city: string, q: string) => city.toLowerCase().includes(q.toLowerCase());
    const depExact = (r: RequestWithProfile) => !activeFrom || cityHit(r.pickup_city, activeFrom);
    const arrExact = (r: RequestWithProfile) => !activeTo || cityHit(r.destination_city, activeTo);
    const out = requests.filter((r) => {
      if (user && r.user_id === user.id) return false;
      const depOk =
        (!activeFrom && !activeFromCountry) ||
        depExact(r) ||
        (!!activeFromCountry && cityInCountry(r.pickup_country, r.pickup_city, activeFromCountry));
      if (!depOk) return false;
      const arrOk =
        (!activeTo && !activeToCountry) ||
        arrExact(r) ||
        (!!activeToCountry && cityInCountry(r.destination_country, r.destination_city, activeToCountry));
      if (!arrOk) return false;
      if (activeDate && r.desired_delivery_date < activeDate) return false;
      if (maxBudget !== '' && r.budget < Number(maxBudget)) return false;
      return true;
    });
    return out.sort((a, b) => {
      const ra = depExact(a) && arrExact(a) ? 0 : 1;
      const rb = depExact(b) && arrExact(b) ? 0 : 1;
      return ra - rb;
    });
  }, [requests, user, activeFrom, activeFromCountry, activeTo, activeToCountry, activeDate, maxBudget]);

  const hasActiveSearch = !!(activeFrom || activeFromCountry || activeTo || activeToCountry || activeDate || maxBudget !== '');

  return (
    <div>
      {/* HERO — editorial split with paper plane + search box side by side */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-8 sm:pt-10 lg:pt-14 pb-8 lg:pb-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* LEFT — claim + search box */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-[44px] sm:text-5xl lg:text-7xl font-extrabold text-ink-600 leading-[1.02] tracking-[-0.035em] text-balance"
              >
                {t.hero_title_1}{' '}
                <span className="italic font-medium text-lavender-600">{t.hero_title_2}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-7 text-lg sm:text-xl text-ink-400 max-w-measure leading-relaxed"
              >
                {t.hero_subtitle}
              </motion.p>

            </div>

            {/* RIGHT — paper plane scene (nudged up) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="lg:col-span-5 order-1 lg:order-2"
            >
              <div className="relative max-w-xs sm:max-w-sm mx-auto lg:max-w-sm lg:ms-auto lg:me-0">
                <HeroScene className="w-full" />
              </div>
            </motion.div>
          </div>

          {/* SEARCH BOX — full width, below the hero split */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 lg:mt-2"
          >
            <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.10)] border border-ink-50/60 p-2">
              <div className="flex flex-col md:flex-row md:items-stretch">
                <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                  <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                    {t.search_label_from}
                  </label>
                  <CountryCityPicker
                    country={searchFromCountry}
                    city={searchFrom}
                    onChange={({ country, city }) => {
                      setSearchFromCountry(country);
                      setSearchFrom(city);
                    }}
                    enableNearby
                  />
                </div>

                <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

                <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                  <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                    {t.search_label_to}
                  </label>
                  <CountryCityPicker
                    country={searchToCountry}
                    city={searchTo}
                    onChange={({ country, city }) => {
                      setSearchToCountry(country);
                      setSearchTo(city);
                    }}
                  />
                </div>

                <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

                <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                  <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                    {t.search_label_before}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300" />
                    <input
                      type="date"
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full ps-5 pe-2 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none num-display"
                    />
                  </div>
                </div>

                <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

                <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                  <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                    {t.disc_filter_budget}{' '}
                    <span className="normal-case tracking-normal font-normal text-ink-300 lowercase">({t.common_optional})</span>
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300" />
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="50 €"
                      className="w-full ps-5 pe-2 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none num-display"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-end px-2 pt-2 md:pt-0 md:ps-1">
                  <button
                    onClick={handleSearch}
                    aria-label={t.search_button}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 font-semibold text-[14px] transition-colors w-full md:w-auto"
                  >
                    <Search className="w-4 h-4" strokeWidth={2.5} />
                    <span>{t.search_button}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Reset + social proof */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              {hasActiveSearch && (
                <button
                  onClick={resetAll}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 hover:text-ink-600"
                >
                  <X className="w-3 h-3" />
                  {t.disc_clear}
                </button>
              )}
              <div className="ms-auto flex items-center gap-2 text-[13px] text-ink-400">
                <Star className="w-3.5 h-3.5 fill-butter-400 text-butter-400" strokeWidth={0} />
                <span className="font-semibold text-ink-500">4.9</span>
                <span>·</span>
                <span>{t.hero_social_proof}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* RESULTS — full traveler list with active filters */}
      <section id="results" className="border-t border-ink-50 section-solid">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-16 lg:py-24">

          {/* MODE TOGGLE — Travelers vs Requests */}
          <div className="mb-10 flex items-center justify-center">
            <div className="inline-flex items-center bg-white rounded-full p-1 border border-ink-100 shadow-[0_1px_3px_rgba(24,20,16,0.04)]">
              <button
                onClick={() => setMode('travelers')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-colors ${
                  mode === 'travelers'
                    ? 'bg-ink-500 text-cream-50'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                {t.disc_tab_travelers}
              </button>
              <button
                onClick={() => setMode('requests')}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-colors ${
                  mode === 'requests'
                    ? 'bg-ink-500 text-cream-50'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <span>📦</span>
                {t.disc_tab_requests}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
                {mode === 'travelers' ? t.disc_heading_travelers : t.disc_heading_requests}
              </h2>
            </div>
            <Link href={user ? (mode === 'travelers' ? '/envoyer' : '/voyager') : '/login'}>
              <Button size="sm">
                {mode === 'travelers' ? t.disc_publish_request : t.disc_publish_trip}
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-blush-50 rounded-2xl p-6 text-center text-blush-500 text-[14px] max-w-2xl mx-auto">
              {error}
            </div>
          ) : mode === 'travelers' ? (
            filteredTrips.length === 0 ? (
              <EmptyResults
                hasActiveSearch={hasActiveSearch}
                onReset={resetAll}
                user={user}
                kind="travelers"
                t={t}
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6">
                {filteredTrips.map((tv, i) => (
                  <div key={tv.id} className="snap-start shrink-0 w-[80%] sm:w-auto">
                    <TripCard trip={tv} delay={(i % 6) * 0.04} t={t} />
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredRequests.length === 0 ? (
              <EmptyResults
                hasActiveSearch={hasActiveSearch}
                onReset={resetAll}
                user={user}
                kind="requests"
                t={t}
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-5 px-5 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 lg:gap-6">
                {filteredRequests.map((r, i) => (
                  <div key={r.id} className="snap-start shrink-0 w-[80%] sm:w-auto">
                    <RequestCard
                      request={r}
                      delay={(i % 6) * 0.04}
                      t={t}
                      onRespond={() => setRespondingTo(r)}
                    />
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* Respond-to-request modal */}
      <AnimatePresence>
        {respondingTo && (
          <RespondToRequestModal
            request={respondingTo}
            onClose={() => setRespondingTo(null)}
            onSuccess={() => {
              setRespondingTo(null);
              // Could re-fetch to mark this request as "already responded",
              // but for MVP we let the user just see their own /me page.
            }}
          />
        )}
      </AnimatePresence>

      {/* HOW IT WORKS — contextual to the active tab (send vs transport) */}
      {(() => {
        const isSend = mode === 'travelers';
        const title = isSend ? t.hiw_send_title : t.hiw_transport_title;
        const cta = isSend ? t.hiw_send_cta : t.hiw_transport_cta;
        const href = isSend ? '/envoyer' : '/voyager';
        const steps = isSend
          ? [
              { icon: '🔎', title: t.hiw_send_s1t, body: t.hiw_send_1 },
              { icon: '🔒', title: t.hiw_send_s2t, body: t.hiw_send_2 },
              { icon: '📦', title: t.hiw_send_s3t, body: t.hiw_send_3 },
            ]
          : [
              { icon: '🧭', title: t.hiw_transport_s1t, body: t.hiw_transport_1 },
              { icon: '🤝', title: t.hiw_transport_s2t, body: t.hiw_transport_2 },
              { icon: '💰', title: t.hiw_transport_s3t, body: t.hiw_transport_3 },
            ];
        return (
          <section className="border-t border-ink-50">
            <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
              <div className="text-center mb-10">
                <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
                  {t.hiw_eyebrow}
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em]">
                  {title}
                </h2>
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                {steps.map((step, i) => (
                  <motion.div
                    key={`${mode}-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="bg-white rounded-3xl p-6 border border-ink-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-2xl bg-cream-100 flex items-center justify-center text-2xl">
                        {step.icon}
                      </div>
                      <div className="text-[32px] font-extrabold text-lavender-200 tracking-tighter leading-none num-display">
                        {i + 1}
                      </div>
                    </div>
                    <h3 className="text-[16px] font-bold text-ink-600 mb-1.5 tracking-[-0.01em]">
                      {step.title}
                    </h3>
                    <p className="text-[14px] text-ink-500 leading-relaxed">{step.body}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-9 text-center">
                <Link href={user ? href : '/login'}>
                  <Button>
                    {cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        );
      })()}

      {/* FINAL CTA */}
      <section className="border-t border-ink-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="bg-ink-500 rounded-3xl px-8 py-16 lg:px-20 lg:py-24">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-cream-50 leading-[1.05] tracking-[-0.03em] text-balance">
                {t.cta_ready}
              </h2>
              <p className="mt-5 text-lg text-ink-100 max-w-measure">
                {t.cta_subtitle}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <Link href="/envoyer">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    {t.cta_send_btn}
                  </Button>
                </Link>
                <Link href="/voyager">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-ink-300 text-cream-50 hover:bg-ink-600 hover:border-ink-300">
                    {t.cta_travel_btn}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TripCard({ trip, delay, t }: { trip: TripWithProfile; delay: number; t: any }) {
  const { locale } = useI18n();
  const name = displayName(trip.profile?.full_name);
  const initial = nameInitial(trip.profile?.full_name);

  let categories: string[] = [];
  let plainNote: string | null = null;
  if (trip.notes) {
    try {
      const parsed = JSON.parse(trip.notes);
      if (Array.isArray(parsed?.accepted_categories)) {
        categories = parsed.accepted_categories;
      }
    } catch {
      plainNote = trip.notes;
    }
  }

  return (
    <Link href={`/u/${trip.user_id}`} className="block group">
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-30px' }}
        transition={{ duration: 0.4, delay }}
        className="bg-white rounded-2xl border border-ink-50 group-hover:border-ink-200 group-hover:shadow-[0_8px_30px_-12px_rgba(24,20,16,0.12)] transition-all flex flex-col h-full overflow-hidden"
      >
        {/* Ticket body */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[13px] text-lavender-700 flex-shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink-600 truncate text-[15px] tracking-[-0.005em]">
                  {name || '-'}
                </span>
                {trip.profile?.verification_level && (
                  <span className="flex-shrink-0">
                    <VerificationBadge level={trip.profile.verification_level} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[13px] text-ink-400">
                <Star className="w-3 h-3 fill-butter-400 text-butter-400" strokeWidth={0} />
                <span className="font-medium text-ink-500 num-display">
                  {trip.profile?.rating?.toFixed(1) ?? '-'}
                </span>
                <span>· <span className="num-display">{trip.profile?.trips_completed ?? 0}</span> {t.disc_trips_count}</span>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-2 text-[16px] font-bold text-ink-600 mb-1 tracking-[-0.015em]">
              <span className="truncate">{cityDisplayName(trip.departure_city, locale)}</span>
              <Plane className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
              <span className="truncate">{cityDisplayName(trip.arrival_city, locale)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-ink-400">
              <Calendar className="w-3 h-3" />
              <span className="num-display">{formatShortDate(trip.departure_date)}</span>
              {trip.flight_time && <span>· {trip.flight_time}</span>}
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="flex-1 content-start">
              <div className="text-[10px] font-semibold text-ink-400 tracking-[0.06em] uppercase mb-1.5">
                {t.disc_can_transport}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 3).map((cat) => {
                  const meta = ITEM_CATEGORIES.find((c) => c.value === cat);
                  if (!meta) return null;
                  return (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-lavender-50 text-lavender-700 rounded-full text-[11px] font-medium"
                    >
                      <span>{meta.icon}</span>
                      <span>{t[meta.labelKey]}</span>
                    </span>
                  );
                })}
                {categories.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-cream-100 text-ink-400 rounded-full text-[11px] font-medium">
                    +{categories.length - 3}
                  </span>
                )}
              </div>
            </div>
          ) : plainNote ? (
            <p className="text-[13px] text-ink-400 line-clamp-2 leading-relaxed flex-1">
              {plainNote}
            </p>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* Boarding-pass stub — dashed perforation + notches + price + CTA */}
        <div className="relative border-t-2 border-dashed border-ink-100 bg-lavender-50 px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cream-50" />
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cream-50" />
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-lavender-600">
              {t.disc_price_from}
            </div>
            <div className="font-bold text-ink-600 text-[16px] num-display tracking-[-0.015em]">
              {formatEuros(priceBreakdown(trip.compensation_min).total)}
            </div>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-ink-500 group-hover:bg-ink-600 text-cream-50 text-[12px] font-semibold transition-colors">
            {t.disc_book_trip}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </motion.article>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Shared empty-state component for both "no travelers" and "no requests"
// ---------------------------------------------------------------------------
function EmptyResults({
  hasActiveSearch,
  onReset,
  user,
  kind,
  t,
}: {
  hasActiveSearch: boolean;
  onReset: () => void;
  user: any;
  kind: 'travelers' | 'requests';
  t: any;
}) {
  const isTravelers = kind === 'travelers';
  return (
    <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-ink-100 max-w-2xl mx-auto">
      <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
        <Search className="w-6 h-6 text-ink-300" />
      </div>
      <h3 className="text-xl font-bold text-ink-600 mb-3 tracking-[-0.015em]">
        {hasActiveSearch
          ? isTravelers
            ? t.disc_empty_travelers_route
            : t.disc_empty_requests_route
          : isTravelers
            ? t.disc_empty_travelers
            : t.disc_empty_requests}
      </h3>
      <p className="text-[15px] text-ink-400 mb-8 max-w-md mx-auto leading-relaxed">
        {hasActiveSearch
          ? t.disc_empty_hint_search
          : isTravelers
            ? t.disc_empty_hint_travelers
            : t.disc_empty_hint_requests}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {hasActiveSearch && (
          <Button onClick={onReset} variant="outline">
            {t.disc_clear_search}
          </Button>
        )}
        <Link href={user ? (isTravelers ? '/envoyer' : '/voyager') : '/login'}>
          <Button>{isTravelers ? t.disc_publish_request : t.disc_publish_trip}</Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RequestCard — displays a shipping request to potential travelers
// ---------------------------------------------------------------------------
function RequestCard({
  request,
  delay,
  t,
  onRespond,
}: {
  request: RequestWithProfile;
  delay: number;
  t: any;
  onRespond: () => void;
}) {
  const { locale } = useI18n();
  const name = displayName(request.profile?.full_name);
  const initial = nameInitial(request.profile?.full_name);
  const category = ITEM_CATEGORIES.find((c) => c.value === request.item_category);

  // "Created X days ago" — simple stale freshness signal so travelers see
  // which requests are still likely to be relevant.
  const ageDays = Math.floor(
    (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageLabel =
    ageDays === 0 ? t.disc_age_today
      : ageDays === 1 ? t.disc_age_yesterday
      : t.disc_age_days_ago.replace('{n}', String(ageDays));

  // For the traveler we show what they'll receive (net), since the budget
  // stored is the TTC total the sender is willing to pay. Net = budget / 1.15.
  // We use Math.round to keep round numbers; the exact figure shows in the modal.
  const netTraveler = Math.round(request.budget / 1.15);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl border border-ink-50 hover:border-ink-200 hover:shadow-[0_8px_30px_-12px_rgba(24,20,16,0.12)] transition-all flex flex-col h-full overflow-hidden"
    >
      {/* Ticket body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[13px] text-ink-500 flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink-600 truncate text-[15px] tracking-[-0.005em]">{name || '-'}</span>
              {request.profile?.verification_level && (
                <span className="flex-shrink-0">
                  <VerificationBadge level={request.profile.verification_level} />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-ink-400">
              <Star className="w-3 h-3 fill-butter-400 text-butter-400" strokeWidth={0} />
              <span className="font-medium text-ink-500 num-display">
                {request.profile?.rating?.toFixed(1) ?? '-'}
              </span>
              <span>· {ageLabel}</span>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-baseline gap-2 text-[16px] font-bold text-ink-600 mb-1 tracking-[-0.015em]">
            <span className="truncate">{cityDisplayName(request.pickup_city, locale)}</span>
            <Plane className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />
            <span className="truncate">{cityDisplayName(request.destination_city, locale)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-400">
            <Calendar className="w-3 h-3" />
            <span>{t.search_label_before}</span>
            <span className="num-display">{formatShortDate(request.desired_delivery_date)}</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] font-semibold text-ink-400 tracking-[0.06em] uppercase mb-1.5">
            {t.disc_to_transport}
          </div>
          {category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-lavender-50 text-lavender-700 rounded-full text-[11px] font-medium">
              <span>{category.icon}</span>
              <span>{t[category.labelKey]}</span>
            </span>
          )}
          {request.item_description && (
            <p className="text-[13px] text-ink-500 line-clamp-2 leading-relaxed mt-2">
              « {request.item_description} »
            </p>
          )}
        </div>
      </div>

      {/* Boarding-pass stub — perforation + notches + price + respond CTA */}
      <div className="relative border-t-2 border-dashed border-ink-100 bg-lavender-50 px-4 pt-3 pb-3">
        <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cream-50" />
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cream-50" />
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-lavender-600">
            {t.disc_you_receive}
          </span>
          <span className="font-bold text-mint-600 text-[16px] num-display tracking-[-0.015em]">
            ~{formatEuros(netTraveler)}
          </span>
        </div>
        <button
          onClick={onRespond}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors"
        >
          {t.disc_i_can_do_it}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.article>
  );
}
