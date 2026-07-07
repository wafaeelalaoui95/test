'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { CodeInput } from './CodeInput';
import { browser } from '@/lib/supabase/queries';
import { useI18n } from '@/lib/i18n/context';

/**
 * Code entry modal — shown at one of the two trust-handoff moments.
 *
 * MODE `'pickup'` (default) — SENDER at the pickup meeting:
 *   1. Sender taps "Saisir le code" on their booking card
 *   2. This modal opens
 *   3. Traveler shows them the code (from PickupShowCodeModal on their phone)
 *   4. Sender enters it here
 *   5. We call confirmPickupWithCode → POST /api/booking/confirm-pickup
 *      (authorises the sender, updates pickup_confirmed_at server-side)
 *   6. Modal closes, parent refreshes the booking, timeline advances
 *
 *   Why the sender enters (and the traveler holds the code): the receiving
 *   party holds the secret, so the handover is only recorded when they're
 *   present and reveal it — the traveler can't later deny receiving it.
 *
 * MODE `'delivery'` — SENDER at the delivery moment:
 *   1. Sender taps "J'ai bien reçu" on their card
 *   2. This modal opens
 *   3. Traveler reads them the delivery code (from PickupShowCodeModal)
 *   4. Sender enters it here
 *   5. We call confirmDeliveryWithCode → DB verifies + parent triggers
 *      the existing /api/confirm-receipt to capture Stripe.
 *
 * The two modes share UI but call DIFFERENT verification functions:
 *   pickup   → confirmPickupWithCode   (validates against `pickup_code`)
 *   delivery → confirmDeliveryWithCode (validates against `delivery_code`)
 *
 * Error handling: invalid code → red shake, max 5 attempts then locked
 * out for a few minutes (basic brute-force defence — the route layer
 * should also rate-limit).
 */
export function PickupEnterCodeModal({
  open,
  onClose,
  onSuccess,
  bookingId,
  travelerId,
  senderName,
  mode = 'pickup',
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  // In `delivery` mode, this is actually the SENDER's id (passed under
  // the same name to keep the type signature compatible with existing
  // callers). Both flows just need "the id of the user typing the code".
  travelerId: string;
  // In `delivery` mode this is the TRAVELER's name (the user typing is
  // the sender; the name shown is whose code they're entering).
  senderName: string;
  mode?: 'pickup' | 'delivery';
}) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const isDelivery = mode === 'delivery';

  const title = isDelivery ? t.pickup_enter_title_delivery : t.pickup_enter_title_pickup;

  async function submit(value: string) {
    if (busy) return;
    if (attempts >= 5) {
      setError(t.pickup_enter_err_too_many);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = isDelivery
        ? await browser.confirmDeliveryWithCode(bookingId, value, travelerId)
        : await browser.confirmPickupWithCode(bookingId, value, travelerId);
      if (res.ok) {
        onSuccess();
        setCode('');
        setAttempts(0);
      } else {
        setAttempts((n) => n + 1);
        if (res.reason === 'invalid_code') {
          setError(
            isDelivery
              ? t.pickup_enter_err_invalid_delivery
              : t.pickup_enter_err_invalid_pickup
          );
        } else if (res.reason === 'already_confirmed') {
          setError(
            isDelivery
              ? t.pickup_enter_err_already_delivery
              : t.pickup_enter_err_already_pickup
          );
        } else if (res.reason === 'not_traveler') {
          setError(t.pickup_enter_err_not_traveler);
        } else if (res.reason === 'not_sender') {
          setError(t.pickup_enter_err_not_sender);
        } else if (res.reason === 'no_proof') {
          setError(t.pickup_enter_err_no_proof);
        } else {
          setError(t.pickup_enter_err_generic);
        }
        setCode('');
      }
    } catch (e: any) {
      setError(e?.message ?? t.pickup_enter_err_unexpected);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setCode('');
    setError(null);
    setAttempts(0);
    onClose();
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
            onClick={close}
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
                <div className="w-10 h-10 rounded-full bg-mint-100 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-mint-700" />
                </div>
                <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="p-1.5 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
                aria-label={t.pickup_close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
                {(isDelivery ? t.pickup_enter_body_delivery : t.pickup_enter_body_pickup)
                  .split('{name}')
                  .flatMap((part, i) =>
                    i === 0
                      ? [part]
                      : [
                          <strong key={i} className="text-ink-600">
                            {senderName}
                          </strong>,
                          part,
                        ]
                  )}
              </p>

              <div className="mb-2">
                <CodeInput
                  value={code}
                  onChange={setCode}
                  onComplete={submit}
                  error={!!error}
                  autoFocus
                  disabled={busy || attempts >= 5}
                />
              </div>

              <div className="h-6 flex items-center justify-center">
                {busy ? (
                  <div className="flex items-center gap-1.5 text-[12px] text-ink-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t.pickup_enter_verifying}
                  </div>
                ) : error ? (
                  <div className="text-[12px] text-blush-500 font-medium">{error}</div>
                ) : (
                  <div className="text-[11px] text-ink-300">
                    {t.pickup_enter_auto_validate}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-ink-50">
                <p className="text-[11px] text-ink-400 leading-relaxed text-center">
                  {isDelivery ? (
                    t.pickup_enter_footer_delivery
                  ) : (
                    t.pickup_enter_footer_pickup
                      .split('{article}')
                      .flatMap((part, i) =>
                        i === 0
                          ? [part]
                          : [
                              <span key={i} className="text-ink-500">
                                {t.pickup_enter_footer_pickup_article}
                              </span>,
                              part,
                            ]
                      )
                  )}
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
