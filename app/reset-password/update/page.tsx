'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { getBrowserClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';

export default function UpdatePasswordPage() {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Relies on the recovery session established by /auth/callback after
      // the user clicked the emailed reset link.
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? t.reset_error_generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-16">
      <div className="max-w-md w-full">
        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-6">
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
              {t.reset_new_title}
            </h1>
            <p className="text-[15px] text-ink-400 leading-relaxed mb-8">{t.reset_updated}</p>
            <Link href="/login">
              <Button fullWidth>{t.reset_back_login}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.03em] mb-3">
                {t.reset_new_title}
              </h1>
              <p className="text-[16px] text-ink-400">{t.reset_new_subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label={t.auth_password}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              {error && (
                <div className="rounded-xl bg-blush-50 px-4 py-3 text-[14px] text-blush-500">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={loading || password.length < 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {t.reset_new_submit}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
