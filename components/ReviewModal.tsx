'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Form';
import { browser } from '@/lib/supabase/queries';
import { useI18n } from '@/lib/i18n/context';

type Props = {
  // The booking being reviewed.
  bookingIntentId: string;
  // Who's writing the review (the current user).
  reviewerId: string;
  // Who's being reviewed — derived from the booking by the caller.
  reviewedUserId: string;
  // For the modal title and the rating hover help.
  reviewedUserName: string;
  // Sender reviewing traveler, or traveler reviewing sender. Used only
  // for copy — "Comment était [le voyageur|l'expéditeur] ?".
  reviewedRole: 'traveler' | 'sender';
  onClose: () => void;
  // Called after successful review insert. Receives the inserted row's
  // rating so the parent can update the lock state without refetching.
  onSuccess: (rating: number) => void;
};

// Mutual-review modal. Used in two contexts: sender reviewing their
// traveler, and traveler reviewing their sender. The UI is the same;
// only the copy changes via reviewedRole.
//
// We use a 1-5 star scale with hover preview, a small contextual hint
// ("Was the delivery on time?") under the stars, and an optional
// free-text comment. Insertion is gated by DB constraints (one review
// per booking per reviewer), so concurrent double-submits are safe.
export function ReviewModal({
  bookingIntentId,
  reviewerId,
  reviewedUserId,
  reviewedUserName,
  reviewedRole,
  onClose,
  onSuccess,
}: Props) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Role-based copy. Kept tiny — we only need a couple of words to
  // contextualize.
  const roleLabels = reviewedRole === 'traveler'
    ? {
        title: t.rev_review_title.replace('{name}', reviewedUserName),
        subtitle: t.rev_review_subtitle_traveler,
        placeholder: t.rev_review_placeholder_traveler,
      }
    : {
        title: t.rev_review_title.replace('{name}', reviewedUserName),
        subtitle: t.rev_review_subtitle_sender,
        placeholder: t.rev_review_placeholder_sender,
      };

  // Helper labels under the stars — give the user a quick clue about what
  // each number means. Shown only when a value is hovered or selected.
  const ratingLabel = (n: number): string => {
    switch (n) {
      case 1: return t.rev_rating_1;
      case 2: return t.rev_rating_2;
      case 3: return t.rev_rating_3;
      case 4: return t.rev_rating_4;
      case 5: return t.rev_rating_5;
      default: return '';
    }
  };

  const display = hoverRating || rating;

  async function handleSubmit() {
    if (rating < 1) return;
    setBusy(true);
    setErr(null);
    try {
      await browser.createReview({
        booking_intent_id: bookingIntentId,
        reviewer_id: reviewerId,
        reviewed_user_id: reviewedUserId,
        rating,
        comment: comment.trim() || null,
      });
      onSuccess(rating);
    } catch (e: any) {
      // RLS may bounce a duplicate review with a generic message — surface
      // a friendlier one. Same for "received_confirmed_at is null".
      const msg = e?.message ?? '';
      if (msg.includes('duplicate') || msg.includes('uniq_reviews_booking_reviewer')) {
        setErr(t.rev_err_already_reviewed);
      } else if (msg.includes('row-level security') || msg.includes('policy')) {
        setErr(t.rev_err_cannot_review_yet);
      } else {
        setErr(msg || t.rev_err_save_failed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
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
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              {t.rev_review_eyebrow}
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {roleLabels.title}
            </h2>
            <p className="text-[13px] text-ink-400 mt-1.5">{roleLabels.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
            aria-label={t.rev_close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Star rating row — large hit targets, hover preview, keyboard
            friendly. Each star is a button so it works without JS in the
            worst case. */}
        <div className="flex flex-col items-center gap-2 my-6 select-none">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= display;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={busy}
                  aria-label={(n > 1 ? t.rev_stars_plural : t.rev_stars_singular).replace('{count}', String(n))}
                  className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300 disabled:opacity-50 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors ${
                      filled ? 'fill-butter-400 text-butter-400' : 'text-ink-200'
                    }`}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>
          <div className="h-5 text-[13px] font-medium text-ink-500">
            {display > 0 ? ratingLabel(display) : t.rev_select_rating}
          </div>
        </div>

        <Textarea
          label={t.rev_comment_label}
          placeholder={roleLabels.placeholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {err && (
          <div className="mt-4 rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500">
            {err}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t.rev_cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={rating < 1 || busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t.rev_submit_review}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
