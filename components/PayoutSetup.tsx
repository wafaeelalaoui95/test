'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Loader2, Wallet, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { PayoutOnboarding } from '@/components/PayoutOnboarding';

// SetupPayoutsButton lived here: a country dropdown that sent the traveler
// straight to Stripe's hosted onboarding. It has no callers left, and
// reviving it would reintroduce the bug this file exists to fix — the hosted
// form collects an identity document Stripe cannot match to anything we
// already hold, so the traveler uploads the same passport twice. The country
// question now belongs to PayoutOnboarding, which opens the connected account
// first and verifies against it. The hosted form is still reachable, as the
// fallback step there, for the requirements we genuinely cannot collect.

// =============================================================================
// ManagePayoutsButton — opens the traveler's Stripe Express dashboard.
// =============================================================================
// Where an already-onboarded traveler goes to check or change their bank
// details. Stripe hosts it; we never see an account number.
export function ManagePayoutsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // This used to call /api/connect/dashboard, which mints a Stripe Express
  // login link — and Express dashboards don't exist for Custom accounts, so it
  // could never have worked. It failed with StripeInvalidRequestError every
  // time it was pressed.
  //
  // Removing it wasn't right either: someone changes bank two months later and
  // must not need support to do it. Now that the bank step is ours, reuse it.
  // createExternalAccount(default_for_currency: true) replaces the destination
  // rather than adding a second one.
  if (open) return <PayoutOnboarding bankOnly onDone={() => setOpen(false)} />;

  return (
    <button
      onClick={() => setOpen(true)}
      className="text-[13px] text-ink-600 underline underline-offset-2"
    >
      {t.payout_manage_cta}
    </button>
  );
}

// =============================================================================
// PayoutReminder — non-blocking notice that payouts aren't set up yet.
// =============================================================================
// Replaces the hard gate that used to stand in front of publishing a trip.
// Publishing is not a commitment, and blocking it cost far more than the
// occasional traveler who sorts their bank details late. The backend already
// tolerates that case: transferToTraveler skips with 'not_onboarded', the money
// waits in the platform balance, and the account.updated webhook pays them the
// moment they finish. So this only has to be visible, not enforced.
//
// Renders nothing once payouts work, and while we're still checking.
export function PayoutReminder({ className }: { className?: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { payoutsEnabled, loading } = usePayoutStatus();

  if (!user || loading || payoutsEnabled) return null;

  return (
    <div
      className={`rounded-2xl bg-cream-100 border border-ink-50 px-4 py-3 flex items-start gap-3 ${className ?? ''}`}
    >
      <Wallet className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" strokeWidth={1.75} />
      <div className="text-[13px] text-ink-500 leading-relaxed">
        <p>
          {t.payout_reminder_body}{' '}
          <Link
            href="/me?tab=payouts"
            className="text-ink-900 underline underline-offset-2 font-medium"
          >
            {t.payout_reminder_link}
          </Link>
        </p>
        {/* Said here, before the trip is published, because this is the first
            moment a traveler invests effort and the last one before they start
            counting on the money. Someone whose only bank account is Moroccan
            would otherwise find out after carrying a parcel.
            Phrased as what IS needed rather than what is refused, and without
            naming the processor: whose limitation it is doesn't help them, and
            pointing at a supplier reads as passing the blame. */}
        <p className="mt-2 text-ink-400">{t.payout_reminder_countries}</p>
      </div>
    </div>
  );
}

// =============================================================================
// usePayoutStatus — is the current user able to receive money?
// =============================================================================
// Reads the cached flag from the profile first (auth-provider selects '*', so
// the Connect columns are already there). When it says "not payable" we ask
// /api/connect/status, which re-reads the live Stripe account and re-syncs.
//
// That second call is what covers the return-from-onboarding moment: the user
// lands on /me?payouts=done possibly before account.updated arrives, and
// telling them setup is incomplete right after they completed it is how you
// generate support mail.
export function usePayoutStatus(): {
  loading: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  refresh: () => void;
} {
  const { profile, user } = useAuth();
  const [checked, setChecked] = useState<boolean | null>(null);
  const [requirementsDue, setRequirementsDue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const cached = profile?.stripe_payouts_enabled === true;

  useEffect(() => {
    if (!user || cached) {
      setChecked(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch('/api/connect/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setChecked(d.payoutsEnabled === true);
        setRequirementsDue(d.requirementsDue ?? []);
      })
      .catch(() => {
        // Network or Stripe trouble: fall back to the cached flag rather than
        // blocking the page.
        if (!cancelled) setChecked(cached);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, cached, nonce]);

  return {
    loading,
    payoutsEnabled: checked ?? cached,
    requirementsDue,
    refresh: () => setNonce((n) => n + 1),
  };
}

// =============================================================================
// PayoutStatusCard — the settings-row version shown on /me.
// =============================================================================
export function PayoutStatusCard() {
  const { t } = useI18n();
  const { payoutsEnabled, loading } = usePayoutStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-ink-400 py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t.payout_checking}
      </div>
    );
  }

  if (payoutsEnabled) {
    return (
      <div className="py-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-mint-50 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-mint-500" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-ink-900">
              {t.payout_ready_title}
            </p>
            <p className="text-[12px] text-ink-400">{t.payout_ready_sub}</p>
          </div>
        </div>
        {/* Payout setup has to be revisitable — someone changes bank two months
            later and must not need support to do it. Stripe's Express dashboard
            owns that screen, so we just mint a login link. */}
        <ManagePayoutsButton />
      </div>
    );
  }

  return (
    <div className="py-3">
      {/* No title here — the caller supplies the heading (see /me). */}
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        {t.payout_setup_sub}
      </p>
      {/* The identity check used to stand HERE, in front of everything, and
          that was the bug: verifying before the connected account exists
          produces a session Stripe cannot credit against it, so the same
          passport was demanded a second time at the end of payout setup.
          PayoutOnboarding owns the order now — country, details, then the
          identity check, bound to the account it has to satisfy. */}
      <PayoutOnboarding />
    </div>
  );
}
