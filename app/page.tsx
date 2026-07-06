import { getServerClient } from '@/lib/supabase/server';
import { listOpenTrips, listOpenRequestsWithProfile } from '@/lib/supabase/queries';
import { HomeClient } from './HomeClient';

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

  return <HomeClient initialTrips={trips as any} initialRequests={requests as any} />;
}
