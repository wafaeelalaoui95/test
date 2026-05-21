// app/wallet/page.tsx
//
// Server Component — pre-fetches the wallet transactions on the Vercel edge
// (next to Supabase) instead of from the user's browser. Same pattern as
// /me: cuts the cold-start latency from 5-10s to under 2s on mobile.
//
// The actual UI is the WalletPageClient component, kept as a Client
// Component so it can still handle the "Retirer mes gains" form interactions.

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { listWalletTransactions } from '@/lib/supabase/queries';
import WalletPageClient from './WalletPageClient';

export const dynamic = 'force-dynamic';

const WalletPageClientUntyped = WalletPageClient as any;

export default async function WalletPage() {
  const supabase = getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/wallet');
  }

  // Fetch on the server — single round-trip to Supabase from inside Vercel.
  // We catch errors so a backend hiccup doesn't kill the page; the client
  // can render an empty state.
  let transactions: any[] = [];
  try {
    transactions = await listWalletTransactions(supabase, user.id);
  } catch (e) {
    console.warn('[wallet/page] transactions fetch failed:', e);
  }

  return (
    <WalletPageClientUntyped
      initialUser={{ id: user.id, email: user.email ?? null }}
      initialTransactions={transactions}
    />
  );
}
