import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jibly.io';

// Public, indexable routes only. Authenticated areas (/me, /wallet, …) are
// excluded here and in robots.ts.
const routes = ['', '/envoyer', '/voyager', '/trust', '/objets-autorises', '/securite', '/cgu', '/confidentialite', '/login', '/signup'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
