// Server-rendered shipping guide (see lib/guides.ts and lib/guides-en.ts). All
// text is in the HTML search engines and AI crawlers receive; only the trip
// cards are client-side. French and English guides share this template; a
// guide's `alt` is its other-language version (hreflang).

import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata, breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSiteUrl } from '@/lib/site-url';
import { GUIDES, GUIDES_UPDATED, guideLang, type Guide, type GuideLang } from '@/lib/guides';
import { ROUTE_PAGES } from '@/lib/route-pages';
import { findTrips } from '@/components/RouteLanding';
import { RouteTrips } from '@/components/RouteTrips';

const STR = {
  fr: {
    home: 'Accueil',
    guides: 'Guides',
    guidesPath: '/guides',
    updated: 'Mis à jour le',
    cta1: 'Trouver un voyageur',
    cta2: 'Comment fonctionne Jibly',
    cols: ['Option', 'Idéal pour', 'Rapidité', 'Suivi', 'Prix', 'Limites'],
    disclaimer:
      'Informations générales sur les autres services, qui peuvent changer : vérifiez tarifs et délais à jour sur leur site. Jibly n’est affilié à aucun de ces services.',
    noTrips:
      'Aucun voyageur n’a annoncé ce trajet pour le moment. Publiez votre demande : les voyageurs qui font la route pourront vous proposer de transporter votre envoi.',
    publish: 'Publier ma demande →',
    notJibly: 'Quand Jibly n’est pas la bonne option',
    faq: 'Questions fréquentes',
    seeAlso: 'À lire aussi :',
    allGuides: 'tous les guides',
    other: 'Read in English',
    rulesLine: ['Voir la ', 'liste des objets autorisés', ', les ', 'règles de sécurité', ' et ', 'comment fonctionne Jibly', '.'],
    crumb: 'Fil d’Ariane',
    locale: 'fr-FR',
    og: 'fr_FR',
  },
  en: {
    home: 'Home',
    guides: 'Guides',
    guidesPath: '/en/guides',
    updated: 'Updated',
    cta1: 'Find a traveller',
    cta2: 'How Jibly works',
    cols: ['Option', 'Best for', 'Speed', 'Tracking', 'Price', 'Limits'],
    disclaimer:
      'General information about other services, which may change: check current prices and delivery times on their websites. Jibly is not affiliated with any of them.',
    noTrips:
      'No traveller has posted this route yet. Post your request: travellers making the trip can offer to carry your item.',
    publish: 'Post my request →',
    notJibly: 'When Jibly is not the right choice',
    faq: 'Frequently asked questions',
    seeAlso: 'Read next:',
    allGuides: 'all guides',
    other: 'Lire en français',
    rulesLine: ['See the ', 'list of allowed items', ', the ', 'safety rules', ' and ', 'how Jibly works', '.'],
    crumb: 'Breadcrumb',
    locale: 'en-GB',
    og: 'en_GB',
  },
} as const;

/** hreflang pair for a page and its other-language version. */
export function languageAlternates(path: string, lang: GuideLang, alt?: string) {
  if (!alt) return undefined;
  const fr = lang === 'fr' ? path : alt;
  const en = lang === 'en' ? path : alt;
  return { fr, en, 'x-default': fr };
}

export function guideMetadata(path: string): Metadata {
  const g = GUIDES.find((x) => x.path === path)!;
  const lang = guideLang(g);
  const meta = pageMetadata(g.path, g.title, g.description);
  return {
    ...meta,
    alternates: { canonical: g.path, languages: languageAlternates(g.path, lang, g.alt) },
    openGraph: { ...meta.openGraph, type: 'article', locale: STR[lang].og },
  };
}

function labelFor(path: string) {
  return GUIDES.find((g) => g.path === path)?.label ?? ROUTE_PAGES.find((r) => r.path === path)?.label ?? path;
}

