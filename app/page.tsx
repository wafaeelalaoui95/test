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
  SlidersHorizontal,
  X,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroScene } from '@/components/illustrations/HeroScene';
import { VerificationBadge } from '@/components/ui/Badge';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { formatShortDate, nameInitial, displayName, priceBreakdown, formatEuros } from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { TravelerTripRow, Profile } from '@/lib/supabase/types';
import { useAuth } from '@/lib/supabase/auth-provider';

type TripWithProfile = TravelerTripRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

export default function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();

  // Live data
  const [trips, setTrips] = useState<TripWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search box state (uncontrolled until user clicks search)
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Active filters (applied after Search button or advanced toggle)
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');
  const [activeDate, setActiveDate] = useState('');

  // Advanced filters (collapsible)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxBudget, setMaxBudget] = useState<number | ''>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    browser
      .listOpenTrips({ limit: 50 })
      .then((data) => {
        if (cancelled) return;
        setTrips(data as TripWithProfile[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Erreur de chargement');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  function handleSearch() {
    setActiveFrom(searchFrom);
    setActiveTo(searchTo);
    setActiveDate(searchDate);
    const el = document.getElementById('results');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetAll() {
    setSearchFrom('');
    setSearchTo('');
    setSearchDate('');
    setActiveFrom('');
    setActiveTo('');
    setActiveDate('');
    setMaxBudget('');
    setVerifiedOnly(false);
  }

  const filteredTrips = useMemo(() => {
    return trips.filter((tv) => {
      // Hide the user's own trips — they're not going to book themselves.
      // Anonymous users see everything (user is null).
      if (user && tv.user_id === user.id) return false;
      if (activeFrom && !tv.departure_city.toLowerCase().includes(activeFrom.toLowerCase())) return false;
      if (activeTo && !tv.arrival_city.toLowerCase().includes(activeTo.toLowerCase())) return false;
      if (activeDate && tv.departure_date > activeDate) return false;
      if (maxBudget !== '' && tv.compensation_min > Number(maxBudget)) return false;
      if (verifiedOnly && tv.profile?.verification_level !== 'id_verified' && tv.profile?.verification_level !== 'trusted') return false;
      return true;
    });
  }, [trips, user, activeFrom, activeTo, activeDate, maxBudget, verifiedOnly]);

  const hasActiveSearch = !!(activeFrom || activeTo || activeDate || maxBudget !== '' || verifiedOnly);

  return (
    <div>
      {/* HERO — editorial split with paper plane + search box side by side */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-24 pb-14 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
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

              {/* SEARCH BOX */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-10"
              >
                <div className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.10)] border border-ink-50/60 p-2">
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                      <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                        Départ
                      </label>
                      <CityCombobox
                        value={searchFrom}
                        onChange={setSearchFrom}
                        placeholder="Paris, Casablanca…"
                      />
                    </div>

                    <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

                    <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                      <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                        Arrivée
                      </label>
                      <CityCombobox
                        value={searchTo}
                        onChange={setSearchTo}
                        placeholder="Londres, Marrakech…"
                      />
                    </div>

                    <div className="hidden md:block w-px bg-ink-50 my-3 flex-shrink-0" />

                    <div className="relative px-5 py-3.5 rounded-2xl hover:bg-cream-50/60 transition-colors text-start flex-1 min-w-0">
                      <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                        Avant le
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

                    <div className="flex items-center justify-center md:justify-end px-2 pt-2 md:pt-0 md:ps-1">
                      <button
                        onClick={handleSearch}
                        aria-label="Rechercher"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 font-semibold text-[14px] transition-colors w-full md:w-auto"
                      >
                        <Search className="w-4 h-4" strokeWidth={2.5} />
                        <span>Rechercher</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filters link + reset */}
                <div className="mt-4 flex items-center gap-4 flex-wrap">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {showAdvanced ? 'Masquer les filtres' : 'Filtres avancés'}
                    {(maxBudget !== '' || verifiedOnly) && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-lavender-500 text-cream-50 text-[10px] font-bold ms-1">
                        {[maxBudget !== '' ? '1' : '', verifiedOnly ? '1' : ''].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  {hasActiveSearch && (
                    <button
                      onClick={resetAll}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 hover:text-ink-600"
                    >
                      <X className="w-3 h-3" />
                      Effacer
                    </button>
                  )}

                  <div className="ms-auto flex items-center gap-2 text-[13px] text-ink-400">
                    <Star className="w-3.5 h-3.5 fill-butter-400 text-butter-400" strokeWidth={0} />
                    <span className="font-semibold text-ink-500">4.9</span>
                    <span>·</span>
                    <span>{t.hero_social_proof}</span>
                  </div>
                </div>

                {/* Advanced filters drawer */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 bg-white rounded-2xl border border-ink-50 p-5 grid sm:grid-cols-2 gap-5">
                        <div>
                          <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-500 tracking-[0.06em] uppercase mb-2">
                            <Wallet className="w-3 h-3" />
                            Budget maximum
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={5}
                            value={maxBudget}
                            onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="50 €"
                            className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 num-display"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-semibold text-ink-500 tracking-[0.06em] uppercase mb-2">
                            Confiance
                          </label>
                          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-cream-50 border border-ink-100 cursor-pointer hover:bg-cream-100">
                            <input
                              type="checkbox"
                              checked={verifiedOnly}
                              onChange={(e) => setVerifiedOnly(e.target.checked)}
                              className="rounded accent-lavender-500"
                            />
                            <ShieldCheck className="w-3.5 h-3.5 text-ink-400" />
                            <span className="text-[14px] text-ink-500 font-medium">Identité vérifiée uniquement</span>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* RIGHT — paper plane scene */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="lg:col-span-5 order-1 lg:order-2"
            >
              <div className="relative max-w-md mx-auto lg:max-w-none">
                <HeroScene className="w-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* RESULTS — full traveler list with active filters */}
      <section id="results" className="border-t border-ink-50 section-solid">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-16 lg:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-1">
                {hasActiveSearch ? (
                  <>
                    <span className="num-display">{filteredTrips.length}</span> voyageur{filteredTrips.length > 1 ? 's' : ''} trouvé{filteredTrips.length > 1 ? 's' : ''}
                  </>
                ) : (
                  <>Voyageurs disponibles</>
                )}
              </h2>
              <p className="text-[14px] text-ink-400">
                {hasActiveSearch ? (
                  <>
                    Sur <span className="num-display font-medium text-ink-500">{trips.length}</span> annonces actives
                  </>
                ) : (
                  <>
                    <span className="num-display font-medium text-ink-500">{trips.length}</span> personnes prêtes à aider
                  </>
                )}
              </p>
            </div>
            <Link href={user ? '/envoyer' : '/login?next=/envoyer'}>
              <Button size="sm">
                Publier ma demande
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
          ) : filteredTrips.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-ink-100 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
                <Search className="w-6 h-6 text-ink-300" />
              </div>
              <h3 className="text-xl font-bold text-ink-600 mb-3 tracking-[-0.015em]">
                {hasActiveSearch ? 'Aucun voyageur sur cette route' : 'Aucun voyageur pour le moment'}
              </h3>
              <p className="text-[15px] text-ink-400 mb-8 max-w-md mx-auto leading-relaxed">
                {hasActiveSearch
                  ? 'Essayez d\'élargir vos critères, ou publiez une demande — on vous prévient dès qu\'un voyageur correspond.'
                  : 'Publiez votre demande, on vous prévient dès qu\'un voyageur passe par chez vous.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {hasActiveSearch && (
                  <Button onClick={resetAll} variant="outline">
                    Effacer la recherche
                  </Button>
                )}
                <Link href={user ? '/envoyer' : '/login?next=/envoyer'}>
                  <Button>Publier ma demande</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
              {filteredTrips.map((tv, i) => (
                <TripCard key={tv.id} trip={tv} delay={(i % 6) * 0.04} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-ink-50">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="max-w-2xl mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] text-balance">
              {t.how_title}
            </h2>
            <p className="mt-5 text-lg text-ink-400 max-w-measure">{t.how_subtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-x-10 gap-y-12 lg:gap-x-16">
            {[
              { num: '01', title: t.how_step1_title, text: t.how_step1_text },
              { num: '02', title: t.how_step2_title, text: t.how_step2_text },
              { num: '03', title: t.how_step3_title, text: t.how_step3_text },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative"
              >
                <div className="text-[13px] font-semibold text-ink-300 tracking-[0.1em] mb-5">{step.num}</div>
                <h3 className="text-xl lg:text-2xl font-bold text-ink-600 mb-3 tracking-[-0.015em]">{step.title}</h3>
                <p className="text-[15px] text-ink-400 leading-relaxed max-w-xs">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-t border-ink-50 section-solid">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] text-balance">
              {t.home_trust_title}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
            {[
              { label: t.trust_identity, num: '01' },
              { label: t.trust_data, num: '02' },
              { label: t.trust_messaging, num: '03' },
              { label: t.trust_support, num: '04' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[13px] font-semibold text-ink-300 tracking-[0.1em] mb-3">{item.num}</div>
                <p className="text-[17px] font-medium text-ink-600 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <Link
              href="/trust"
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-600 hover:text-lavender-700 group"
            >
              {t.nav_trust}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="border-t border-ink-50">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-12 py-24 lg:py-32">
          <motion.figure
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <blockquote className="text-2xl sm:text-3xl lg:text-4xl font-medium text-ink-600 leading-[1.25] tracking-[-0.02em] text-balance">
              <span className="text-ink-200 me-1">&ldquo;</span>
              {t.testimonial_quote}
              <span className="text-ink-200 ms-0.5">&rdquo;</span>
            </blockquote>
            <figcaption className="mt-8 text-[15px] text-ink-400">
              <span className="font-semibold text-ink-600">{t.testimonial_author}</span>
            </figcaption>
          </motion.figure>
        </div>
      </section>

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
        className="bg-white rounded-3xl p-6 border border-ink-50 group-hover:border-ink-200 group-hover:shadow-[0_8px_30px_-12px_rgba(24,20,16,0.12)] transition-all flex flex-col h-full"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[15px] text-lavender-700 flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-600 truncate text-[15px] tracking-[-0.005em]">
              {name || '—'}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-ink-400">
              <Star className="w-3 h-3 fill-butter-400 text-butter-400" strokeWidth={0} />
              <span className="font-medium text-ink-500 num-display">
                {trip.profile?.rating?.toFixed(1) ?? '—'}
              </span>
              <span>· <span className="num-display">{trip.profile?.trips_completed ?? 0}</span> trajets</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-2 text-[18px] font-bold text-ink-600 mb-1.5 tracking-[-0.015em]">
            <span>{trip.departure_city}</span>
            <Plane className="w-4 h-4 text-ink-300" />
            <span>{trip.arrival_city}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
            <Calendar className="w-3 h-3" />
            <span className="num-display">{formatShortDate(trip.departure_date)}</span>
            {trip.flight_time && <span>· {trip.flight_time}</span>}
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-5 flex-1 content-start">
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
        ) : plainNote ? (
          <p className="text-[14px] text-ink-400 mb-5 line-clamp-2 leading-relaxed flex-1">
            {plainNote}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center justify-between pt-4 border-t border-ink-50/60 mt-auto">
          {trip.profile?.verification_level ? (
            <VerificationBadge level={trip.profile.verification_level} />
          ) : (
            <span />
          )}
          <div className="text-end">
            <div className="text-[11px] text-ink-300 tracking-[0.04em] uppercase">À partir de</div>
            <div className="font-bold text-ink-600 text-[18px] num-display tracking-[-0.015em]">
              {formatEuros(priceBreakdown(trip.compensation_min).total)}
            </div>
            <div className="text-[10px] text-ink-300 mt-0.5">protection Jibly incluse</div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
