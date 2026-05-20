'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Plane, Star, Clock, Loader2, SlidersHorizontal, X } from 'lucide-react';
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
