// Index of every shipping guide and route page, grouped by need, destination,
// item and rules. Server-rendered: one crawlable entry point to all of them.

import Link from 'next/link';
import { pageMetadata, breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { GUIDES, GUIDE_GROUPS } from '@/lib/guides';
import { ROUTE_PAGES } from '@/lib/route-pages';

export const metadata = pageMetadata(
  '/guides',
  'Guides pour envoyer un document ou un colis à l’étranger',
  'Tous nos guides pour envoyer un document, des clés ou un petit colis à l’étranger : par besoin, par destination, par objet, et les règles de douane.'
);

export default function GuidesPage() {
  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Guides', path: '/guides' }])} />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-lavender-50/40" />
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <nav aria-label="Fil d’Ariane" className="text-[13px] text-ink-400 mb-6">
            <Link href="/" className="hover:text-ink-600">Accueil</Link>
            <span className="mx-1.5">/</span>
            <span className="text-ink-500">Guides</span>
          </nav>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-5 max-w-3xl">
            Envoyer un document ou un colis à l’étranger : nos guides
          </h1>
          <p className="text-[16px] sm:text-[17px] text-ink-500 leading-relaxed max-w-2xl">
            Poste, transporteur express ou voyageur qui fait déjà le trajet : des guides pour choisir la bonne option, avec
            leurs avantages et leurs limites.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 pb-20 space-y-12">
        {GUIDE_GROUPS.map((grp) => {
          const items = GUIDES.filter((g) => g.group === grp.id);
          const routes = grp.id === 'destination' ? ROUTE_PAGES : [];
          return (
            <section key={grp.id}>
              <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.025em] mb-5">{grp.title}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((g) => (
                  <Link key={g.path} href={g.path} className="bg-white rounded-2xl border border-ink-50 hover:border-ink-200 p-5 transition-colors">
                    <span className="font-bold text-ink-600 text-[15px]">{g.card.fr.title}</span>
                    <p className="mt-1 text-[14px] text-ink-500 leading-snug">{g.card.fr.text}</p>
                  </Link>
                ))}
                {routes.map((r) => (
                  <Link key={r.path} href={r.path} className="bg-white rounded-2xl border border-ink-50 hover:border-ink-200 p-5 transition-colors">
                    <span className="font-bold text-ink-600 text-[15px]">Colis {r.label}</span>
                    <p className="mt-1 text-[14px] text-ink-500 leading-snug">Les voyageurs sur ce trajet.</p>
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
