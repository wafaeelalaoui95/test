// Server-rendered shipping guide (see lib/guides.ts). All text is in the HTML
// search engines and AI crawlers receive; only the trip cards are client-side.

import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata, breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSiteUrl } from '@/lib/site-url';
import { GUIDES, GUIDES_UPDATED, type Guide } from '@/lib/guides';
import { ROUTE_PAGES } from '@/lib/route-pages';
import { findTrips } from '@/components/RouteLanding';
import { RouteTrips } from '@/components/RouteTrips';

export function guideMetadata(path: string): Metadata {
  const g = GUIDES.find((x) => x.path === path)!;
  const meta = pageMetadata(g.path, g.title, g.description);
  return { ...meta, openGraph: { ...meta.openGraph, type: 'article' } };
}

function labelFor(path: string) {
  return GUIDES.find((g) => g.path === path)?.label ?? ROUTE_PAGES.find((r) => r.path === path)?.label ?? path;
}

const UPDATED_FR = new Date(`${GUIDES_UPDATED}T12:00:00`).toLocaleDateString('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export async function GuideLanding({ path }: { path: string }) {
  const g = GUIDES.find((x) => x.path === path) as Guide;
  const trips = g.trips ? await findTrips(g.trips.match) : [];
  const base = getSiteUrl();

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.label, path: g.path }])} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.h1,
          description: g.description,
          inLanguage: 'fr',
          dateModified: GUIDES_UPDATED,
          mainEntityOfPage: `${base}${g.path}`,
          author: { '@type': 'Organization', name: 'Jibly', url: base },
          publisher: { '@type': 'Organization', name: 'Jibly', url: base, logo: `${base}/logo-mark.png` },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: g.faq.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />

      {/* HERO — the direct answer comes first */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-lavender-50/40" />
        <div className="relative mx-auto max-w-4xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <nav aria-label="Fil d’Ariane" className="text-[13px] text-ink-400 mb-6">
            <Link href="/" className="hover:text-ink-600">Accueil</Link>
            <span className="mx-1.5">/</span>
            <Link href="/guides" className="hover:text-ink-600">Guides</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-500">{g.label}</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-6 max-w-3xl">
            {g.h1}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-3xl">{g.answer}</p>
          <p className="mt-4 text-[13px] text-ink-400">Mis à jour le {UPDATED_FR}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/envoyer"
              className="inline-flex items-center px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
            >
              Trouver un voyageur
            </Link>
            <Link
              href="/trust"
              className="inline-flex items-center px-5 py-3 rounded-full bg-white border border-ink-100 hover:border-ink-200 text-ink-600 text-[14px] font-semibold transition-colors"
            >
              Comment fonctionne Jibly
            </Link>
          </div>
        </div>
      </section>

      {/* OPTIONS — a real table on desktop, one card per option on mobile */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">{g.optionsHeading}</h2>

          <div className="hidden md:block bg-white rounded-3xl border border-ink-50 overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead className="bg-cream-100 text-ink-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Option</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Idéal pour</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Rapidité</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Suivi</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Prix</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Limites</th>
                </tr>
              </thead>
              <tbody>
                {g.options.map((o) => (
                  <tr key={o.name} className={`border-t border-ink-50 align-top ${o.jibly ? 'bg-lavender-50/60' : ''}`}>
                    <th scope="row" className="px-4 py-3 font-semibold text-ink-600">{o.name}</th>
                    <td className="px-4 py-3 text-ink-500">{o.bestFor}</td>
                    <td className="px-4 py-3 text-ink-500">{o.speed}</td>
                    <td className="px-4 py-3 text-ink-500">{o.tracking}</td>
                    <td className="px-4 py-3 text-ink-500">{o.price}</td>
                    <td className="px-4 py-3 text-ink-500">{o.limits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {g.options.map((o) => (
              <div key={o.name} className={`rounded-2xl border p-5 ${o.jibly ? 'bg-lavender-50/60 border-lavender-200/60' : 'bg-white border-ink-50'}`}>
                <h3 className="font-bold text-ink-600 text-[15px] mb-2">{o.name}</h3>
                <dl className="text-[14px] text-ink-500 space-y-1">
                  <div><dt className="inline font-semibold text-ink-600">Idéal pour : </dt><dd className="inline">{o.bestFor}</dd></div>
                  <div><dt className="inline font-semibold text-ink-600">Rapidité : </dt><dd className="inline">{o.speed}</dd></div>
                  <div><dt className="inline font-semibold text-ink-600">Suivi : </dt><dd className="inline">{o.tracking}</dd></div>
                  <div><dt className="inline font-semibold text-ink-600">Prix : </dt><dd className="inline">{o.price}</dd></div>
                  <div><dt className="inline font-semibold text-ink-600">Limites : </dt><dd className="inline">{o.limits}</dd></div>
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[13px] text-ink-400 leading-relaxed">
            Informations générales sur les autres services, qui peuvent changer : vérifiez tarifs et délais à jour sur leur site.
            Jibly n’est affilié à aucun de ces services.
          </p>
        </div>
      </section>

      {/* LIVE TRIPS (route guides only) */}
      {g.trips && (
        <section className="pb-14 sm:pb-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">{g.trips.heading}</h2>
            {trips.length > 0 ? (
              <RouteTrips trips={trips} />
            ) : (
              <div className="bg-white rounded-3xl border border-ink-50 p-7 sm:p-8 max-w-2xl">
                <p className="text-[15px] text-ink-500 leading-relaxed">
                  Aucun voyageur n’a annoncé ce trajet pour le moment. Publiez votre demande : les voyageurs qui font la route
                  pourront vous proposer de transporter votre envoi.
                </p>
                <Link href="/envoyer" className="inline-block mt-4 text-[14px] font-semibold text-lavender-600 hover:text-lavender-700">
                  Publier ma demande →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* GUIDE CONTENT */}
      <section className="pb-14 sm:pb-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 space-y-10">
          {g.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">{s.heading}</h2>
              {s.body && <p className="text-[15px] text-ink-500 leading-relaxed">{s.body}</p>}
              {s.bullets && (
                <ul className="list-disc ps-5 space-y-2 text-[15px] text-ink-500 leading-relaxed">
                  {s.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}

          <div className="bg-white rounded-3xl border border-ink-50 p-7">
            <h2 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">Quand Jibly n’est pas la bonne option</h2>
            <ul className="list-disc ps-5 space-y-2 text-[15px] text-ink-500 leading-relaxed">
              {g.notJibly.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>

          <p className="text-[14px] text-ink-400">
            Voir la <Link href="/objets-autorises" className="underline underline-offset-2 hover:text-ink-600">liste des objets autorisés</Link>,
            les <Link href="/securite" className="underline underline-offset-2 hover:text-ink-600">règles de sécurité</Link> et{' '}
            <Link href="/trust" className="underline underline-offset-2 hover:text-ink-600">comment fonctionne Jibly</Link>.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">Questions fréquentes</h2>
          <div className="space-y-3">
            {g.faq.map((f) => (
              <details key={f.q} className="bg-white rounded-2xl border border-ink-50 px-6 py-4">
                <summary className="cursor-pointer font-semibold text-ink-600 text-[15px]">{f.q}</summary>
                <p className="mt-3 text-[14px] text-ink-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-[14px] text-ink-400">
            À lire aussi :{' '}
            {g.related.map((p, i) => (
              <span key={p}>
                {i > 0 && ' · '}
                <Link href={p} className="underline underline-offset-2 hover:text-ink-600">{labelFor(p)}</Link>
              </span>
            ))}
            {' '}· <Link href="/guides" className="underline underline-offset-2 hover:text-ink-600">tous les guides</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
