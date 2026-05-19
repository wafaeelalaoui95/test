'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { getBrowserClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/supabase/timeout';
import { useI18n } from '@/lib/i18n/context';

export default function SignupPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getBrowserClient();
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/me`,
          },
        }),
        12000,
        'Sign up'
      );
      if (error) throw error;

      if (data.session) {
        // Auto-confirmed (email confirmation disabled in Supabase settings)
        router.push('/me');
        router.refresh();
      } else {
        // Confirmation email required
        setNeedsConfirmation(true);
      }
    } catch (err: any) {
      setError(err.message ?? t.auth_error_generic);
    } finally {
      setLoading(false);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-7">
            <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold text-ink-600 mb-3 tracking-[-0.025em]">
            {t.auth_check_email_title}
          </h1>
          <p className="text-[16px] text-ink-400 leading-relaxed">
            {t.auth_check_email_text} <span className="font-semibold text-ink-600">{email}</span>
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
            {t.auth_signup_title}
          </h1>
          <p className="text-[16px] text-ink-400">{t.auth_signup_subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label={t.auth_full_name}
            placeholder="Salma El Amrani"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
          />
          <Input
            type="email"
            label={t.auth_email}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            label={t.auth_password}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            hint={t.auth_password_hint}
          />

          {error && (
            <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading || !email || !password || !fullName}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t.auth_signup_btn}
          </Button>
        </form>

        <p className="mt-8 text-center text-[14px] text-ink-400">
          {t.auth_has_account}{' '}
          <Link href="/login" className="font-semibold text-ink-600 hover:text-lavender-700">
            {t.auth_login_link}
            <ArrowRight className="w-3 h-3 inline ms-1" />
          </Link>
        </p>
      </div>
    </div>
  );
}
