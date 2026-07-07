'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

// Downscale + re-encode large photos in the browser before upload. Phone
// photos are routinely 3–12 MB, above the serverless request-body limit,
// which made uploads fail with a cryptic "not valid JSON" error (the platform
// returns a plain-text 413). We cap the longest edge and re-encode to JPEG.
// HEIC/unknown types (which browsers can't draw to a canvas) are left as-is
// and handled by the size guard + friendly error message.
async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('read failed'));
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('decode failed'));
      i.src = dataUrl;
    });
    const MAX_EDGE = 1600;
    const longest = Math.max(img.width, img.height);
    if (longest <= MAX_EDGE && file.size < 1_500_000) return file; // already small
    const scale = Math.min(1, MAX_EDGE / longest);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file; // fall back to the original; the size guard/error handles it
  }
}

type Props = {
  bookingIntentId: string;
  prefilledReceiverName?: string;
  onSuccess: (photoUrl: string) => void;
  onClose: () => void;
};

export function DeliveryProofModal({
  bookingIntentId,
  prefilledReceiverName,
  onSuccess,
  onClose,
}: Props) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState(prefilledReceiverName ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelected(file: File) {
    setErr(null);
    // Sanity ceiling only — most photos are re-compressed before upload, so we
    // allow large originals here and shrink them at submit time.
    if (file.size > 25 * 1024 * 1024) {
      setErr(t.pickup_proof_err_photo_too_large);
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!photo) {
      setErr(t.pickup_proof_err_no_photo);
      return;
    }
    if (!receiverName.trim()) {
      setErr(t.pickup_proof_err_no_name);
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const toUpload = await compressImage(photo);

      const form = new FormData();
      form.append('bookingIntentId', bookingIntentId);
      form.append('receiverName', receiverName.trim());
      form.append('notes', notes.trim());
      form.append('photo', toUpload);

      const res = await fetch('/api/delivery/upload-proof', {
        method: 'POST',
        body: form,
      });

      // The platform rejects oversized bodies with a plain-text 413 (not
      // JSON) before our route runs — surface a clear "image too large"
      // message instead of a JSON parse error.
      if (res.status === 413) {
        throw new Error(t.pickup_proof_err_photo_too_large);
      }

      // Read as text first so a non-JSON error body can't crash JSON.parse.
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        /* non-JSON response (e.g. a server/proxy error page) */
      }

      if (!res.ok) {
        const serverErr = typeof data?.error === 'string' ? data.error : '';
        if (/too large|volumineuse|entity too large/i.test(serverErr)) {
          throw new Error(t.pickup_proof_err_photo_too_large);
        }
        throw new Error(t.pickup_proof_err_upload_failed);
      }

      onSuccess(data.url);
    } catch (e: any) {
      setErr(e?.message ?? t.pickup_proof_err_generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              {t.pickup_proof_eyebrow}
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {t.pickup_proof_title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[14px] text-ink-500 leading-relaxed mb-5">
          {t.pickup_proof_intro}
        </p>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
            {t.pickup_proof_photo_label}
          </label>
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt={t.pickup_proof_preview_alt}
                className="w-full h-56 object-cover rounded-2xl border border-ink-100"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhotoPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={submitting}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink-600/70 text-white flex items-center justify-center hover:bg-ink-600 disabled:opacity-50"
                aria-label={t.pickup_proof_remove_photo}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-ink-200 hover:border-lavender-300 hover:bg-lavender-50/30 transition-colors flex flex-col items-center justify-center gap-2 text-ink-400 hover:text-lavender-700"
            >
              <Camera className="w-7 h-7" />
              <span className="text-[14px] font-medium">{t.pickup_proof_photo_cta}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoSelected(file);
            }}
          />
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            {t.pickup_proof_receiver_label}
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder={t.pickup_proof_receiver_placeholder}
            className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300"
          />
          <p className="text-[11px] text-ink-300 mt-1.5">
            {t.pickup_proof_receiver_hint}
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            {t.pickup_proof_note_label}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.pickup_proof_note_placeholder}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
          />
        </div>

        {err && (
          <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            {t.pickup_proof_cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !photo || !receiverName.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {submitting ? t.pickup_proof_submitting : t.pickup_proof_submit}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
