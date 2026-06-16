'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Package } from 'lucide-react';
import { useState } from 'react';
 
/**
 * Code display modal — shown at one of the two trust-handoff moments. 
 *
 * MODE `'pickup'` (default) — SENDER at the pickup meeting:
 *   1. Sender opens this modal, sees the 6-digit code
 *   2. Sender reads the code aloud to the traveler
 *   3. Traveler enters it on their own phone (PickupEnterCodeModal)
 *   4. When traveler enters correctly → DB marks pickup_confirmed_at
 *   5. Sender's card refreshes and timeline advances
 *
 * MODE `'delivery'` — TRAVELER at the drop-off moment:
 *   1. Traveler opens this modal, sees the delivery code
 *   2. Traveler reads it aloud to the sender/recipient
 *   3. Sender enters it on their own phone (PickupEnterCodeModal mode=delivery)
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
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  // In `delivery` mode this is the sender's/recipient's name (whoever
  // the traveler is about to read the code to).
  travelerName: string;
  mode?: 'pickup' | 'delivery';
}) {
  const [copied, setCopied] = useState(false);
  const isDelivery = mode === 'delivery';

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
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-[420px] max-h-[90vh] overflow-y-auto bg-cream-50 rounded-3xl shadow-2xl z-50"
           >
            <div className="px-6 pt-6 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-lavender-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-lavender-600" />
                </div>
                <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
                  {isDelivery ? 'Livraison du colis' : 'Remise du colis'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-ink-50 text-ink-400"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
                {isDelivery ? (
                  <>
                    Communiquez ce code à{' '}
                    <strong className="text-ink-600">{travelerName}</strong> sur place. Il devra
                    le saisir dans son application pour confirmer la réception du colis et libérer
                    le paiement.
                  </>
                ) : (
                  <>
                    Communiquez ce code à{' '}
                    <strong className="text-ink-600">{travelerName}</strong> sur place. Il devra
                    le saisir dans son application pour confirmer qu&apos;il a bien récupéré votre
                    colis.
                  </>
                )}
              </p>

              {/* The code itself — big, easy to read aloud */}
              <div className="bg-white rounded-2xl border-2 border-dashed border-lavender-300 p-6 mb-4">
                <div className="text-[10px] font-bold tracking-[0.2em] text-ink-300 text-center uppercase mb-3">
                  {isDelivery ? 'Code de livraison' : 'Code de remise'}
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

              <button
                type="button"
                onClick={copyCode}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-ink-50 hover:bg-ink-100 text-ink-600 text-[13px] font-semibold transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Code copié
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copier le code
                  </>
                )}
              </button>

              <p className="text-[11px] text-ink-400 text-center mt-4 leading-relaxed">
                🔒 Ne partagez ce code <strong>qu&apos;au moment</strong>{' '}
                {isDelivery ? 'de la livraison.' : 'de la remise en main propre.'}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
