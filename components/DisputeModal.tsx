'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { browser } from '@/lib/supabase/queries';

/**
 * "Signaler un problème" modal — opens a dispute on a booking.
 *
 * Used by both sender and traveler — same categories adapted with
 * context. Filing a dispute:
 *   - Creates a row in the `disputes` table
 *   - Auto-restricts the reported user via DB trigger
 *   - Notifies the reported user via the notifications table
 *   - Pings the admin (us) via email (separate route)
 *
 * UI is deliberately direct and uncomforting — these aren't fun moments,
 * so we don't dress it up with mascots. Just: pick a category, describe
 * what happened, submit.
 */
export function DisputeModal({
  open,
  onClose,
  onSuccess,
  bookingId,
  reporterId,
  reportedUserId,
  reportedUserName,
  // Side of the reporter — affects which categories are most relevant.
  reporterRole,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  reporterId: string;
  reportedUserId: string;
  reportedUserName: string;
  reporterRole: 'sender' | 'traveler';
}) {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categories tailored to who's reporting. A sender's biggest concern
  // is non-delivery / damage; a traveler's is usually false accusations
  // from the sender ("they claim I didn't deliver when I did").
  const senderCategories = [
    { value: 'not_delivered', icon: '📭', label: 'Colis non livré', desc: 'Le voyageur n\'a pas livré mon colis' },
    { value: 'damaged', icon: '💥', label: 'Colis abîmé', desc: 'Le colis est arrivé endommagé' },
    { value: 'wrong_item', icon: '🤔', label: 'Mauvais objet', desc: 'L\'objet livré n\'est pas le mien' },
    { value: 'late_delivery', icon: '🐌', label: 'Très en retard', desc: 'La livraison est largement hors délai' },
    { value: 'other', icon: '⚠️', label: 'Autre problème', desc: 'Je veux décrire un autre problème' },
  ];
  const travelerCategories = [
    { value: 'wrong_item', icon: '🤔', label: 'Le colis ne correspond pas', desc: 'L\'objet ne correspond pas à la description' },
    { value: 'not_delivered', icon: '📭', label: 'Le destinataire refuse de confirmer', desc: 'J\'ai livré mais la réception n\'est pas confirmée' },
    { value: 'other', icon: '⚠️', label: 'Autre problème', desc: 'Je veux décrire un autre problème' },
  ];
  const categories = reporterRole === 'sender' ? senderCategories : travelerCategories;

  async function submit() {
    if (!category) {
      setError('Sélectionnez une catégorie');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Décrivez le problème en quelques mots (10 caractères minimum)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await browser.createDispute({
        bookingId,
        reporterId,
        reportedUserId,
        category: category as any,
        description: description.trim(),
      });
      onSuccess();
      // Reset
      setCategory('');
      setDescription('');
    } catch (e: any) {
      setError(e?.message ?? 'Impossible d\'envoyer le signalement');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setCategory('');
    setDescription('');
    setError(null);
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
            className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-[480px] sm:max-h-[85vh] bg-cream-50 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-6 pb-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-blush-600" />
                </div>
                <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
                  Signaler un problème
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

            <div className="px-6 pb-6 overflow-y-auto">
              <p className="text-[13px] text-ink-500 leading-relaxed mb-5">
                Cette action signale un problème concernant{' '}
                <strong className="text-ink-600">{reportedUserName}</strong>.
                Notre équipe sera notifiée immédiatement et traitera le litige sous 48h.
              </p>

              {/* Category picker */}
              <div className="space-y-2 mb-5">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => { setCategory(c.value); setError(null); }}
                    className={`
                      w-full text-left p-3 rounded-2xl border-2 transition-all flex items-start gap-3
                      ${category === c.value
                        ? 'border-blush-400 bg-blush-50/40'
                        : 'border-ink-100 bg-white hover:border-ink-200'}
                    `}
                  >
                    <span className="text-[20px] flex-shrink-0 mt-0.5">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-ink-600">{c.label}</div>
                      <div className="text-[12px] text-ink-400 mt-0.5">{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Description */}
              <label className="block">
                <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-ink-400">
                  Description détaillée
                </span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setError(null); }}
                  placeholder="Décrivez ce qu'il s'est passé, les dates, les échanges, et tout ce qui peut nous aider à trancher…"
                  disabled={busy}
                  className="mt-2 w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-lavender-500/30 focus:border-lavender-500 transition-colors resize-none disabled:opacity-50"
                />
              </label>

              {error && (
                <div className="text-[12px] text-blush-600 font-medium mt-3">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-blush-500 hover:bg-blush-600 text-cream-50 text-[14px] font-bold transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  'Envoyer le signalement'
                )}
              </button>

              <p className="text-[10px] text-ink-300 text-center mt-3 leading-relaxed">
                Les signalements abusifs peuvent entraîner la suspension de votre propre compte.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
