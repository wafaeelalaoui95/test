'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState(prefilledReceiverName ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelected(file: File) {
    setErr(null);
    if (file.size > 8 * 1024 * 1024) {
      setErr('Photo trop volumineuse (max 8 Mo).');
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!photo) {
      setErr('Ajoutez une photo de la remise');
      return;
    }
    if (!receiverName.trim()) {
      setErr('Indiquez le nom de la personne qui a reçu le colis');
      return;
    }

    setSubmitting(true);
    setErr(null);

    const form = new FormData();
    form.append('bookingIntentId', bookingIntentId);
    form.append('receiverName', receiverName.trim());
    form.append('notes', notes.trim());
    form.append('photo', photo);

    try {
      const res = await fetch('/api/delivery/upload-proof', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Échec du téléversement');
      onSuccess(data.url);
    } catch (e: any) {
      setErr(e?.message ?? 'Une erreur est survenue');
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
              Preuve de livraison
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              J&apos;ai livré le colis
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
          Une photo + le nom de la personne suffisent. C&apos;est votre garantie en cas de problème.
        </p>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
            Photo de la remise
          </label>
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Aperçu"
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
                aria-label="Supprimer la photo"
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
              <span className="text-[14px] font-medium">Prendre / choisir une photo</span>
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
            Nom de la personne qui a reçu
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Ex: Mohammed (le père)"
            className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300"
          />
          <p className="text-[11px] text-ink-300 mt-1.5">
            Ce nom sera comparé avec celui fourni par l&apos;expéditeur.
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            Note (optionnel)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Remis à l'aéroport de Casablanca"
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
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !photo || !receiverName.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {submitting ? 'Téléversement…' : 'Confirmer la livraison'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
