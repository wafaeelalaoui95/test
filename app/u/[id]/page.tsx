'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane,
  Star,
  Clock,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VerificationBadge } from '@/components/ui/Badge';
import { formatShortDate, formatName, nameInitial } from '@/lib/utils';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import type { Profile, TravelerTripRow } from '@/lib/supabase/types';

type PublicProfile = Pick<
  Profile,
  'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed' | 'city' | 'country'
>;

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: travelerId } = use(params);
  const { t } = useI18n();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [trips, setTrips] = useState<TravelerTripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking intent modal state
  const [bookingTrip, setBookingTrip] = useState<TravelerTripRow | null>(null);
  const [intentCategory, setIntentCategory] = useState<string>('');
  const [intentDescription, setIntentDescription] = useState('');
  const [intentPrice, setIntentPrice] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      browser.getPublicProfile(travelerId).catch(() => null),
      browser.listTripsByUser(travelerId).catch(() => [] as TravelerTripRow[]),
    ])
      .then(([prof, tr]) => {
        if (cancelled) return;
        setProfile(prof);
        setTrips(tr);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Profil introuvable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [travelerId]);

  function openBooking(trip: TravelerTripRow) {
    setBookingTrip(trip);
    setIntentCategory('');
    setIntentDescription('');
    setIntentPrice(Math.max(trip.compensation_min, 20));
    setSubmitted(false);
    setSubmitErr(null);
  }

  async function handleSubmitBooking() {
    if (!bookingTrip || !user) return;
    if (!intentCategory) {
      setSubmitErr('Choisissez une catégorie d\'objet');
      return;
    }
    setSubmitErr(null);
    setSubmitting(true);
    try {
      await browser.createBookingIntent({
        sender_id: user.id,
        traveler_trip_id: bookingTrip.id,
        item_category: intentCategory,
        item_description: intentDescription || null,
        proposed_price: intentPrice,
        pickup_city: bookingTrip.departure_city,
        destination_city: bookingTrip.arrival_city,
      });
      setSubmitted(true);
    } catch (e: any) {
      setSubmitErr(e.message ?? 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  // Parse accepted categories from notes (JSON)
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
          <h1 className="text-xl font-bold text-ink-600 mb-2">Profil introuvable</h1>
          <p className="text-[14px] text-ink-400 mb-6">
            Ce voyageur n&apos;existe plus ou son profil a été supprimé.
          </p>
          <Link href="/matches">
            <Button variant="outline">Retour aux voyageurs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const initial = nameInitial(profile.full_name);
  const displayName = formatName(profile.full_name) || 'Voyageur';

  return (
    <div className="min-h-screen py-10 lg:py-16">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Back link */}
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 hover:text-ink-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux voyageurs
        </Link>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-12"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-lavender-100 flex items-center justify-center font-extrabold text-3xl text-lavender-700">
              {initial}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-2">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-400">
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-butter-500 fill-butter-500" />
                <span className="font-semibold text-ink-600 num-display">
                  {(profile.rating ?? 0).toFixed(1)}
                </span>
                <span>· <span className="num-display">{profile.trips_completed ?? 0}</span> trajets effectués</span>
              </div>
              {profile.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile.verification_level && (
                <VerificationBadge level={profile.verification_level} />
              )}
            </div>
          </div>
        </motion.div>

        {/* Open trips */}
        <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-6">
          Trajets ouverts
        </h2>

        {trips.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-ink-100">
            <p className="text-[14px] text-ink-400">
              {formatName(profile.full_name)?.split(' ')[0] || 'Ce voyageur'} n&apos;a aucun trajet ouvert pour le moment.
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
                      {tr.departure_city}
                      <Plane className="inline w-4 h-4 mx-2 text-ink-400" />
                      {tr.arrival_city}
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

                  <div className="flex items-center justify-between mb-5 mt-auto">
                    <div className="text-[13px] text-ink-400">À partir de</div>
                    <div className="font-bold text-ink-600 text-[20px] num-display tracking-[-0.015em]">
                      {tr.compensation_min}€
                    </div>
                  </div>

                  <Button
                    onClick={() => (user ? openBooking(tr) : (window.location.href = `/login?next=/u/${travelerId}`))}
                    size="sm"
                    fullWidth
                  >
                    <CreditCard className="w-4 h-4 mr-1.5" />
                    Réserver ce trajet
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking intent modal */}
      <AnimatePresence>
        {bookingTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
            onClick={() => !submitting && setBookingTrip(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream-50 rounded-3xl p-7 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            >
              {!submitted ? (
                <>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
                        Réservation
                      </div>
                      <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
                        {bookingTrip.departure_city} → {bookingTrip.arrival_city}
                      </h2>
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-400 mt-1.5">
                        <Clock className="w-3 h-3" />
                        {formatShortDate(bookingTrip.departure_date)}
                      </div>
                    </div>
                    <button
                      onClick={() => setBookingTrip(null)}
                      className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400"
                      disabled={submitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Category picker */}
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
                      Que voulez-vous envoyer ?
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

                  {/* Description */}
                  <div className="mb-5">
                    <label className="block text-[13px] font-semibold text-ink-500 mb-2">
                      Description (optionnel)
                    </label>
                    <textarea
                      value={intentDescription}
                      onChange={(e) => setIntentDescription(e.target.value)}
                      placeholder="Ex: un trousseau de clés, une enveloppe avec des documents…"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
                    />
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-between mb-2.5">
                      <label className="block text-[13px] font-semibold text-ink-500">
                        Compensation proposée
                      </label>
                      <span className="text-2xl font-bold text-ink-600 num-display tracking-[-0.02em]">
                        {intentPrice}€
                      </span>
                    </div>
                    <input
                      type="range"
                      min={bookingTrip.compensation_min}
                      max={100}
                      step={5}
                      value={intentPrice}
                      onChange={(e) => setIntentPrice(Number(e.target.value))}
                      className="w-full h-1.5 bg-ink-100 rounded-full appearance-none accent-lavender-500"
                    />
                    <div className="flex justify-between text-[11px] text-ink-300 mt-1.5">
                      <span>Min {bookingTrip.compensation_min}€</span>
                      <span>100€</span>
                    </div>
                  </div>

                  {submitErr && (
                    <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500 mb-4">
                      {submitErr}
                    </div>
                  )}

                  {/* Soft disclosure: no real payment yet */}
                  <div className="rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 mb-5 text-[13px] text-ink-500 flex gap-2.5">
                    <Sparkles className="w-4 h-4 text-butter-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-ink-600">Aucun débit pour l&apos;instant.</strong>{' '}
                      Le paiement sécurisé arrive bientôt. On vous prévient dès que vous pouvez finaliser.
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => setBookingTrip(null)}
                      disabled={submitting}
                      className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSubmitBooking}
                      disabled={submitting || !intentCategory}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Confirmer la réservation
                    </button>
                  </div>
                </>
              ) : (
                /* Success state */
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-5">
                    <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">
                    Réservation enregistrée
                  </h3>
                  <p className="text-[15px] text-ink-400 mb-7 leading-relaxed">
                    On vous prévient dès que le paiement est disponible. Vous pourrez finaliser à ce moment-là.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/me">
                      <Button variant="secondary" fullWidth>
                        Voir mon espace
                      </Button>
                    </Link>
                    <button
                      onClick={() => setBookingTrip(null)}
                      className="text-[14px] text-ink-400 hover:text-ink-600 py-2"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
