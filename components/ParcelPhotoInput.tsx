'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

// =============================================================================
// ParcelPhotoInput — optional photo of the parcel, shown to the traveller
// =============================================================================
// A traveller decides whether to carry a stranger's parcel from a category and
// a line of text. A photo answers the question our own safety rules keep
// asking them to judge — is this what it says it is — before they agree to
// anything.
//
// Optional, and said so plainly. Requiring it would turn away the honest
// sender posting a document with nowhere well-lit to photograph it, and it
// would not stop anyone determined to mislead: a photo can be of something
// else. It is a signal, not proof, and the copy should not imply otherwise.
//
// Uploads on selection rather than on submit, so the sender learns straight
// away that their 12 MB photo was refused instead of at the end of a form.

const COPY = {
  fr: {
    label: 'Photo du colis',
    optional: 'facultatif',
    hint: 'Le voyageur pourra la voir avant d’accepter. Beaucoup préfèrent savoir ce qu’ils transportent.',
    add: 'Ajouter une photo',
    change: 'Changer',
    remove: 'Retirer',
    uploading: 'Envoi…',
    errors: {
      too_large: 'Photo trop lourde. Le maximum est de 8 Mo.',
      bad_format: 'Format non pris en charge. Utilisez JPG, PNG ou HEIC.',
      generic: 'L’envoi a échoué. Réessayez.',
    },
  },
  en: {
    label: 'Photo of the parcel',
    optional: 'optional',
    hint: 'The traveller can look at it before accepting. Many prefer to know what they are carrying.',
    add: 'Add a photo',
    change: 'Change',
    remove: 'Remove',
    uploading: 'Uploading…',
    errors: {
      too_large: 'That photo is too large. The maximum is 8 MB.',
      bad_format: 'Unsupported format. Use JPG, PNG or HEIC.',
      generic: 'The upload failed. Please try again.',
    },
  },
} as const;

export function ParcelPhotoInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { locale } = useI18n();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await fetch('/api/parcel/photo', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        const known = (c.errors as Record<string, string>)[data?.error];
        setErr(known ?? c.errors.generic);
        return;
      }
      onChange(data.url);
    } catch {
      setErr(c.errors.generic);
    } finally {
      setBusy(false);
      // Let the same file be picked again after a removal.
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[13px] font-medium text-ink-600">{c.label}</span>
        <span className="text-[12px] text-ink-300">{c.optional}</span>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
      />

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="w-16 h-16 rounded-xl object-cover border border-ink-100"
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="text-[13px] text-ink-600 underline underline-offset-2"
          >
            {c.change}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[13px] text-ink-400 underline underline-offset-2 inline-flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            {c.remove}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-ink-200 px-4 py-3 text-[14px] text-ink-500 hover:border-ink-300 transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          {busy ? c.uploading : c.add}
        </button>
      )}

      <p className="mt-1.5 text-[12px] text-ink-400 leading-relaxed">{c.hint}</p>
      {err && <p className="mt-1.5 text-[12px] text-blush-500">{err}</p>}
    </div>
  );
}
