import { getSiteUrl } from '@/lib/site-url';
import type { MetadataRoute } from 'next';

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep authenticated / transactional areas out of the index.
      disallow: ['/me', '/wallet', '/messages', '/notifications', '/historique', '/admin', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
