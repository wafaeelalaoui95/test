'use client';

import { useEffect } from 'react';

/**
 * Reloads the page when the tab regains focus after being hidden for too long.
 *
 * Why this exists: Supabase's browser client can end up with a stale session
 * token when the tab has been backgrounded for a while (especially across
 * deploys). When the user returns, the next auth call hangs and the page
 * shows spinners forever. The honest fix is complex (auto-detect expired
 * tokens, re-issue, retry...). This is the pragmatic alternative — when
 * we detect the tab was hidden >30s, we just reload, which gets fresh
 * cookies, a fresh client, and a working session.
 *
 * Trade-off: the user loses any unsaved local state (open modal, form
 * being filled in, etc.). For our flows that's acceptable; nothing
 * critical lives in client state for more than a few seconds.
 */
const STALE_THRESHOLD_MS = 30_000;

export function TabRefresher() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let hiddenAt: number | null = null;

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      // Tab became visible again
      if (hiddenAt !== null) {
        const hiddenFor = Date.now() - hiddenAt;
        hiddenAt = null;
        if (hiddenFor > STALE_THRESHOLD_MS) {
          // Force a fresh load to recover from any stale auth state.
          window.location.reload();
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return null;
}
