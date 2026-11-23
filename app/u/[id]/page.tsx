import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getPublicProfile, listTripsByUser } from '@/lib/supabase/queries';
import type { TravelerTripRow } from '@/lib/supabase/types';
import { NOINDEX } from '@/lib/seo';
import { ProfileClient } from './ProfileClient';

// Fetch the profile + its open trips on the server so the page arrives already
// populated — no download-JS → hydrate → fetch waterfall on first load, which
// was making the profile page take ages to appear.
export const dynamic = 'force-dynamic';

// Profiles are personal and short-lived: never in search results (but links on
// them are still followed). The canonical drops ?book=… so every booking link
// to the same traveller counts as one URL.
export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    title: 'Profil voyageur',
    robots: NOINDEX,
    alternates: { canonical: `/u/${params.id}` },
  };
}

// A bad UUID makes Postgres error out; treat it like "no such profile".
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();

  const supabase = getServerClient();

  // `undefined` = the lookup failed (timeout, network): let ProfileClient retry
  // in the browser instead of telling Google a real profile does not exist.
  // `null` = the lookup worked and there is no such (or a deleted) profile.
  const [profile, trips] = await Promise.all([
    getPublicProfile(supabase, params.id).catch(() => undefined),
    listTripsByUser(supabase, params.id).catch(() => [] as TravelerTripRow[]),
  ]);

  if (profile === null) notFound();

  return (
    <ProfileClient
      travelerId={params.id}
      initialProfile={(profile ?? null) as any}
      initialTrips={trips}
    />
  );
}
