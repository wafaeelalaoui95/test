'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { getSupabaseEnv } from './env';

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client. Memoized so we don't create multiple instances.
 * Use this from any 'use client' component.
 */
export function getBrowserClient() {
  if (_client) return _client;
  const { url, key } = getSupabaseEnv();
  _client = createBrowserClient<Database>(url, key);
  return _client;
}
