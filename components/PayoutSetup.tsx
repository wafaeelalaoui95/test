'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Loader2, Wallet, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { VerifyIdentityButton } from '@/components/IdentityGate';
import { findCountryByName } from '@/lib/countries';
import { payoutCountryOptions } from '@/lib/stripe/payout-countries';

// =============================================================================
// SetupPayoutsButton — calls /api/connect/onboard and redirects to Stripe.
// =============================================================================
// Mirrors VerifyIdentityButton: POST to our route, receive a Stripe-hosted URL,
// send the user there. Stripe returns them to /me?payouts=done, and the
// account.updated webhook flips profiles.stripe_payouts_enabled shortly after.
//
// AccountLinks are single-use and short-lived, so we mint a fresh one on every
// click rather than caching the URL.
export function SetupPayoutsButton({
  label,
  onIdentityRequired,
}: {
  label?: string;
  // The server refuses onboarding for an unverified user (403 identity_required).
  // Rather than showing a dead-end error, hand control back to the caller so it
  // can put the identity step in front of them.
  onIdentityRequired?: () => void;
}) {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Stripe's short error code, shown small under the message. Not for the
  // user to interpret — it's so they can quote it to support instead of
  // "it didn't work".
  const [errCode, setErrCode] = useState<string | null>(null);

  // Stripe requires identity.country on a v2 account (identity_country_required)
  // and it can never be changed afterwards. So we ask outright rather than
  // inferring: guessing from the platform's own country silently made every
  // traveler a UK account holder, and the profile's country field is free text
  // that mostly doesn't map. Prefilled when it happens to map cleanly.
  const options = payoutCountryOptions(locale);
  const prefill = profile?.country
    ? findCountryByName(profile.country.trim())?.code ?? ''
    : '';
  const [country, setCountry] = useState(
    options.some((o) => o.code === prefill) ? prefill : ''
  );

  async function start() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      const res = await fetch('/api/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Carry the UI language so Stripe's hosted form isn't in English for a
        // traveler who has been reading French the whole way here.
        body: JSON.stringify({ locale, country }),
      });
      const data = await res.json();

      if (res.status === 403 && data?.error === 'identity_required') {
        setLoading(false);
        if (onIdentityRequired) onIdentityRequired();
        else setErr(t.payout_identity_first);
        return;
      }
      if (!res.ok || !data.url) {
        // The route returns opaque codes, never raw Stripe text — see the
        // catch in /api/connect/onboard for why.
        if (data?.code) setErrCode(data.code);
        throw new Error(t.payout_start_failed);
      }
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e.message ?? t.me2_error_retry);
      setLoading(false);
    }
  }

  return (
    <>
      <label className="block mb-4">
        <span className="block text-[13px] font-medium text-ink-600 mb-1.5">
          {t.payout_country_label}
        </span>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-[14px] text-ink-600"
        >
          <option value="">{t.payout_country_placeholder}</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
        {/* Immutable on the Stripe side, so warn before rather than support
            after. Only these countries appear because Stripe opens connected
            accounts nowhere else — Morocco included. */}
        <span className="block mt-1.5 text-[12px] text-ink-400 leading-relaxed">
          {t.payout_country_hint}
        </span>
      </label>

      <Button
        onClick={start}
        disabled={loading || !country}
        size="sm"
        fullWidth
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {label ?? t.payout_setup_cta}
      </Button>
      {err && (
        <p className="mt-2 text-[12px] text-blush-500 text-center">{err}</p>
      )}
      {errCode && (
        <p className="mt-1 text-[11px] text-ink-300 text-center font-mono">
          {errCode}
        </p>
      )}
    </>
  );
}

// =============================================================================
// ManagePayoutsButton — opens the traveler's Stripe Express dashboard.
// =============================================================================
// Where an already-onboarded traveler goes to check or change their bank
// details. Stripe hosts it; we never see an account number.
export function ManagePayoutsButton() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/connect/dashboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(t.payout_manage_failed);
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e.message ?? t.me2_error_retry);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={open}
        disabled={loading}
        className="text-[13px] text-ink-600 underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null}
        {t.payout_manage_cta}
      </button>
      {err && <p className="mt-2 text-[12px] text-blush-500">{err}</p>}
    </>
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
      <p className="text-[13px] text-ink-500 leading-relaxed">
        {t.payout_reminder_body}{' '}
        <Link
          href="/me?tab=payouts"
          className="text-ink-900 underline underline-offset-2 font-medium"
        >
          {t.payout_reminder_link}
        </Link>
      </p>
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
  const { profile } = useAuth();
  const [needsIdentity, setNeedsIdentity] = useState(false);

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
      {needsIdentity || !profile?.identity_verified_at ? (
        <VerifyIdentityButton
          onAlreadyVerified={() => setNeedsIdentity(false)}
        />
      ) : (
        <SetupPayoutsButton onIdentityRequired={() => setNeedsIdentity(true)} />
      )}
    </div>
  );
}
