'use client';

import { ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { VerifyIdentityButton } from '@/components/IdentityGate';

// =============================================================================
// Travellers may publish a trip before verifying their identity, but the trip
// only goes ahead once they have: they cannot accept a booking until then.
// These two pieces say so — one to everyone looking at the trip, one to the
// traveller themselves.
// =============================================================================

/** Shown on an unverified traveller's trip, wherever a sender can book it. */
export function UnverifiedTripNotice({ withNote = true }: { withNote?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-2 rounded-xl bg-butter-50 border border-butter-200 px-3 py-2">
      <ShieldAlert className="w-4 h-4 text-butter-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
      <div className="text-[12.5px] leading-snug">
        <div className="font-semibold text-ink-600">{t.unverified_badge}</div>
        {withNote && <div className="text-ink-500">{t.unverified_trip_note}</div>}
      </div>
    </div>
  );
}

/** For the traveller: verify to unlock. Renders nothing once verified. */
export function VerifyToUnlockCard() {
  const { t } = useI18n();
  const { profile } = useAuth();
  if (!profile || profile.identity_verified_at) return null;
  return (
    <div className="rounded-2xl bg-butter-50 border border-butter-200 p-5 text-start">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-5 h-5 text-butter-600" strokeWidth={2} />
        <h3 className="text-[15px] font-bold text-ink-600">{t.unverified_own_title}</h3>
      </div>
      <p className="text-[14px] text-ink-500 leading-relaxed mb-4">{t.unverified_own_text}</p>
      <VerifyIdentityButton label={t.unverified_own_cta} />
    </div>
  );
}
