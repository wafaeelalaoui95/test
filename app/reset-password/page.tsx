'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { getBrowserClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';

export default function ResetPasswordPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserClient();
      // The recovery link lands on /auth/callback which exchanges the code
      // for a session, then forwards to the update-password page.
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password/update`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      // Supabase does not reveal whether the address exists — we show the
      // same neutral confirmation either way.
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? t.reset_error_generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
              {t.reset_title}
            </h1>
            <p className="text-[15px] text-ink-400 leading-relaxed mb-4">{t.reset_sent}</p>
            {/* Same reason as the signup screen: spam is where it usually is,
                and saying so costs nothing. */}
            <p className="text-[14px] text-ink-400 leading-relaxed mb-8">
              {locale === 'en'
                ? 'Nothing after a minute or two? Check your spam or junk folder.'
                : 'Rien au bout d’une minute ou deux ? Regardez dans vos spams.'}
            </p>
            <Link href="/login">
              <Button variant="secondary" fullWidth>{t.reset_back_login}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.03em] mb-3">
                {t.reset_title}
              </h1>
              <p className="text-[16px] text-ink-400">{t.reset_subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                label={t.auth_email}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={loading || !email}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {t.reset_submit}
              </Button>
            </form>

            <p className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[14px] text-ink-400 hover:text-ink-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.reset_back_login}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
