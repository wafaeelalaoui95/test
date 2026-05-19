'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const supabase = getBrowserClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
  }

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    // Safety: never stay in loading state for more than 4 seconds.
    // If Supabase doesn't respond by then, assume signed-out and unblock the UI.
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 4000);

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      if (data.user) await loadProfile(data.user.id);
      setLoading(false);
      clearTimeout(timeout);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      clearTimeout(timeout);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
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
  }, []);

  async function signOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

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
