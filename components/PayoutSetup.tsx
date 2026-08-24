'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Wallet, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { VerifyIdentityButton } from '@/components/IdentityGate';
import { findCountryByName, countryDisplayName } from '@/lib/countries';
import { isPayoutCountry, payoutCountryNames } from '@/lib/stripe/payout-countries';

// =============================================================================
// PayoutCountriesNote — tells the traveler the bank-account requirement BEFORE
// they click through to Stripe.
// =============================================================================
// Without this, someone banking outside Stripe's footprint fills in a hosted
// form and only then discovers their country isn't offered. Morocco is the case
// that matters for Jibly: it's a core corridor and Stripe doesn't operate there
// at all, so a Morocco-resident traveler needs a European account.
//
// When we can map their profile country and know it won't work, say so
// outright. When we can't (the profile field is free text, so most values don't
// map), fall back to stating the requirement and listing the countries.
function PayoutCountriesNote({
  routeCountries,
}: {
  // Countries of the trip being published (departure, arrival), as the
  // free-text names stored on trips. Optional: /me has no route context.
  routeCountries?: (string | null | undefined)[];
}) {
  const { t, locale } = useI18n();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const toCode = (v: string | null | undefined) =>
    v ? findCountryByName(v.trim())?.code ?? null : null;

  // Countries ON THIS ROUTE that Stripe can't pay into. A Paris→Casablanca
  // trip surfaces Morocco; a Paris→Madrid trip surfaces nothing, and warning
  // that traveler about bank-account countries is pure noise.
  const blockedOnRoute = (routeCountries ?? [])
    .map((name) => ({ name: name?.trim() ?? '', code: toCode(name) }))
    .filter((c) => c.name && isPayoutCountry(c.code) === false)
    .map((c) => countryDisplayName(c.name, locale));

  const ownCountryUnsupported =
    isPayoutCountry(toCode(profile?.country)) === false;

  return (
    <div className="mb-4">
      {ownCountryUnsupported ? (
        // Strongest case: we know where they are and it won't work.
        <p className="text-[13px] text-blush-500 leading-relaxed">
          {t.payout_country_unsupported}
        </p>
      ) : blockedOnRoute.length > 0 ? (
        <p className="text-[13px] text-ink-400 leading-relaxed">
          {t.payout_countries_route_note.replace(
            '{countries}',
            Array.from(new Set(blockedOnRoute)).join(', ')
          )}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 text-[12px] text-ink-500 underline underline-offset-2"
      >
        {open ? t.payout_countries_hide : t.payout_countries_show}
      </button>
      {open && (
        <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
          {payoutCountryNames(locale).join(' · ')}
        </p>
      )}
    </div>
  );
}

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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Stripe's short error code, shown small under the message. Not for the
  // user to interpret — it's so they can quote it to support instead of
  // "it didn't work".
  const [errCode, setErrCode] = useState<string | null>(null);

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
        body: JSON.stringify({ locale }),
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
      <Button onClick={start} disabled={loading} size="sm" fullWidth>
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
// usePayoutGate — blocks publishing a trip until the traveler can be paid.
// =============================================================================
// Same shape as useIdentityGate:
//   const gate = usePayoutGate();
//   {gate.modal}
//   if (!gate.ensurePayable()) return;
//
// Why gate at all: a traveler who publishes a trip, carries a parcel and only
// then discovers they cannot be paid is a support problem and a trust problem.
// Better to ask for the bank details before they commit to anything. While the
// status is still loading we default to NOT payable — the safe direction.
export function usePayoutGate(opts?: {
  // Departure/arrival countries of the trip. Used only to decide whether the
  // bank-account-country caveat is worth showing — see PayoutCountriesNote.
  routeCountries?: (string | null | undefined)[];
}): {
  payoutsEnabled: boolean;
  ensurePayable: () => boolean;
  modal: ReactNode;
} {
  const { payoutsEnabled } = usePayoutStatus();
  const [open, setOpen] = useState(false);

  function ensurePayable() {
    if (payoutsEnabled) return true;
    setOpen(true);
    return false;
  }

  return {
    payoutsEnabled,
    ensurePayable,
    modal: (
      <AnimatePresence>
        {open && (
          <PayoutGateModal
            onClose={() => setOpen(false)}
            routeCountries={opts?.routeCountries}
          />
        )}
      </AnimatePresence>
    ),
  };
}

// Block screen shown when a traveler tries to publish before being payable.
// Mirrors IdentityGateModal's backdrop/card styling.
function PayoutGateModal({
  onClose,
  routeCountries,
}: {
  onClose: () => void;
  routeCountries?: (string | null | undefined)[];
}) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [needsIdentity, setNeedsIdentity] = useState(
    !profile?.identity_verified_at
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-300 hover:text-ink-500"
          aria-label={t.common_close}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-mint-50 flex items-center justify-center mb-4">
          <Wallet className="w-6 h-6 text-mint-500" />
        </div>

        <h3 className="text-[19px] font-semibold text-ink-900 mb-2">
          {t.payout_gate_title}
        </h3>
        <p className="text-[14px] text-ink-500 leading-relaxed mb-4">
          {t.payout_gate_body}
        </p>

        <PayoutCountriesNote routeCountries={routeCountries} />

        {/* Payouts require a verified identity — the onboarding route refuses
            otherwise. Show the identity step first so the user is not bounced. */}
        {needsIdentity ? (
          <VerifyIdentityButton
            onAlreadyVerified={() => setNeedsIdentity(false)}
          />
        ) : (
          <SetupPayoutsButton
            onIdentityRequired={() => setNeedsIdentity(true)}
          />
        )}
      </motion.div>
    </motion.div>
  );
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
      <div className="flex items-center gap-2.5 py-3">
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
    );
  }

  return (
    <div className="py-3">
      {/* No title here — the caller supplies the heading (see /me). */}
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        {t.payout_setup_sub}
      </p>
      <PayoutCountriesNote />
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
