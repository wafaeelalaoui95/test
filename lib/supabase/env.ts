/**
 * Read Supabase env vars. Supports both naming conventions:
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy, JWT format `eyJ...`)
 *   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new format `sb_publishable_...`)
 *
 * Both work with the @supabase/ssr SDK. We accept whichever is set so users
 * can paste the snippet Supabase gives them by default.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  return { url, key };
}
