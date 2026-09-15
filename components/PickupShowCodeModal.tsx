'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Package, ShieldCheck, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
 
/**
 * Code display modal — shown at one of the two trust-handoff moments. 
 *
 * MODE `'pickup'` (default) — TRAVELER at the pickup meeting:
 *   1. Traveler opens this modal, sees the 6-digit code
 *   2. Traveler reads the code aloud to the sender (who is handing over)
 *   3. Sender enters it on their own phone (PickupEnterCodeModal)
 *   4. When the sender enters correctly → DB marks pickup_confirmed_at
 *   5. Cards refresh and the timeline advances
 *
 * MODE `'delivery'` — RECIPIENT side (the sender, or a relative receiving on
 * their behalf) holds the code:
 *   1. The sender opens this modal, sees the delivery code
 *   2. They give it to the traveler at drop-off (or share it beforehand with
 *      the relative who receives for them)
 *   3. The traveler enters it (PickupEnterCodeModal mode=delivery)
 *   4. On match → DB marks received_confirmed_at + Stripe captures
 *
 * Why visible up-front (and not after a "I'm here" tap):
 * we want zero friction at the meeting moment. The code is gated by
 * RLS anyway — only the right party can read it.
 */
export function PickupShowCodeModal({
  open,
  onClose,
  code,
  travelerName,
  mode = 'pickup',
  bookingIntentId,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  // In `delivery` mode this is the sender's/recipient's name (whoever
  // the traveler is about to read the code to).
  travelerName: string;
  mode?: 'pickup' | 'delivery';
  /**
   * Pickup mode only. Present means the traveller must declare they inspected
   * the parcel before the code is revealed — see the inspection gate below.
   */
  bookingIntentId?: string;
}) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const isDelivery = mode === 'delivery';

  // ─── INSPECTION GATE (pickup only) ──────────────────────────────────────
  // The traveller is standing in front of the parcel. This is the single
  // moment where a human being can look inside a bag before it goes to an
  // airport, and the only moment worth asking the question.
  //
  // It gates the CODE, not a later button, for two reasons. The code is what
  // records the handover, so nothing can be recorded without the declaration
  // existing first. And the traveller declares on their OWN device — the
  // alternative, a checkbox on the sender's entry screen, would be the sender
  // attesting to an inspection they did not perform.
  //
  // The declaration is written by /api/attestation, which resolves the wording
  // and the timestamp itself; this screen only says which booking.
  const needsInspection = !isDelivery && !!bookingIntentId;
  const [inspected, setInspected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordErr, setRecordErr] = useState<string | null>(null);
  const revealed = !needsInspection || inspected;

  // Re-arm every time the modal opens. A traveller carrying three parcels must
  // look at each of them, not tick once and coast.
  useEffect(() => {
    if (open) {
      setInspected(false);
      setRecordErr(null);
    }
  }, [open, bookingIntentId]);

  async function confirmInspected() {
    if (recording) return;
    setRecording(true);
    setRecordErr(null);
    try {
      const res = await fetch('/api/attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIntentId,
          kind: 'traveler_inspection',
          locale,
        }),
      });
      if (!res.ok) throw new Error('record_failed');
      // Only now. If the record did not land, the code stays hidden: a
      // handover we cannot evidence is one we would rather not have.
      setInspected(true);
    } catch {
      setRecordErr(t.inspect_record_failed);
    } finally {
      setRecording(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked on iOS; the code is still visible */
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-ink-900/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
       <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full sm:w-[420px] max-h-[90vh] overflow-y-auto bg-cream-50 rounded-3xl shadow-2xl pointer-events-auto"
           >
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-lavender-600" />
                </div>
                <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
                  {isDelivery ? t.pickup_show_title_delivery : t.pickup_show_title_pickup}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-ink-50 text-ink-400"
                aria-label={t.pickup_close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
                {(isDelivery ? t.pickup_show_body_delivery : t.pickup_show_body_pickup)
                  .split('{name}')
                  .flatMap((part, i) =>
                    i === 0
                      ? [part]
                      : [
                          <strong key={i} className="text-ink-600">
                            {travelerName}
                          </strong>,
                          part,
                        ]
                  )}
              </p>

              {/* The declaration, before the code. Reading it is the last
                  thing standing between a bag and an aircraft, so it is not a
                  line of small print under a button that is already usable —
                  the code does not exist on screen until it is answered. */}
              {needsInspection && !inspected && (
                <div className="bg-white rounded-2xl border border-butter-200 p-5 mb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-butter-50 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-butter-600" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-ink-600 leading-snug mb-1">
                        {t.inspect_title}
                      </p>
                      <p className="text-[13px] text-ink-500 leading-relaxed">
                        {t.inspect_statement}
                      </p>
                    </div>
                  </div>

                  {recordErr && (
                    <p className="text-[12.5px] text-blush-500 mb-3 leading-relaxed">
                      {recordErr}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={confirmInspected}
                    disabled={recording}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-ink-500 hover:bg-ink-600 disabled:opacity-50 text-cream-50 text-[13.5px] font-semibold transition-colors"
                  >
                    {recording ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    {t.inspect_confirm}
                  </button>
                  <p className="mt-2.5 text-[12px] text-ink-400 leading-relaxed">
                    {t.inspect_refuse_hint}
                  </p>
                </div>
              )}

              {/* The code itself — big, easy to read aloud */}
              {revealed && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-lavender-300 p-6 mb-4">
                <div className="text-[10px] font-bold tracking-[0.2em] text-ink-300 text-center uppercase mb-3">
                  {isDelivery ? t.pickup_show_code_label_delivery : t.pickup_show_code_label_pickup}
                </div>
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {code.split('').map((digit, i) => (
                    <div
                      key={i}
                      className="w-9 sm:w-10 h-12 sm:h-14 rounded-xl bg-lavender-50 border border-lavender-200 flex items-center justify-center text-[26px] sm:text-[28px] font-extrabold text-lavender-700 num-display"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
              </div>
              )}

              {revealed && (
                <button
                  type="button"
                  onClick={copyCode}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-ink-50 hover:bg-ink-100 text-ink-600 text-[13px] font-semibold transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t.pickup_show_copied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {t.pickup_show_copy}
                    </>
                  )}
                </button>
              )}

              {revealed && (
                <p className="text-[11px] text-ink-400 text-center mt-4 leading-relaxed">
                  {isDelivery ? t.pickup_show_warning_delivery : t.pickup_show_warning_pickup}
                </p>
              )}
            </div>
      </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
