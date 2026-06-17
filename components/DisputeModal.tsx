'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { browser } from '@/lib/supabase/queries';
import { useI18n } from '@/lib/i18n/context';

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
  const { t } = useI18n();
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Categories tailored to who's reporting. A sender's biggest concern
  // is non-delivery / damage; a traveler's is usually false accusations
  // from the sender ("they claim I didn't deliver when I did").
  const senderCategories = [
    { value: 'not_delivered', icon: '📭', label: t.rev_dispute_cat_not_delivered, desc: t.rev_dispute_cat_not_delivered_desc },
    { value: 'damaged', icon: '💥', label: t.rev_dispute_cat_damaged, desc: t.rev_dispute_cat_damaged_desc },
    { value: 'wrong_item', icon: '🤔', label: t.rev_dispute_cat_wrong_item, desc: t.rev_dispute_cat_wrong_item_desc },
    { value: 'late_delivery', icon: '🐌', label: t.rev_dispute_cat_late, desc: t.rev_dispute_cat_late_desc },
    { value: 'other', icon: '⚠️', label: t.rev_dispute_cat_other, desc: t.rev_dispute_cat_other_desc },
  ];
  const travelerCategories = [
    { value: 'wrong_item', icon: '🤔', label: t.rev_dispute_cat_mismatch, desc: t.rev_dispute_cat_mismatch_desc },
    { value: 'not_delivered', icon: '📭', label: t.rev_dispute_cat_no_confirm, desc: t.rev_dispute_cat_no_confirm_desc },
    { value: 'other', icon: '⚠️', label: t.rev_dispute_cat_other, desc: t.rev_dispute_cat_other_desc },
  ];
  const categories = reporterRole === 'sender' ? senderCategories : travelerCategories;

  async function submit() {
    if (!category) {
      setError(t.rev_dispute_err_no_category);
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError(t.rev_dispute_err_short_desc);
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
      setError(e?.message ?? t.rev_dispute_err_submit_failed);
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
          {/* Centering wrapper — fixed inset-0 flex instead of translate-based
              positioning, which mis-centred the modal (see PickupShowCodeModal
              fix). pointer-events-none lets clicks fall through to the backdrop
              so click-outside-to-close still works. */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-full sm:w-[480px] max-h-[calc(100vh-2rem)] sm:max-h-[85vh] bg-cream-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          >
            <div className="px-6 pt-6 pb-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-blush-600" />
                </div>
                <h2 className="text-[18px] font-bold text-ink-600 tracking-[-0.015em]">
                  {t.rev_dispute_title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="p-1.5 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
                aria-label={t.rev_close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-2 overflow-y-auto flex-1 min-h-0">
              <p className="text-[13px] text-ink-500 leading-relaxed mb-5">
                {t.rev_dispute_intro_before}{' '}
                <strong className="text-ink-600">{reportedUserName}</strong>
                {t.rev_dispute_intro_after}
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
                  {t.rev_dispute_desc_label}
                </span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setError(null); }}
                  placeholder={t.rev_dispute_desc_placeholder}
                  disabled={busy}
                  className="mt-2 w-full px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-[14px] text-ink-600 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-lavender-500/30 focus:border-lavender-500 transition-colors resize-none disabled:opacity-50"
                />
              </label>

             {error && (
                <div className="text-[12px] text-blush-600 font-medium mt-3">
                  {error}
                </div>
              )}
            </div>

            {/* Sticky footer — always visible regardless of scroll position.
                Critical on mobile where the modal can become taller than
                the viewport and the action button would otherwise hide
                below the fold. */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-ink-100 bg-cream-50">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-blush-500 hover:bg-blush-600 text-cream-50 text-[14px] font-bold transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.rev_sending}
                  </>
                ) : (
                  t.rev_dispute_submit
                )}
              </button>

              <p className="text-[10px] text-ink-300 text-center mt-2 leading-relaxed">
                {t.rev_dispute_abuse_warning}
              </p>
              </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
