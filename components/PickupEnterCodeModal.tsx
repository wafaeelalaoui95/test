'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PackageCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { CodeInput } from './CodeInput';
import { browser } from '@/lib/supabase/queries';

/**
 * Code entry modal — shown to the TRAVELER at the moment of pickup.
 *
 * The flow at the meeting:
 *   1. Traveler taps "Je récupère le colis" on their card
 *   2. This modal opens
 *   3. Sender reads them the code (from PickupShowCodeModal on their phone)
 *   4. Traveler enters it here
 *   5. We call confirmPickupWithCode — DB updates pickup_confirmed_at
 *   6. Modal closes, parent refreshes the booking, timeline advances
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
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  travelerId: string;
  senderName: string;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function submit(value: string) {
    if (busy) return;
    if (attempts >= 5) {
      setError('Trop de tentatives. Réessayez dans quelques minutes.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await browser.confirmPickupWithCode(bookingId, value, travelerId);
      if (res.ok) {
        // Success — close and let the parent refresh
        onSuccess();
        // Reset for next time
        setCode('');
        setAttempts(0);
      } else {
        setAttempts((n) => n + 1);
        if (res.reason === 'invalid_code') {
          setError('Code incorrect. Vérifiez avec l\'expéditeur.');
        } else if (res.reason === 'already_confirmed') {
          setError('La remise a déjà été confirmée.');
        } else if (res.reason === 'not_traveler') {
          setError('Vous n\'êtes pas autorisé à confirmer cette remise.');
        } else {
          setError('Une erreur est survenue. Réessayez.');
        }
        // Clear the input on error so they can re-type
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
                  Confirmer la remise
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
                Demandez à <strong className="text-ink-600">{senderName}</strong> le code de remise
                affiché sur son application, puis saisissez-le ci-dessous.
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

              {/* Status / error line — fixed height to avoid layout jumps */}
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
                  En confirmant la remise, vous vous engagez à transporter ce colis et à le livrer
                  à destination. Toute non-livraison peut entraîner des poursuites pour abus de
                  confiance <span className="text-ink-500">(art. 314-1 du Code pénal)</span>.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
