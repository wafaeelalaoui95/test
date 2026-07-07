import { getServerClient } from '@/lib/supabase/server';
import { getPublicProfile, listTripsByUser } from '@/lib/supabase/queries';
import type { TravelerTripRow } from '@/lib/supabase/types';
import { ProfileClient } from './ProfileClient';

// Fetch the profile + its open trips on the server so the page arrives already
// populated — no download-JS → hydrate → fetch waterfall on first load, which
// was making the profile page take ages to appear.
export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const supabase = getServerClient();

  const [profile, trips] = await Promise.all([
    getPublicProfile(supabase, params.id).catch(() => null),
    listTripsByUser(supabase, params.id).catch(() => [] as TravelerTripRow[]),
  ]);

  return (
    <ProfileClient
      travelerId={params.id}
      initialProfile={profile as any}
      initialTrips={trips}
    />
  );
}
