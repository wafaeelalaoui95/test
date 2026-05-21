// app/notifications/page.tsx
//
// Server Component — fetches the first batch of notifications on the
// Vercel edge before HTML reaches the browser. Same pattern as /me and
// /wallet. Pagination beyond the first batch happens client-side.

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server'; 
import { listNotifications } from '@/lib/supabase/queries';
import NotificationsPageClient from './NotificationsPageClient';

export const dynamic = 'force-dynamic';

// Cast to any so Next.js' strict page-default-export schema validation
// doesn't trip on our custom props.
const NotificationsPageClientUntyped = NotificationsPageClient as any;

export default async function NotificationsPage() {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/notifications');
  }

  // Initial batch: 30 most recent. The page client can paginate further
  // via "Charger plus" → calls listNotifications with `before`.
  let initialItems: any[] = [];
  try {
    initialItems = await listNotifications(supabase, user.id, 30);
  } catch (e) {
    console.warn('[notifications/page] fetch failed:', e);
  }

  return (
    <NotificationsPageClientUntyped
      initialUser={{ id: user.id, email: user.email ?? null }}
      initialItems={initialItems}
    />
  );
}
