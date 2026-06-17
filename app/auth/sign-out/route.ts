import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = getServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}

/**
 * GET variant so a Server Component can sign the user out via `redirect()`
 * (Server Components can't issue a POST). Used by the `/me` guard to eject a
 * session whose profile no longer exists — e.g. an account deleted under the
 * old hard-delete code that left a re-loginnable auth.users row behind.
 */
export async function GET(request: NextRequest) {
  const supabase = getServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
