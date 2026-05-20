'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { getBrowserClient } from '@/lib/supabase/client';
import { purgeStaleSession } from '@/lib/supabase/auth-provider';
import { withTimeout } from '@/lib/supabase/timeout';
import { useI18n } from '@/lib/i18n/context';

type Mode = 'password' | 'magic';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/me';
  const recovered = searchParams.get('recovered') === '1';
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
        'Sign in'
      );
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? t.auth_error_generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        }),
        10000,
        'Send magic link'
      );
      if (error) throw error;
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message ?? t.auth_error_generic);
    } finally {
      setLoading(false);
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-7">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-ink-600 mb-3 tracking-[-0.025em]">
            {t.auth_magic_sent_title}
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">
            {t.auth_magic_sent_text} <span className="font-semibold text-ink-600">{email}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.03em] mb-3">
            {t.auth_login_title}
          </h1>
          <p className="text-[16px] text-ink-400">{t.auth_login_subtitle}</p>
        </div>

        {recovered && (
          <div className="mb-6 rounded-xl bg-butter-50 border border-butter-200/60 px-4 py-3 flex gap-2.5">
            <RefreshCw className="w-4 h-4 text-butter-500 flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink-500 leading-relaxed">
              <strong className="text-ink-600">Votre session a été réinitialisée.</strong>{' '}
              Reconnectez-vous pour continuer.
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-6 border-b border-ink-100">
          <button
            onClick={() => setMode('password')}
            className={`px-4 py-3 text-[14px] font-medium -mb-px transition-colors ${
              mode === 'password' ? 'text-ink-600 border-b-2 border-ink-500' : 'text-ink-300 hover:text-ink-500'
            }`}
          >
            {t.auth_tab_password}
          </button>
          <button
            onClick={() => setMode('magic')}
            className={`px-4 py-3 text-[14px] font-medium -mb-px transition-colors ${
              mode === 'magic' ? 'text-ink-600 border-b-2 border-ink-500' : 'text-ink-300 hover:text-ink-500'
            }`}
          >
            {t.auth_tab_magic}
          </button>
        </div>

        <form onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink} className="space-y-4">
          <Input
            type="email"
            label={t.auth_email}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {mode === 'password' && (
            <Input
              type="password"
              label={t.auth_password}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          {error && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading || !email || (mode === 'password' && !password)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'password' ? <Lock className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            {mode === 'password' ? t.auth_login_btn : t.auth_send_magic}
          </Button>
        </form>

        <p className="mt-8 text-center text-[14px] text-ink-400">
          {t.auth_no_account}{' '}
          <Link href="/signup" className="font-semibold text-ink-600 hover:text-lavender-700">
            {t.auth_signup_link}
            <ArrowRight className="w-3 h-3 inline ms-1" />
          </Link>
        </p>

        <div className="mt-12 pt-6 border-t border-ink-50 text-center">
          <button
            onClick={() => {
              purgeStaleSession();
              window.location.href = '/login';
            }}
            className="text-[12px] text-ink-300 hover:text-ink-500 transition-colors"
          >
            Problème de connexion ? Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
