'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// French only, like the e-mail it comes from.
export function UnsubscribeClient({ u, t }: { u: string; t: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(u && t ? 'idle' : 'error');

  async function confirm() {
    setState('busy');
    try {
      const res = await fetch(`/api/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`, {
        method: 'POST',
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-5 py-20">
      <div className="max-w-md text-center">
        {state === 'done' ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
              C’est fait
            </h1>
            <p className="text-[15px] text-ink-400 leading-relaxed mb-8">
              Vous ne recevrez plus nos rappels. Les e-mails liés à vos réservations et à vos paiements
              continueront d’arriver, car ils sont nécessaires au service.
            </p>
          </>
        ) : state === 'error' ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
              Ce lien ne fonctionne pas
            </h1>
            <p className="text-[15px] text-ink-400 leading-relaxed mb-8">
              Il est peut-être incomplet. Écrivez-nous à contact@jibly.io et nous vous désabonnerons.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em] mb-3">
              Ne plus recevoir nos rappels ?
            </h1>
            <p className="text-[15px] text-ink-400 leading-relaxed mb-8">
              Vous ne recevrez plus les rappels envoyés à tous les membres de Jibly. Les e-mails liés à vos
              réservations et à vos paiements continueront d’arriver.
            </p>
            <Button onClick={confirm} disabled={state === 'busy'}>
              {state === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Me désabonner'}
            </Button>
          </>
        )}
        <div className="mt-6">
          <Link href="/" className="text-[14px] text-ink-400 underline">
            Retour à Jibly
          </Link>
        </div>
      </div>
    </div>
  );
}
