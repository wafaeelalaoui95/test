import { notFound } from 'next/navigation';
import { getAdminContext } from '@/lib/admin';
import { AdminPageClient } from './AdminPageClient';

/**
 * Operator console. Server component purely so the access check runs before
 * anything renders.
 *
 * Until now middleware.ts only required a SESSION for /admin, not a role —
 * every logged-in user could open this page. That was survivable while it
 * showed nothing but mock data, and stopped being survivable the moment it
 * grew a tool that moves money.
 *
 * notFound() rather than a redirect: someone who isn't an operator shouldn't
 * learn that an operator console exists at this path.
 */
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) notFound();
  return <AdminPageClient />;
}
