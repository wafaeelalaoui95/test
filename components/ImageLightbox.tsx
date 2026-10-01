'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Exchange a stored photo URL for a short-lived signed one.
 *
 * Every reader of a parcel photo or a delivery proof goes through here, which
 * is what lets the buckets become private without touching a single call site:
 * the components below all take the same `url` prop they always did.
 *
 * There is deliberately NO fallback to the raw URL. Falling back would mean a
 * refusal — someone asking for a delivery proof from a booking that is not
 * theirs — silently succeeding for as long as the bucket stayed public, which
 * is the precise failure this exists to end. A photo that cannot be signed does
 * not appear.
 */
export function useSignedUrl(url: string | null, enabled = true): string | null {
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !enabled) {
      setSigned(null);
      return;
    }
    let cancelled = false;
    setSigned(null);
    fetch('/api/media/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setSigned(d?.url ?? null);
      })
      .catch(() => {
        if (!cancelled) setSigned(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return signed;
}

/**
 * In-page image viewer. Shows the image centred and contained (never bigger
 * than the viewport) over a dimmed backdrop — instead of opening the raw file
 * in a new browser tab. Click the backdrop or the X to close.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  // Only while it is open: a page listing a dozen proofs should not sign a
  // dozen files nobody has asked to look at.
  const viewable = useSignedUrl(src, open);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white shadow-lg text-ink-600 flex items-center justify-center hover:bg-ink-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {viewable ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={viewable}
                alt={alt ?? ''}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-[70vw] max-w-[420px] h-[40vh] rounded-2xl bg-ink-500/40 animate-pulse" />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A text button that opens an image in the in-page lightbox. Drop-in
 * replacement for the old `<a href={url} target="_blank">` proof links.
 */
export function ViewProofButton({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'flex-shrink-0 text-[12px] font-medium text-ink-400 hover:text-ink-600 underline transition-colors'
        }
      >
        {label}
      </button>
      <ImageLightbox src={url} alt={label} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * A clickable image thumbnail that enlarges into the lightbox on tap. Used to
 * show the delivery-proof photo inline while keeping the full view in-page.
 */
export function ProofThumbnail({
  url,
  alt,
  className,
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Signed straight away, unlike the lightbox: this one is on screen.
  const viewable = useSignedUrl(url);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in"
        aria-label={alt}
      >
        {viewable ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={viewable} alt={alt ?? ''} className={className} />
        ) : (
          <div className={`${className ?? ''} bg-ink-50 animate-pulse`} />
        )}
      </button>
      <ImageLightbox src={url} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
