import { getSiteUrl } from '@/lib/site-url';
import type { MetadataRoute } from 'next';
import { ROUTE_PAGES } from '@/lib/route-pages';
import { GUIDES } from '@/lib/guides';

const siteUrl = getSiteUrl();

// Public, indexable routes only. Authenticated areas (/me, /wallet, …) are
// excluded here and in robots.ts.
// /login and /signup are noindex, so they are not listed.
const routes = ['', '/envoyer', '/voyager', '/trust', '/objets-autorises', '/securite', '/cgu', '/confidentialite', '/annulation-remboursement', ...ROUTE_PAGES.map((p) => p.path), ...GUIDES.map((g) => g.path)];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === '' || path.startsWith('/envoi-colis-') ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
