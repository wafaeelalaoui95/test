'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/context';
import { MIN_COMPENSATION_EUR } from '@/lib/constants';

// =============================================================================
// EditListingModal — change a trip or a request nobody has booked yet
// =============================================================================
// Until now a listing could only be posted and then cancelled, so correcting a
// price meant deleting it and starting again — losing the listing's age and
// whatever attention it had gathered.
//
// WHAT IS NOT HERE: the route. Changing where a parcel goes makes it a
// different listing rather than a corrected one, and the city fields need the
// country/city picker from the creation flow, which is a much larger piece.
// Someone whose route was wrong is better served by withdrawing and reposting.
//
// Copy lives in this file rather than lib/i18n/translations.ts, following
// PayoutOnboarding: the flow is self-contained, and that file has broken the
// build three times on French apostrophes.

const COPY = {
  fr: {
    titleTrip: 'Modifier ce voyage',
    titleRequest: 'Modifier cette demande',
    sub: 'Personne ne s’est encore positionné, vous pouvez donc tout ajuster.',
    price: 'Ce que vous demandez',
    budget: 'Ce que vous offrez au voyageur',
    date: 'Date de départ',
    dateWanted: 'Livraison souhaitée avant le',
    arrival: 'Date d’arrivée (facultatif)',
    title: 'Nom de l’objet',
    description: 'Description',
    weight: 'Poids approximatif (kg, facultatif)',
    flight: 'Numéro de vol (facultatif)',
    notes: 'Précisions (facultatif)',
    save: 'Enregistrer',
    cancel: 'Annuler',
    nothing: 'Rien n’a changé.',
    minPrice: `Le minimum est de ${MIN_COMPENSATION_EUR} €.`,
    errors: {
      has_bookings:
        'Quelqu’un s’est positionné entre-temps. Ouvrez la réservation pour en discuter avec lui.',
      not_owner: 'Cette annonce n’est pas la vôtre.',
      not_found: 'Cette annonce n’existe plus.',
      already_cancelled: 'Cette annonce a déjà été retirée.',
      generic: 'La modification n’a pas pu être enregistrée. Réessayez.',
    },
  },
  en: {
    titleTrip: 'Edit this trip',
    titleRequest: 'Edit this request',
    sub: 'Nobody has taken it on yet, so everything is still yours to change.',
    price: 'What you are asking for',
    budget: 'What you are offering the traveller',
    date: 'Departure date',
    dateWanted: 'Deliver before',
    arrival: 'Arrival date (optional)',
    title: 'What it is',
    description: 'Description',
    weight: 'Rough weight (kg, optional)',
    flight: 'Flight number (optional)',
    notes: 'Anything else (optional)',
    save: 'Save',
    cancel: 'Cancel',
    nothing: 'Nothing changed.',
    minPrice: `The minimum is €${MIN_COMPENSATION_EUR}.`,
    errors: {
      has_bookings:
        'Someone took this on while you were editing. Open the booking to talk it over with them.',
      not_owner: 'This listing is not yours.',
      not_found: 'This listing no longer exists.',
      already_cancelled: 'This listing has already been withdrawn.',
      generic: 'The change could not be saved. Please try again.',
    },
  },
} as const;

export type EditableTrip = {
  id: string;
  departure_date: string;
  arrival_date: string | null;
  compensation_min: number;
  available_weight_kg: number | null;
  flight_number: string | null;
  notes: string | null;
};

export type EditableRequest = {
  id: string;
  item_title: string | null;
  item_description: string;
  desired_delivery_date: string;
  budget: number;
  weight_kg: number | null;
};

const field =
  'w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-[14px] text-ink-600 focus:outline-none focus:border-ink-300';
const label = 'block text-[13px] font-medium text-ink-600 mb-1.5';

