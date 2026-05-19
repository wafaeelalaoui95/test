import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Deletes the current user's data: profile row + cascade-deletes their trips,
 * requests, matches, messages, reviews. Then signs out.
 *
 * NOTE: The auth.users row is NOT deleted (that requires a service_role key on
 * the server, which we don't ship publicly). The user's profile + data is
 * fully removed though, so re-signup with the same email will create a fresh
 * empty account. Treat the leftover auth row as a quiet tombstone.
 *
 * If you later add SUPABASE_SERVICE_ROLE_KEY to env, you can use
 * createClient(url, serviceKey).auth.admin.deleteUser(userId) to nuke auth too.
 */
export async function POST() {
  const supabase = getServerClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Delete from public.profiles. The `on delete cascade` in the schema removes
  // trips, requests, matches, messages, and reviews automatically.
  const { error: delErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Sign out so cookies are cleared
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
