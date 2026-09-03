import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

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

  // TOKEN-HASH FLOW — what the email templates use.
  //
  // exchangeCodeForSession() is PKCE: it needs a code_verifier cookie left in
  // the browser that STARTED the signup. Open the email anywhere else — Gmail's
  // in-app browser, a private tab, a laptop when you signed up on your phone —
  // and the cookie isn't there, so the first click fails and a retry in the
  // right browser succeeds. That is the "you have to click twice" everyone hit.
  //
  // verifyOtp() carries no such requirement: the hash in the URL is the whole
  // proof, so the link works from any browser on any device. Kept alongside the
  // code path rather than replacing it, because OAuth still returns a code.
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = getServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] verifyOtp failed:', error.message);
  }

  if (code) {
    const supabase = getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
  }

  // Something went wrong — bounce back to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
