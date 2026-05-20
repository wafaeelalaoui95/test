'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Plane, Star, Clock, MessageCircle, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/Badge';
import { formatShortDate } from '@/lib/utils';
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

  const [showFilters, setShowFilters] = useState(false);
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [maxDate, setMaxDate] = useState('');
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

  const filteredTrips = useMemo(() => {
    return trips.filter((tv) => {
      if (fromFilter && !tv.departure_city.toLowerCase().includes(fromFilter.toLowerCase())) return false;
      if (toFilter && !tv.arrival_city.toLowerCase().includes(toFilter.toLowerCase())) return false;
      if (maxDate && tv.departure_date > maxDate) return false;
      if (maxBudget !== '' && tv.compensation_min > Number(maxBudget)) return false;
      if (verifiedOnly && tv.profile?.verification_level !== 'id_verified' && tv.profile?.verification_level !== 'trusted') return false;
      return true;
    });
  }, [trips, fromFilter, toFilter, maxDate, maxBudget, verifiedOnly]);

  const hasActiveFilters = !!fromFilter || !!toFilter || !!maxDate || maxBudget !== '' || verifiedOnly;

  function resetFilters() {
    setFromFilter('');
    setToFilter('');
    setMaxDate('');
    setMaxBudget('');
    setVerifiedOnly(false);
  }

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10"
        >
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] text-balance mb-3">
              Voyageurs disponibles
            </h1>
            <p className="text-lg text-ink-400">
              <span className="font-semibold text-ink-600 num-display">{filteredTrips.length}</span>{' '}
              personnes prêtes à aider.
              {hasActiveFilters && (
                <span className="text-[14px] text-ink-300">
                  {' '}· <span className="num-display">{trips.length}</span> au total
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-[14px] font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-lavender-300 bg-lavender-50 text-lavender-700'
                  : 'border-ink-100 hover:border-ink-200 text-ink-500'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-lavender-500 text-cream-50 text-[10px] font-bold ml-0.5">
                  {[fromFilter, toFilter, maxDate, maxBudget !== '' ? '1' : '', verifiedOnly ? '1' : ''].filter(Boolean).length}
                </span>
              )}
            </button>
            <Link href={user ? '/envoyer' : '/login?next=/envoyer'}>
              <Button size="sm">Publier ma demande</Button>
            </Link>
          </div>
        </motion.div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 bg-white rounded-2xl p-5 border border-ink-100"
          >
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Départ</label>
                <input
                  type="text"
                  value={fromFilter}
                  onChange={(e) => setFromFilter(e.target.value)}
                  placeholder="Paris…"
                  className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Arrivée</label>
                <input
                  type="text"
                  value={toFilter}
                  onChange={(e) => setToFilter(e.target.value)}
                  placeholder="Casablanca…"
                  className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Avant le</label>
                <input
                  type="date"
                  value={maxDate}
                  onChange={(e) => setMaxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-500 mb-1.5">Budget max</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="50"
                  className="w-full px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-cream-50">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded accent-lavender-500"
                  />
                  <span className="text-[13px] text-ink-500 font-medium">Identité vérifiée</span>
                </label>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end mt-3 pt-3 border-t border-ink-50">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600"
                >
                  <X className="w-3 h-3" />
                  Effacer les filtres
                </button>
              </div>
            )}
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-ink-300 animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-blush-50 rounded-2xl p-6 text-center text-blush-500 text-[14px] max-w-2xl mx-auto">
            {error}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-dashed border-ink-100 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-ink-600 mb-3 tracking-[-0.015em]">Aucun voyageur pour le moment</h2>
            <p className="text-[15px] text-ink-400 mb-8">
              {hasActiveFilters ? 'Aucun voyageur ne correspond à ces filtres. Essayez d\'élargir.' : 'Publiez votre demande, on vous prévient dès qu\'un voyageur passe.'}
            </p>
            {hasActiveFilters ? (
              <Button onClick={resetFilters} variant="outline">
                Effacer les filtres
              </Button>
            ) : (
              <Link href={user ? '/envoyer' : '/login?next=/envoyer'}>
                <Button>Publier ma demande</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {filteredTrips.map((tv, i) => (
              <motion.div
                key={tv.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="bg-white rounded-2xl p-6 border border-ink-50 flex flex-col"
              >
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[14px] text-lavender-700 flex-shrink-0">
                    {(tv.profile?.full_name ?? '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink-600 text-[15px] truncate">{tv.profile?.full_name ?? 'Voyageur'}</div>
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-400 mt-0.5">
                      <Star className="w-3 h-3 text-butter-500 fill-butter-500" />
                      <span className="num-display">{(tv.profile?.rating ?? 0).toFixed(1)}</span>
                      <span>·</span>
                      <span><span className="num-display">{tv.profile?.trips_completed ?? 0}</span> trajets</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[16px] font-bold text-ink-600 mb-1.5 tracking-[-0.01em]">
                    {tv.departure_city} <Plane className="inline w-4 h-4 mx-1.5 text-ink-400" /> {tv.arrival_city}
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] text-ink-400">
                    <Clock className="w-3 h-3" />
                    {formatShortDate(tv.departure_date)}
                    {tv.flight_time && ` · ${tv.flight_time}`}
                  </div>
                </div>

                {(() => {
                  let categories: string[] = [];
                  if (tv.notes) {
                    try {
                      const parsed = JSON.parse(tv.notes);
                      if (Array.isArray(parsed?.accepted_categories)) {
                        categories = parsed.accepted_categories;
                      }
                    } catch {
                      return (
                        <p className="text-[14px] text-ink-400 mb-5 line-clamp-2 leading-relaxed flex-1">
                          {tv.notes}
                        </p>
                      );
                    }
                  }
                  if (categories.length === 0) return <div className="flex-1" />;
                  return (
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
                  );
                })()}

                <div className="flex items-center justify-between mb-5 mt-auto">
                  {tv.profile?.verification_level && (
                    <VerificationBadge level={tv.profile.verification_level} />
                  )}
                  <div className="text-end">
                    <div className="text-[12px] text-ink-400">À partir de</div>
                    <div className="font-bold text-ink-600 text-[17px] num-display tracking-[-0.015em]">
                      {tv.compensation_min}€
                    </div>
                  </div>
                </div>

                <Link href={user ? `/me?contact=${tv.id}` : '/login?next=/matches'}>
                  <Button variant="outline" size="sm" fullWidth>
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Contacter
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
