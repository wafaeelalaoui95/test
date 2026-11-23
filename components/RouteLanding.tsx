// Server-rendered route landing page (see lib/route-pages.ts). All text is in
// the HTML Google receives; only the trip cards are a client component.

import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerClient } from '@/lib/supabase/server';
import { listOpenTrips } from '@/lib/supabase/queries';
import { getCitiesForCountry } from '@/lib/countries';
import { pageMetadata, breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { ROUTE_PAGES, type RoutePage, type RouteMatch } from '@/lib/route-pages';
import { RouteTrips } from '@/components/RouteTrips';
import type { TripWithProfile } from '@/app/HomeClient';

export function routeMetadata(path: string): Metadata {
  const page = ROUTE_PAGES.find((p) => p.path === path)!;
  return pageMetadata(page.path, page.title, page.description);
}

const same = (a: string | null | undefined, b: string) => (a ?? '').trim().toLowerCase() === b.toLowerCase();

// Same rule as the home page filter: match the stored country, or fall back to
// "this city belongs to that country" for older rows saved without a country.
function inCountry(country: string | null | undefined, city: string, code: string) {
  return same(country, code) || getCitiesForCountry(code).some((c) => same(city, c));
}

function matches(trip: TripWithProfile, m: RouteMatch) {
  if (m.kind === 'city') return same(trip.departure_city, m.from) && same(trip.arrival_city, m.to);
  return (
    inCountry(trip.departure_country, trip.departure_city, m.from) &&
    inCountry(trip.arrival_country, trip.arrival_city, m.to)
  );
}

export async function RouteLanding({ path }: { path: string }) {
  const page = ROUTE_PAGES.find((p) => p.path === path) as RoutePage;

  const all = (await listOpenTrips(getServerClient(), { limit: 200 }).catch(() => [])) as TripWithProfile[];
  const trips = all.filter((t) => matches(t, page.match)).slice(0, 12);
  const others = ROUTE_PAGES.filter((p) => p.path !== page.path);

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Accueil', path: '/' },
          { name: page.label, path: page.path },
        ])}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-lavender-50/40" />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <nav aria-label="Fil d’Ariane" className="text-[13px] text-ink-400 mb-6">
            <Link href="/" className="hover:text-ink-600">Accueil</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-500">{page.label}</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-5 max-w-3xl">
            {page.h1}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-2xl">{page.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/envoyer"
              className="inline-flex items-center px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
            >
              Envoyer un colis
            </Link>
            <Link
              href="/voyager"
              className="inline-flex items-center px-5 py-3 rounded-full bg-white border border-ink-100 hover:border-ink-200 text-ink-600 text-[14px] font-semibold transition-colors"
            >
              Je fais ce trajet
            </Link>
          </div>
        </div>
      </section>

      {/* LIVE TRIPS */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">
            Voyageurs sur le trajet {page.label}
          </h2>
          {trips.length > 0 ? (
            <RouteTrips trips={trips} />
          ) : (
            <div className="bg-white rounded-3xl border border-ink-50 p-7 sm:p-8 max-w-2xl">
              <p className="text-[15px] text-ink-500 leading-relaxed">
                Aucun voyageur n’a annoncé ce trajet pour le moment. Publiez votre demande : les voyageurs qui
                font la route pourront vous proposer de transporter votre envoi.
              </p>
              <Link href="/envoyer" className="inline-block mt-4 text-[14px] font-semibold text-lavender-600 hover:text-lavender-700">
                Publier ma demande →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ROUTE-SPECIFIC CONTENT */}
      <section className="pb-14 sm:pb-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 grid md:grid-cols-2 gap-5">
          {page.sections.map((s) => (
            <div key={s.heading} className="bg-white rounded-3xl p-7 border border-ink-50">
              <h2 className="text-lg font-bold text-ink-600 mb-2 tracking-[-0.015em]">{s.heading}</h2>
              <p className="text-[14px] text-ink-500 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 mt-5 text-[14px] text-ink-400">
          Voir la <Link href="/objets-autorises" className="underline underline-offset-2 hover:text-ink-600">liste des objets autorisés</Link>,
          les <Link href="/securite" className="underline underline-offset-2 hover:text-ink-600">règles de sécurité</Link> et{' '}
          <Link href="/trust" className="underline underline-offset-2 hover:text-ink-600">comment fonctionne Jibly</Link>.
        </p>
      </section>

      {/* FAQ */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">Questions fréquentes</h2>
          <div className="space-y-3">
            {page.faq.map((f) => (
              <details key={f.q} className="bg-white rounded-2xl border border-ink-50 px-6 py-4 group">
                <summary className="cursor-pointer font-semibold text-ink-600 text-[15px]">{f.q}</summary>
                <p className="mt-3 text-[14px] text-ink-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-[14px] text-ink-400">
            Autres trajets :{' '}
            {others.map((o, i) => (
              <span key={o.path}>
                {i > 0 && ' · '}
                <Link href={o.path} className="underline underline-offset-2 hover:text-ink-600">{o.label}</Link>
              </span>
            ))}
            {' '}· Jibly fonctionne aussi <Link href="/" className="underline underline-offset-2 hover:text-ink-600">partout ailleurs</Link>.
          </div>
        </div>
      </section>
    </div>
  );
}
