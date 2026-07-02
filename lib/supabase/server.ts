import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';
import { getSupabaseEnv } from './env';

/**
 * Server-side Supabase client. Reads/writes cookies for session handling.
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export function getServerClient() {
  const cookieStore = cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignored — see above
        }
      },
    },
  });
}

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server
 * route handlers, and ONLY after you've authenticated + authorised the caller
 * yourself. This is how money-state columns on `booking_intents`
 * (payment_status, payment_amount, pickup_confirmed_at, received_confirmed_at)
 * are written: the client role is denied write access to them (see the SQL
 * migration), so the server is the single source of truth.
 *
 * Never import this into client components — it needs SUPABASE_SERVICE_ROLE_KEY
 * which must never reach the browser.
 */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('getAdminClient: missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL');
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
