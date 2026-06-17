// app/me/page.tsx
//
// Server Component — pre-fetches all the user's data in parallel before the
// HTML reaches the client. Then hands everything down to MePageClient as
// props, so there's no useEffect waterfall at hydration time.
//
// Why this is fast: the queries run from the Vercel server, which is in
// the same region as Supabase (RTT ~5-20ms vs 100-300ms from a phone). They
// run in parallel via Promise.all, and the rendered HTML arrives with the
// data already inlined. The user sees content on first paint instead of a
// spinner.

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import {
  getProfile,
  listMyRequests,
  listMyTrips,
  listMyMatches,
  listIncomingBookingIntents,
  listMyBookings,
  listMyTravelerProposals,
  listReviewsByBookingIds,
} from '@/lib/supabase/queries';
import MePageClient from './MePageClient';

// Force dynamic — this page depends on the authenticated user, so we can't
// statically pre-render it.
export const dynamic = 'force-dynamic';

export default async function MePage() {
  const supabase = getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/me');
  }

  // Fetch everything in parallel. Each query is wrapped in a catch so a
  // single failure doesn't kill the whole page — we fall back to an empty
  // array and let the UI show its empty state for that section.
  const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
    p.catch((e) => {
      console.warn('[me/page] query failed:', e);
      return fallback;
    });

  const [
    profile,
    requests,
    trips,
    matches,
    incomingIntents,
    myBookings,
    myProposals,
  ] = await Promise.all([
    safe(getProfile(supabase, user.id), null),
    safe(listMyRequests(supabase, user.id), []),
    safe(listMyTrips(supabase, user.id), []),
    safe(listMyMatches(supabase, user.id), []),
    safe(listIncomingBookingIntents(supabase, user.id), []),
    safe(listMyBookings(supabase, user.id), []),
    safe(listMyTravelerProposals(supabase, user.id), []),
  ]);

  // Now that we have all the booking IDs the user is involved in, fetch
  // all the reviews tied to them in one shot. We need both my reviews
  // (to lock the "Noter" button) AND the other party's reviews (to display
  // them inline as "X vous a noté ★★★★★"). One query, all bookings.
  const allBookingIds = Array.from(
    new Set([
      ...incomingIntents.map((i: any) => i.id),
      ...myBookings.map((i: any) => i.id),
      ...myProposals.map((i: any) => i.id),
    ])
  );
  // Guard: a logged-in user with no profile (or an anonymised one) means the
  // account was deleted but the auth session is still live — eject it instead
  // of rendering a ghost profile. A genuinely new user always has a profile
  // (created synchronously by the on_auth_user_created trigger), so this only
  // catches deleted/orphaned accounts.
  if (!profile || profile.deleted_at) {
    redirect('/auth/sign-out');
  }

  const reviews = await safe(
    listReviewsByBookingIds(supabase, allBookingIds),
    [] as any[]
  );

  return (
    <MePageClient
      initialUser={{ id: user.id, email: user.email ?? null }}
      initialProfile={profile}
      initialRequests={requests}
      initialTrips={trips}
      initialMatches={matches as any}
      initialIncomingIntents={incomingIntents as any}
      initialMyBookings={myBookings as any}
      initialMyProposals={myProposals as any}
      initialReviews={reviews as any}
    />
  );
}