export async function GuideLanding({ path }: { path: string }) {
  const g = GUIDES.find((x) => x.path === path) as Guide;
  const lang = guideLang(g);
  const s = STR[lang];
  const trips = g.trips ? await findTrips(g.trips.match) : [];
  const base = getSiteUrl();
  const updated = new Date(`${GUIDES_UPDATED}T12:00:00`).toLocaleDateString(s.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const L = 'underline underline-offset-2 hover:text-ink-600';

  return (
    <div lang={lang} dir="ltr">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: s.home, path: '/' },
          { name: s.guides, path: s.guidesPath },
          { name: g.label, path: g.path },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.h1,
          description: g.description,
          inLanguage: lang,
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
          inLanguage: lang,
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
          <nav aria-label={s.crumb} className="text-[13px] text-ink-400 mb-6 flex flex-wrap items-center gap-y-1">
            <Link href="/" className="hover:text-ink-600">{s.home}</Link>
            <span className="mx-1.5">/</span>
            <Link href={s.guidesPath} className="hover:text-ink-600">{s.guides}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-500">{g.label}</span>
            {g.alt && (
              <Link href={g.alt} hrefLang={lang === 'fr' ? 'en' : 'fr'} className="ms-auto ps-4 hover:text-ink-600">
                {s.other}
              </Link>
            )}
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-6 max-w-3xl">
            {g.h1}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-3xl">{g.answer}</p>
          <p className="mt-4 text-[13px] text-ink-400">{s.updated} {updated}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/envoyer"
              className="inline-flex items-center px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold transition-colors"
            >
              {s.cta1}
            </Link>
            <Link
              href="/trust"
              className="inline-flex items-center px-5 py-3 rounded-full bg-white border border-ink-100 hover:border-ink-200 text-ink-600 text-[14px] font-semibold transition-colors"
            >
              {s.cta2}
            </Link>
          </div>
        </div>
      </section>

      {/* OPTIONS — a real table on desktop, one card per option on mobile */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">{g.optionsHeading}</h2>

          <div className="hidden md:block bg-white rounded-3xl border border-ink-50 overflow-hidden">
            <table className="w-full text-start text-[14px]">
              <thead className="bg-cream-100 text-ink-600">
                <tr>
                  {s.cols.map((c) => (
                    <th key={c} scope="col" className="px-4 py-3 font-semibold">{c}</th>
                  ))}
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
                  {([o.bestFor, o.speed, o.tracking, o.price, o.limits] as string[]).map((v, i) => (
                    <div key={i}>
                      <dt className="inline font-semibold text-ink-600">{s.cols[i + 1]}{lang === 'fr' ? ' : ' : ': '}</dt>
                      <dd className="inline">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[13px] text-ink-400 leading-relaxed">{s.disclaimer}</p>
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
                <p className="text-[15px] text-ink-500 leading-relaxed">{s.noTrips}</p>
                <Link href="/envoyer" className="inline-block mt-4 text-[14px] font-semibold text-lavender-600 hover:text-lavender-700">
                  {s.publish}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* GUIDE CONTENT */}
      <section className="pb-14 sm:pb-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 space-y-10">
          {g.sections.map((sec) => (
            <div key={sec.heading}>
              <h2 className="text-xl sm:text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">{sec.heading}</h2>
              {sec.body && <p className="text-[15px] text-ink-500 leading-relaxed">{sec.body}</p>}
              {sec.bullets && (
                <ul className="list-disc ps-5 space-y-2 text-[15px] text-ink-500 leading-relaxed">
                  {sec.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}

          <div className="bg-white rounded-3xl border border-ink-50 p-7">
            <h2 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">{s.notJibly}</h2>
            <ul className="list-disc ps-5 space-y-2 text-[15px] text-ink-500 leading-relaxed">
              {g.notJibly.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>

          <p className="text-[14px] text-ink-400">
            {s.rulesLine[0]}<Link href="/objets-autorises" className={L}>{s.rulesLine[1]}</Link>
            {s.rulesLine[2]}<Link href="/securite" className={L}>{s.rulesLine[3]}</Link>
            {s.rulesLine[4]}<Link href="/trust" className={L}>{s.rulesLine[5]}</Link>{s.rulesLine[6]}
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.025em] mb-6">{s.faq}</h2>
          <div className="space-y-3">
            {g.faq.map((f) => (
              <details key={f.q} className="bg-white rounded-2xl border border-ink-50 px-6 py-4">
                <summary className="cursor-pointer font-semibold text-ink-600 text-[15px]">{f.q}</summary>
                <p className="mt-3 text-[14px] text-ink-500 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-[14px] text-ink-400">
            {s.seeAlso}{' '}
            {g.related.map((p, i) => (
              <span key={p}>
                {i > 0 && ' · '}
                <Link href={p} className={L}>{labelFor(p)}</Link>
              </span>
            ))}
            {' '}· <Link href={s.guidesPath} className={L}>{s.allGuides}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
