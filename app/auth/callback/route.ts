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
  // Only allow same-origin internal paths — reject absolute URLs and
  // protocol-relative "//evil.com" / "/\evil.com" to prevent open redirects.
  const rawNext = searchParams.get('next') ?? '/me';
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/me';

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
