'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';

// =============================================================================
// VerifyIdentityButton — calls /api/identity/create-session and redirects.
// =============================================================================
// Reusable button that kicks off Stripe Identity. It POSTs to our API route,
// which creates a VerificationSession server-side and returns the hosted-flow
// URL. The user is redirected there; Stripe sends them back to /me?identity=done
// after completion. Shared by /me and the identity gate below.
export function VerifyIdentityButton({ label }: { label?: string }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      // Tell the API where to send the user back after Stripe — the page
      // they're on right now (e.g. /voyager) so their in-progress form is
      // restored instead of landing them on /me.
      const returnTo =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : undefined;
      const res = await fetch('/api/identity/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTo }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t.me2_verify_start_failed);
      }
      // Redirect to Stripe's hosted flow
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
          <ShieldCheck className="w-4 h-4" />
        )}
        {label ?? t.me2_verify_my_identity}
      </Button>
      {err && (
        <p className="mt-2 text-[12px] text-blush-500 text-center">{err}</p>
      )}
    </>
  );
}

// =============================================================================
// useIdentityGate — blocks an action until the user has verified their identity.
// =============================================================================
// Usage:
//   const gate = useIdentityGate();
//   ...
//   {gate.modal}                       // render once in the page
//   if (!gate.ensureVerified()) return; // call before any create/pay action
//
// `ensureVerified()` returns true when the user is verified and the action may
// proceed. Otherwise it opens the gate modal and returns false. While the
// profile is still loading we default to NOT verified (safer: never let an
// unconfirmed user through).
export function useIdentityGate(): {
  verified: boolean;
  ensureVerified: () => boolean;
  modal: ReactNode;
} {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const verified = !!profile?.identity_verified_at;

  function ensureVerified() {
    if (verified) return true;
    setOpen(true);
    return false;
  }

  const modal = (
    <AnimatePresence>
      {open && <IdentityGateModal onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );

  return { verified, ensureVerified, modal };
}

// Block screen shown when an unverified user attempts a gated action. Mirrors
// the framer-motion backdrop/card styling of the propose/book modals.
function IdentityGateModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-mint-50 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-mint-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {t.me2_verify_identity_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400"
            aria-label={t.common_close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
          {t.gate_identity_required}
        </p>

        <ul className="space-y-3 mb-6">
          {[t.trip_identity_benefit_1, t.trip_identity_benefit_2, t.trip_identity_benefit_3].map((b) => (
            <li key={b} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-mint-500 mt-1 flex-shrink-0" strokeWidth={2.5} />
              <span className="text-[14px] text-ink-500">{b}</span>
            </li>
          ))}
        </ul>

        <VerifyIdentityButton />
      </motion.div>
    </motion.div>
  );
}
