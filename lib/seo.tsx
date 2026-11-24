// Shared SEO helpers. Kept tiny on purpose: per-page titles/descriptions live
// next to each route (layout.tsx / page.tsx), this file only holds what several
// routes need.

import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export const SITE_NAME = 'Jibly';

/**
 * Share preview (WhatsApp, Facebook, Instagram, X…): the Jibly logo. Repeated
 * on every page that sets its own openGraph, because Next replaces the parent's
 * openGraph object instead of merging it, which would drop the image.
 */
export const SHARE_IMAGE = { url: '/logo-mark.png', width: 662, height: 754, alt: 'Jibly' };

/**
 * Metadata for a public, indexable page: own title, description and a
 * canonical URL without query parameters. Never put a canonical in the root
 * layout — every child page would inherit it and point at the home page.
 */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, type: 'website', siteName: SITE_NAME, locale: 'fr_FR', images: [SHARE_IMAGE] },
  };
}

/** Pages people may land on but that have no business in search results. */
export const NOINDEX: Metadata['robots'] = { index: false, follow: true };

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const base = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

/** Renders a JSON-LD block. `<` is escaped so content can never close the tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}
    />
  );
}
