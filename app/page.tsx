'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plane, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HeroScene } from '@/components/illustrations/HeroScene';
import { LocationSelector, type LocationValue } from '@/components/ui/LocationSelector';
import { VerificationBadge } from '@/components/ui/Badge';
import { formatShortDate, formatName, nameInitial } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { browser } from '@/lib/supabase/queries';
import type { TravelerTripRow, Profile } from '@/lib/supabase/types';

type TripWithProfile = TravelerTripRow & {
  profile: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'> | null;
};

export default function HomePage() {
  const { t } = useI18n();
  const [from, setFrom] = useState<LocationValue>(null);
  const [to, setTo] = useState<LocationValue>(null);
  const [trips, setTrips] = useState<TripWithProfile[]>([]);

  useEffect(() => {
    browser
      .listOpenTrips({ limit: 6 })
      .then((data) => setTrips(data as TripWithProfile[]))
      .catch(() => setTrips([]));
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (from) params.set('from', `${from.city}, ${from.country}`);
    if (to) params.set('to', `${to.city}, ${to.country}`);
    window.location.href = `/matches?${params.toString()}`;
  }

  return (
    <div>
      {/* HERO — editorial split: big claim, refined search, no chip */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-24 pb-16 lg:pb-28">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
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

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-10 max-w-xl"
              >
                <div className="bg-white rounded-2xl p-2 border border-ink-100">
                  <div className="flex flex-col gap-1.5">
                    <LocationSelector value={from} onChange={setFrom} placeholder={t.hero_search_from} icon="departure" />
                    <div className="h-px bg-ink-50 mx-3" />
                    <LocationSelector value={to} onChange={setTo} placeholder={t.hero_search_to} icon="arrival" />
                    <Button onClick={handleSearch} className="mt-1.5">
                      {t.hero_search_button}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-sm text-ink-400">
                  <Star className="w-4 h-4 fill-butter-400 text-butter-400" strokeWidth={0} />
                  <span className="font-semibold text-ink-500">4.9</span>
                  <span>·</span>
                  <span>{t.hero_social_proof}</span>
                </div>
              </motion.div>
            </div>

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

      {/* HOW IT WORKS — Editorial 3-step, no chips, refined numbers */}
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

      {/* TRAVELERS — Editorial gallery */}
      <section className="border-t border-ink-50 section-solid">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 leading-[1.05] tracking-[-0.03em] text-balance">
                {t.travelers_title}
              </h2>
              <p className="mt-4 text-lg text-ink-400 max-w-measure">{t.travelers_subtitle}</p>
            </div>
            <Link
              href="/matches"
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-600 hover:text-lavender-700 group whitespace-nowrap"
            >
              {t.travelers_see_all}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-ink-100 text-center max-w-2xl mx-auto">
              <p className="text-[15px] text-ink-400">{t.empty_open_trips}</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:overflow-visible md:mx-0 md:px-0">
              {trips.map((tv, i) => (
                <motion.article
                  key={tv.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                  className="flex-shrink-0 w-[280px] md:w-auto bg-white rounded-2xl p-6 border border-ink-50 hover:border-ink-100 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-full bg-lavender-100 flex items-center justify-center font-bold text-[15px] text-lavender-700">
                      {nameInitial(tv.profile?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink-600 truncate text-[15px]">
                        {formatName(tv.profile?.full_name) || '—'}
                      </div>
                      <div className="flex items-center gap-1 text-[13px] text-ink-400">
                        <Star className="w-3 h-3 fill-butter-400 text-butter-400" strokeWidth={0} />
                        <span className="font-medium text-ink-500">{tv.profile?.rating?.toFixed(1) ?? '—'}</span>
                        <span>· {tv.profile?.trips_completed ?? 0} {t.travelers_trips}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[15px] font-medium text-ink-500 mb-2">
                    <span>{tv.departure_city}</span>
                    <Plane className="w-3.5 h-3.5 text-ink-300 mx-0.5" />
                    <span>{tv.arrival_city}</span>
                  </div>

                  <div className="text-[14px] text-ink-400 mb-5">
                    {formatShortDate(tv.departure_date)} · {t.matches_min} {tv.compensation_min}{t.common_eur}
                  </div>

                  {tv.profile?.verification_level && (
                    <VerificationBadge level={tv.profile.verification_level} />
                  )}
                </motion.article>
              ))}
            </div>
          )}

          <div className="mt-10 text-center sm:hidden">
            <Link href="/matches">
              <Button variant="outline">{t.travelers_see_all}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST — Editorial pillars, no badges, refined typography */}
      <section className="border-t border-ink-50">
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

      {/* TESTIMONIAL — Editorial pull quote */}
      <section className="border-t border-ink-50 section-solid">
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

      {/* FINAL CTA — Refined, single intent */}
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