export function EditListingModal({
  trip,
  request,
  onClose,
  onSaved,
}: {
  trip?: EditableTrip;
  request?: EditableRequest;
  onClose: () => void;
  onSaved: (patch: Record<string, any>) => void;
}) {
  const { locale } = useI18n();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  const isTrip = !!trip;

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Dates arrive as ISO strings; <input type="date"> wants YYYY-MM-DD, which is
  // the first ten characters of one.
  const day = (v: string | null) => (v ? v.slice(0, 10) : '');

  const [price, setPrice] = useState(
    String(trip ? trip.compensation_min : request!.budget)
  );
  const [date, setDate] = useState(
    day(trip ? trip.departure_date : request!.desired_delivery_date)
  );
  const [arrival, setArrival] = useState(day(trip?.arrival_date ?? null));
  const [weight, setWeight] = useState(
    String((trip ? trip.available_weight_kg : request!.weight_kg) ?? '')
  );
  const [flight, setFlight] = useState(trip?.flight_number ?? '');
  const [notes, setNotes] = useState(trip?.notes ?? '');
  const [title, setTitle] = useState(request?.item_title ?? '');
  const [description, setDescription] = useState(request?.item_description ?? '');

  function buildPatch(): Record<string, any> {
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    if (trip) {
      return {
        compensation_min: Number(price),
        departure_date: date,
        arrival_date: arrival || null,
        available_weight_kg: num(weight),
        flight_number: flight.trim() || null,
        notes: notes.trim() || null,
      };
    }
    return {
      budget: Number(price),
      desired_delivery_date: date,
      item_title: title.trim() || null,
      item_description: description.trim(),
      weight_kg: num(weight),
    };
  }

  async function save() {
    const value = Number(price);
    if (!Number.isFinite(value) || value < MIN_COMPENSATION_EUR) {
      setErr(c.minPrice);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const patch = buildPatch();
      const res = await fetch('/api/listing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: isTrip ? 'traveler_trip' : 'shipping_request',
          id: isTrip ? trip!.id : request!.id,
          patch,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const known = (c.errors as Record<string, string>)[data?.error];
        setErr(known ?? c.errors.generic);
        setSaving(false);
        return;
      }
      // Hand the caller the patch so the card updates without a round trip.
      onSaved(patch);
    } catch {
      setErr(c.errors.generic);
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em]">
            {isTrip ? c.titleTrip : c.titleRequest}
          </h3>
          <button
            onClick={onClose}
            aria-label={c.cancel}
            className="text-ink-400 hover:text-ink-600 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
        <p className="text-[13px] text-ink-400 leading-relaxed mb-5">{c.sub}</p>

        <div className="space-y-4">
          {!isTrip && (
            <>
              <label className="block">
                <span className={label}>{c.title}</span>
                <input
                  className={field}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>{c.description}</span>
                <textarea
                  className={`${field} min-h-[80px] resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="block">
            <span className={label}>{isTrip ? c.price : c.budget}</span>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_COMPENSATION_EUR}
              className={field}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>

          <label className="block">
            <span className={label}>{isTrip ? c.date : c.dateWanted}</span>
            <input
              type="date"
              className={field}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          {isTrip && (
            <>
              <label className="block">
                <span className={label}>{c.arrival}</span>
                <input
                  type="date"
                  className={field}
                  value={arrival}
                  onChange={(e) => setArrival(e.target.value)}
                />
              </label>
              <label className="block">
                <span className={label}>{c.flight}</span>
                <input
                  className={field}
                  value={flight}
                  onChange={(e) => setFlight(e.target.value)}
                />
              </label>
            </>
          )}

          <label className="block">
            <span className={label}>{c.weight}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              className={field}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>

          {isTrip && (
            <label className="block">
              <span className={label}>{c.notes}</span>
              <textarea
                className={`${field} min-h-[70px] resize-y`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          )}
        </div>

        {err && (
          <p className="mt-4 text-[13px] text-blush-500 leading-relaxed">{err}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-ink-100 py-2.5 text-[14px] font-medium text-ink-500"
          >
            {c.cancel}
          </button>
          <Button onClick={save} disabled={saving} size="sm" fullWidth>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {c.save}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
