'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { Translations } from '@/lib/i18n/translations';

// =============================================================================
// CancelBookingModal — a sender stops a booking the traveller accepted
// =============================================================================
// The counterpart to CancelTripModal, and it carries one thing that modal does
// not have to: the money is already gone from the sender's account, and it is
// not coming straight back.
//
// Saying so here, before they commit, is the whole job. The alternative — a
// cheerful "cancelled!" followed by silence and then an email asking where the
// refund is — is how a reasonable policy turns into a complaint. So the dialog
// states which of the two situations they are in, in their own money, and the
// button underneath it says what it does rather than "Confirm".

type Reason =
  | 'no_longer_needed'
  | 'sent_another_way'
  | 'cannot_make_handover'
  | 'traveller_unresponsive'
  | 'handover_not_agreed'
  | 'other';

const REASONS: Array<{ value: Reason; labelKey: keyof Translations }> = [
  // The sender's own reasons first, the traveller's conduct last. A list that
  // opens by inviting you to blame the other party gets used that way.
  { value: 'no_longer_needed', labelKey: 'me2_bcancel_reason_not_needed' },
  { value: 'sent_another_way', labelKey: 'me2_bcancel_reason_another_way' },
  { value: 'cannot_make_handover', labelKey: 'me2_bcancel_reason_handover' },
  { value: 'handover_not_agreed', labelKey: 'me2_bcancel_reason_not_agreed' },
  { value: 'traveller_unresponsive', labelKey: 'me2_bcancel_reason_unresponsive' },
  { value: 'other', labelKey: 'me2_bcancel_reason_other' },
];

/** Reasons that take the parcel listing down too — see /api/booking/cancel. */
const ENDS_THE_LISTING: Reason[] = ['no_longer_needed', 'sent_another_way'];

export function CancelBookingModal({
  booking,
  onClose,
  onCancelled,
}: {
  booking: { id: string; payment_status: string | null; item_title?: string | null };
  onClose: () => void;
  /** Called once the server has cancelled, so the list can update in place. */
  onCancelled: (bookingId: string) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Which of the two money situations this is. Decided from the booking rather
  // than described vaguely enough to cover both, because "may be refunded" is
  // the sentence people remember as "will be refunded".
  const captured = booking.payment_status === 'captured';

  async function submit() {
    if (!reason) {
      setErr(t.me2_bcancel_err_reason);
      return;
    }
    if (reason === 'other' && !note.trim()) {
      setErr(t.me2_bcancel_err_note);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIntentId: booking.id,
          reason,
          note: note.trim() || undefined,
        }),
      });
      if (res.status === 409) {
        // The parcel changed hands while this dialog was open.
        setErr(t.me2_bcancel_err_handed);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      onCancelled(booking.id);
    } catch {
      setErr(t.me2_bcancel_err_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-ink-900/40 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="w-full sm:w-[460px] max-h-[90vh] overflow-y-auto bg-cream-50 rounded-3xl shadow-2xl pointer-events-auto"
        >
          <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-3">
            <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
              {t.me2_bcancel_title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="p-1.5 -mr-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
              aria-label={t.me2_bcancel_keep}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 pb-6">
            <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
              {t.me2_bcancel_intro}
            </p>

            <div className="space-y-2 mb-5">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border text-[14px] transition-colors ${
                    reason === r.value
                      ? 'bg-white border-ink-300 text-ink-600 font-semibold'
                      : 'bg-white/60 border-ink-100 text-ink-500 hover:border-ink-200'
                  }`}
                >
                  {t[r.labelKey] as string}
                </button>
              ))}
            </div>

            <label className="block text-[13px] font-semibold text-ink-500 mb-2">
              {t.me2_bcancel_note_label}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.me2_bcancel_note_ph}
              rows={3}
              maxLength={500}
              className="w-full text-[14px] rounded-2xl border border-ink-100 px-4 py-3 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-lavender-500/30"
            />

            {/* The money, stated before the button and not after it. */}
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                captured
                  ? 'bg-butter-50 border border-butter-200 text-ink-600'
                  : 'bg-mint-50 border border-mint-200 text-ink-600'
              }`}
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 inline -mt-0.5 me-1.5 ${
                  captured ? 'text-butter-600' : 'text-mint-500'
                }`}
              />
              {captured ? t.me2_bcancel_money_captured : t.me2_bcancel_money_hold}
            </div>

            {reason && ENDS_THE_LISTING.includes(reason) && (
              <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                {t.me2_bcancel_listing_down}
              </p>
            )}

            {err && <p className="mt-3 text-[13px] text-blush-500">{err}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex-1 px-4 py-3 rounded-full bg-white border border-ink-100 text-ink-500 text-[14px] font-semibold hover:bg-ink-50 disabled:opacity-50"
              >
                {t.me2_bcancel_keep}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex-1 px-4 py-3 rounded-full bg-ink-500 text-cream-50 text-[14px] font-semibold hover:bg-ink-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.me2_bcancel_submit}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
