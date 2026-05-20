'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  Plane,
  Star,
  Calendar,
  Loader2,
  Search,
  ArrowRight,
  MapPin,
  Wallet,
  ShieldCheck,
  X,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/Badge';
import { formatShortDate, formatName, nameInitial } from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { TravelerTripRow, Profile } from '@/lib/supabase/types';
import { useAuth } from '@/lib/supabase/auth-provider';

type TripWithProfile = TravelerTripRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

export default function MatchesPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [trips, setTrips] = useState<TripWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search box (the prominent one at the top)
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Active filters (applied after the user clicks Search OR types in the
  // advanced filters)
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
    // Smooth scroll to results
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
      if (activeFrom && !tv.departure_city.toLowerCase().includes(activeFrom.toLowerCase())) return false;
      if (activeTo && !tv.arrival_city.toLowerCase().includes(activeTo.toLowerCase())) return false;
      if (activeDate && tv.departure_date > activeDate) return false;
      if (maxBudget !== '' && tv.compensation_min > Number(maxBudget)) return false;
      if (verifiedOnly && tv.profile?.verification_level !== 'id_verified' && tv.profile?.verification_level !== 'trusted') return false;
      return true;
    });
  }, [trips, activeFrom, activeTo, activeDate, maxBudget, verifiedOnly]);

  const hasActiveSearch = !!(activeFrom || activeTo || activeDate || maxBudget !== '' || verifiedOnly);

  return (
    <div className="min-h-screen">
      {/* HERO — search box prominent */}
      <section className="relative py-16 lg:py-24 px-5 sm:px-8 lg:px-12 overflow-hidden">
        {/* soft decorative halo */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-[480px] h-[480px] rounded-full bg-lavender-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[420px] h-[420px] rounded-full bg-butter-200/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream-50 border border-ink-50 text-[12px] font-semibold text-ink-500 tracking-[0.06em] uppercase mb-6">
              <Sparkles className="w-3 h-3 text-butter-500" />
              <span>Voyageurs disponibles</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink-600 leading-[1.02] tracking-[-0.035em] text-balance mb-4">
              Quelqu&apos;un va
              <br />
              <span className="italic font-light">déjà votre direction.</span>
            </h1>

            <p className="text-[17px] sm:text-[18px] text-ink-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Trouvez le voyageur qui apportera votre colis. Recherchez par destination, date ou budget.
            </p>
          </motion.div>

          {/* SEARCH BOX */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(24,20,16,0.12)] border border-ink-50/60 p-2 max-w-3xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-1">
              {/* From */}
              <div className="relative px-5 py-4 rounded-2xl hover:bg-cream-50/60 transition-colors text-start">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Départ
                </label>
                <div className="relative">
                  <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300" />
                  <input
                    type="text"
                    value={searchFrom}
                    onChange={(e) => setSearchFrom(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Paris, Casablanca…"
                    className="w-full ps-5 pe-2 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="hidden md:block w-px bg-ink-50 mx-0 my-3" />

              {/* To — but the separator above messes the grid. So we use a divider line baked into the cell */}
              <div className="relative px-5 py-4 rounded-2xl hover:bg-cream-50/60 transition-colors text-start md:border-l md:border-ink-50">
                <label className="block text-[11px] font-semibold text-ink-500 tracking-[0.08em] uppercase mb-1.5">
                  Arrivée
                </label>
                <div className="relative">
                  <MapPin className="absolute left-0 top-1 w-3.5 h-3.5 text-ink-300" />
                  <input
                    type="text"
                    value={searchTo}
                    onChange={(e) => setSearchTo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Londres, Marrakech…"
                    className="w-full ps-5 pe-2 bg-transparent text-[15px] text-ink-600 placeholder:text-ink-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="relative px-5 py-4 rounded-2xl hover:bg-cream-50/60 transition-colors text-start md:border-l md:border-ink-50">
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

              {/* Search button */}
              <button
                onClick={handleSearch}
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-ink-500 hover:bg-ink-600 text-cream-50 font-semibold text-[15px] transition-colors min-h-[64px]"
              >
                <Search className="w-4 h-4" strokeWidth={2.5} />
                <span className="md:hidden lg:inline">Rechercher</span>
              </button>
            </div>
          </motion.div>

          {/* Advanced filters link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-5 flex items-center justify-center gap-4"
          >
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvanced ? 'Masquer les filtres avancés' : 'Filtres avancés'}
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
          </motion.div>

          {/* Advanced filters drawer */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden max-w-3xl mx-auto"
              >
                <div className="mt-5 bg-white rounded-2xl border border-ink-50 p-5 grid sm:grid-cols-2 gap-5">
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
        </div>
      </section>

      {/* RESULTS */}
      <section id="results" className="py-10 lg:py-14 px-5 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Section heading */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-1">
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
              <h2 className="text-xl font-bold text-ink-600 mb-3 tracking-[-0.015em]">
                {hasActiveSearch ? 'Aucun voyageur sur cette route' : 'Aucun voyageur pour le moment'}
              </h2>
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
    </div>
  );
}

function TripCard({ trip, delay, t }: { trip: TripWithProfile; delay: number; t: any }) {
  const fullName = formatName(trip.profile?.full_name);
  const initial = nameInitial(trip.profile?.full_name);

  // Parse accepted categories from notes JSON
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
        {/* Top: avatar + name */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[15px] text-lavender-700 flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-600 truncate text-[15px] tracking-[-0.005em]">
              {fullName || '—'}
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

        {/* Route */}
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

        {/* Categories or note */}
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

        {/* Bottom: verification + price */}
        <div className="flex items-center justify-between pt-4 border-t border-ink-50/60 mt-auto">
          {trip.profile?.verification_level ? (
            <VerificationBadge level={trip.profile.verification_level} />
          ) : (
            <span />
          )}
          <div className="text-end">
            <div className="text-[11px] text-ink-300 tracking-[0.04em] uppercase">À partir de</div>
            <div className="font-bold text-ink-600 text-[18px] num-display tracking-[-0.015em]">
              {trip.compensation_min}€
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
