import { getServerClient } from '@/lib/supabase/server';

/**
 * Who is allowed to act as an operator.
 *
 * There is no admin role in the database — profiles has no such column, and
 * adding one would mean a column any client could try to write. An env var is
 * the smaller surface for a single-operator marketplace: it lives only on the
 * server, changing it takes a deploy, and nobody can grant it to themselves.
 *
 * ADMIN_USER_IDS is a comma-separated list of auth.users ids. Find yours with:
 *   select id from auth.users where email = 'you@example.com';
 *
 * Unset means NOBODY is an operator — deliberately. A missing env var must
 * fail closed, or a deploy that drops it silently opens every operator tool to
 * every logged-in user.
 */
function adminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const ids = adminIds();
  if (!ids.length) return false;
  return ids.includes(userId);
}

/**
 * The current request's user, plus whether they're an operator.
 * Server-side only — it reads the session cookie.
 */
export async function getAdminContext(): Promise<{
  userId: string | null;
  isAdmin: boolean;
}> {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { userId: user?.id ?? null, isAdmin: isAdminUserId(user?.id) };
}
