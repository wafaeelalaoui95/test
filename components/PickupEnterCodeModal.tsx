'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { CodeInput } from './CodeInput';
import { browser } from '@/lib/supabase/queries';

/**
 * Code entry modal — shown at one of the two trust-handoff moments.
 *
 * MODE `'pickup'` (default) — TRAVELER at the pickup meeting:
 *   1. Traveler taps "J'ai récupéré" on their card
 *   2. This modal opens
 *   3. Sender reads them the code (from PickupShowCodeModal on their phone)
 *   4. Traveler enters it here
 *   5. We call confirmPickupWithCode → DB updates pickup_confirmed_at
 *   6. Modal closes, parent refreshes the booking, timeline advances
 *
 * MODE `'delivery'` — SENDER at the delivery moment:
 *   1. Sender taps "J'ai bien reçu" on their card
 *   2. This modal opens
 *   3. Traveler reads them the delivery code (from PickupShowCodeModal)
 *   4. Sender enters it here
 *   5. We call confirmDeliveryWithCode → DB verifies + parent triggers
 *      the existing /api/booking/confirm-receipt to capture Stripe.
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
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const isDelivery = mode === 'delivery';

  const title = isDelivery ? 'Confirmer la réception' : 'Confirmer la remise';

  async function submit(value: string) {
    if (busy) return;
    if (attempts >= 5) {
      setError('Trop de tentatives. Réessayez dans quelques minutes.');
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
              ? 'Code incorrect. Vérifiez avec le voyageur.'
              : "Code incorrect. Vérifiez avec l'expéditeur."
          );
        } else if (res.reason === 'already_confirmed') {
          setError(
            isDelivery
              ? 'La réception a déjà été confirmée.'
              : 'La remise a déjà été confirmée.'
          );
        } else if (res.reason === 'not_traveler') {
          setError("Vous n'êtes pas autorisé à confirmer cette remise.");
        } else if (res.reason === 'not_sender') {
          setError("Vous n'êtes pas autorisé à confirmer cette réception.");
        } else if (res.reason === 'no_proof') {
          setError("Aucune preuve de livraison n'a encore été déposée.");
        } else {
          setError('Une erreur est survenue. Réessayez.');
        }
        setCode('');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur inattendue');
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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-[420px] bg-cream-50 rounded-3xl shadow-2xl z-50 overflow-hidden"
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
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
                {isDelivery ? (
                  <>
                    Demandez à <strong className="text-ink-600">{senderName}</strong> le code de
                    livraison qu&apos;il a affiché sur son application, puis saisissez-le
                    ci-dessous.
                  </>
                ) : (
                  <>
                    Demandez à <strong className="text-ink-600">{senderName}</strong> le code de
                    remise affiché sur son application, puis saisissez-le ci-dessous.
                  </>
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
                    Vérification…
                  </div>
                ) : error ? (
                  <div className="text-[12px] text-blush-500 font-medium">{error}</div>
                ) : (
                  <div className="text-[11px] text-ink-300">
                    Le code se valide automatiquement
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-ink-50">
                <p className="text-[11px] text-ink-400 leading-relaxed text-center">
                  {isDelivery ? (
                    <>
                      En confirmant la réception, vous libérez le paiement vers le voyageur.
                      Cette action est définitive.
                    </>
                  ) : (
                    <>
                      En confirmant la remise, vous vous engagez à transporter ce colis et à le
                      livrer à destination. Toute non-livraison peut entraîner des poursuites pour
                      abus de confiance{' '}
                      <span className="text-ink-500">(art. 314-1 du Code pénal)</span>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
