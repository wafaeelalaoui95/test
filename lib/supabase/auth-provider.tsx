'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from './client';
import type { Profile } from './types';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Wipe any local trace of a Supabase session. Used when we detect that the
 * stored session is broken (auth.getUser() hangs, refresh fails, etc.).
 *
 * After purging, the next page load will either show signed-out state
 * (if the user was logged out) or prompt re-login (which works because
 * the credentials are fresh — only the cached session was rotten).
 */
export function purgeStaleSession() {
  if (typeof window === 'undefined') return;
  try {
    const lsKeys = Object.keys(window.localStorage);
    for (const key of lsKeys) {
      if (key.startsWith('sb-') || key.startsWith('supabase.')) {
        window.localStorage.removeItem(key);
      }
    }
    const ssKeys = Object.keys(window.sessionStorage);
    for (const key of ssKeys) {
      if (key.startsWith('sb-') || key.startsWith('supabase.')) {
        window.sessionStorage.removeItem(key);
      }
    }
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; Max-Age=0; path=/;`;
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${window.location.hostname};`;
      }
    }
  } catch {
    // best-effort, swallow
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getBrowserClient();
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        new Promise<{ data: null }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 5000)
        ),
      ]);
      if (result.data) setProfile(result.data as Profile);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;
    let didRecover = false;

    /**
     * If auth.getUser() never resolves, we conclude the local session is
     * corrupted and recover by purging it and reloading.
     *
     * 3 seconds is aggressive but the only honest signal we have: a healthy
     * Supabase auth call returns in <500ms even on slow connections. Past
     * a few seconds, the failure mode is almost always "hang forever".
     */
    const timeout = setTimeout(() => {
      if (cancelled || didRecover) return;
      didRecover = true;
      const hasStoredSession =
        typeof window !== 'undefined' &&
        Object.keys(window.localStorage).some((k) => k.startsWith('sb-'));
      if (hasStoredSession) {
        purgeStaleSession();
        window.location.href = '/login?recovered=1';
      } else {
        setLoading(false);
      }
    }, 3000);

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (cancelled || didRecover) return;
        clearTimeout(timeout);
        setUser(data.user);
        if (data.user) await loadProfile(data.user.id);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled || didRecover) return;
        clearTimeout(timeout);
        purgeStaleSession();
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === 'TOKEN_REFRESHED' && !session) {
        purgeStaleSession();
      }
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Re-fetch the profile when the tab regains focus. Catches out-of-band
  // updates the client can't see live — most importantly identity
  // verification, whose Stripe webhook lands a moment after the user is
  // redirected back, so the profile loaded on return is briefly stale.
  useEffect(() => {
    function refresh() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (user) loadProfile(user.id);
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [user, loadProfile]);

  async function signOut() {
    const supabase = getBrowserClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    purgeStaleSession();
    setUser(null);
    setProfile(null);
  }

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
