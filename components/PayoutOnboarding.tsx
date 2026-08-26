'use client';

import { useCallback, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import { useI18n } from '@/lib/i18n/context';

// =============================================================================
// PayoutOnboarding — Stripe's onboarding, rendered inside Jibly.
// =============================================================================
// Replaces the redirect to connect.stripe.com. The traveler stays on the site;
// no co-branded hand-off page, no return trip, no wondering whether they left
// Jibly for something legitimate.
//
// The fields are still Stripe's — we don't choose them, and asking for a
// French traveler's name, address and IBAN is not negotiable. What changes is
// that they're asked here.
export function PayoutOnboarding({
  country,
  onExit,
}: {
  // ISO-3166 alpha-2 the traveler picked. Immutable on the Stripe account, so
  // the session route validates it before creating anything.
  country: string;
  // Fired when Stripe reports the flow finished. The caller re-checks status
  // rather than trusting this as proof of completion: leaving the component is
  // not the same as satisfying every requirement.
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);

  // Stripe calls this to fetch a session, and again whenever it needs a fresh
  // one. It must return the client secret and nothing else.
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/connect/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) {
      if (data?.code) setErrCode(data.code);
      setErr(t.payout_start_failed);
      throw new Error(t.payout_start_failed);
    }
    return data.clientSecret as string;
  }, [country, t]);

  const [connect] = useState(() =>
    loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
      fetchClientSecret,
      appearance: {
        // Jibly's palette, so the embedded form doesn't read as a foreign
        // widget dropped into the page.
        variables: {
          colorPrimary: '#2E2A26',
          colorBackground: '#FBF8F3',
          colorText: '#2E2A26',
          borderRadius: '12px',
          fontFamily: 'inherit',
        },
      },
    })
  );

  if (err) {
    return (
      <div className="py-6 text-center">
        <p className="text-[13px] text-blush-500">{err}</p>
        {errCode && (
          <p className="mt-1 text-[11px] text-ink-300 font-mono">{errCode}</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[320px]">
      <ConnectComponentsProvider connectInstance={connect}>
        <ConnectAccountOnboarding
          onExit={onExit}
          // Same stance as the redirect flow: collect what Stripe currently
          // requires and nothing it merely anticipates. For a French traveler
          // that is a name, an address and an IBAN.
          collectionOptions={{
            fields: 'currently_due',
            futureRequirements: 'omit',
          }}
        />
      </ConnectComponentsProvider>
    </div>
  );
}
