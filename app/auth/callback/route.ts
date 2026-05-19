import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Handles the auth callback from magic-link emails & OAuth providers.
 * Supabase redirects the user here with a `code` query parameter.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/me';

  if (code) {
    const supabase = getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — bounce back to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
