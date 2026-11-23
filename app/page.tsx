import { getServerClient } from '@/lib/supabase/server';
import { listOpenTrips, listOpenRequestsWithProfile } from '@/lib/supabase/queries';
import { HomeClient } from './HomeClient';
import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo';
import { getSiteUrl } from '@/lib/site-url';

// Title/description come from the root layout defaults; only the canonical is
// page-specific (it must not live in the layout, or every page inherits it).
export const metadata: Metadata = { alternates: { canonical: '/' } };

const siteUrl = getSiteUrl();
const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Jibly',
    url: siteUrl,
    logo: `${siteUrl}/logo-mark.png`,
    email: 'contact@jibly.io',
    sameAs: ['https://instagram.com/thejiblyapp'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Jibly',
    url: siteUrl,
    inLanguage: 'fr-FR',
  },
];

// Fetch the two public listings on the server so the home page arrives already
// populated — no download-JS → hydrate → fetch waterfall on the client, which
// was the main cause of the slow first paint (especially on mobile). Uses the
// request-scoped client (reads the session cookie), so it renders dynamically.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = getServerClient();

  const [trips, requests] = await Promise.all([
    listOpenTrips(supabase, { limit: 30 }).catch(() => []),
    listOpenRequestsWithProfile(supabase).catch(() => []),
  ]);

  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <HomeClient initialTrips={trips as any} initialRequests={requests as any} />
    </>
  );
}
