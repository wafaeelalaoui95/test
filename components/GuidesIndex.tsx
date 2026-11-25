// Index of every shipping guide in one language, grouped by need, destination,
// item and rules (/guides in French, /en/guides in English).

import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMetadata, breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { GUIDES, GUIDE_GROUPS, guideLang, type GuideLang } from '@/lib/guides';
import { ROUTE_PAGES } from '@/lib/route-pages';

const T = {
  fr: {
    path: '/guides',
    title: 'Guides pour envoyer un document ou un colis à l’étranger',
    description:
      'Tous nos guides pour envoyer un document, des clés ou un petit colis à l’étranger : par besoin, par destination, par objet, et les règles de douane.',
    h1: 'Envoyer un document ou un colis à l’étranger : nos guides',
    intro:
      'Poste, transporteur express ou voyageur qui fait déjà le trajet : des guides pour choisir la bonne option, avec leurs avantages et leurs limites.',
    home: 'Accueil',
    other: { label: 'Guides in English', href: '/en/guides' },
    routeText: 'Les voyageurs sur ce trajet.',
    og: 'fr_FR',
  },
  en: {
    path: '/en/guides',
    title: 'Guides to sending a document or parcel abroad',
    description:
      'All our guides to sending a document, keys or a small parcel abroad: by need, by destination, by item, plus customs and comparisons with couriers.',
    h1: 'Sending a document or parcel abroad: our guides',
    intro:
      'Post, express courier or a traveller already making the trip: guides to choose the right option, with their strengths and limits.',
    home: 'Home',
    other: { label: 'Guides en français', href: '/guides' },
    routeText: '',
    og: 'en_GB',
  },
} as const;

export function guidesIndexMetadata(lang: GuideLang): Metadata {
  const t = T[lang];
  const meta = pageMetadata(t.path, t.title, t.description);
  return {
    ...meta,
    alternates: { canonical: t.path, languages: { fr: '/guides', en: '/en/guides', 'x-default': '/guides' } },
    openGraph: { ...meta.openGraph, locale: t.og },
  };
}

export function GuidesIndex({ lang }: { lang: GuideLang }) {
  const t = T[lang];
  return (
    <div lang={lang}>
      <JsonLd data={breadcrumbJsonLd([{ name: t.home, path: '/' }, { name: 'Guides', path: t.path }])} />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-lavender-50/40" />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-[13px] text-ink-400 mb-6 flex flex-wrap items-center">
            <Link href="/" className="hover:text-ink-600">{t.home}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-500">Guides</span>
            <Link href={t.other.href} hrefLang={lang === 'fr' ? 'en' : 'fr'} className="ms-auto ps-4 hover:text-ink-600">
              {t.other.label}
            </Link>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-5 max-w-3xl">
            {t.h1}
          </h1>
          <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-2xl">{t.intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 pb-20 space-y-12">
        {GUIDE_GROUPS.map((grp) => {
          const items = GUIDES.filter((g) => g.group === grp.id && guideLang(g) === lang);
          // Route pages are French-only.
          const routes = grp.id === 'destination' && lang === 'fr' ? ROUTE_PAGES : [];
          if (items.length + routes.length === 0) return null;
          return (
            <section key={grp.id}>
              <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.025em] mb-5">
                {lang === 'en' ? grp.titleEn : grp.title}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((g) => {
                  const c = g.card[lang];
                  return (
                    <Link key={g.path} href={g.path} className="bg-white rounded-2xl border border-ink-50 hover:border-ink-200 p-5 transition-colors">
                      <span className="font-bold text-ink-600 text-[15px]">{c.title}</span>
                      <p className="mt-1 text-[14px] text-ink-500 leading-snug">{c.text}</p>
                    </Link>
                  );
                })}
                {routes.map((r) => (
                  <Link key={r.path} href={r.path} className="bg-white rounded-2xl border border-ink-50 hover:border-ink-200 p-5 transition-colors">
                    <span className="font-bold text-ink-600 text-[15px]">Colis {r.label}</span>
                    <p className="mt-1 text-[14px] text-ink-500 leading-snug">{t.routeText}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
