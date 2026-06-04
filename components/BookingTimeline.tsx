'use client';

import { Check, CircleDashed, Clock } from 'lucide-react';

/**
 * 5-step timeline shown on each booking card. Visualizes the journey
 * from "Réservation confirmée" → "Paiement versé" so both parties always
 * know where they stand.
 *
 * Inspired by parcel-tracking timelines (Vinted, La Poste, Mondial Relay)
 * — horizontal on desktop, vertical-stacked on mobile to fit narrow
 * widths without truncating labels.
 *
 * The current step is highlighted with the lavender accent; completed
 * steps show a check, future steps are dimmed.
 */

export type TimelineStep =
  | 'booked'     // booking is confirmed, waiting for pickup
  | 'picked_up'  // sender handed over, traveler has the parcel
  | 'in_transit' // traveler is on their trip
  | 'delivered'  // traveler handed over to recipient
  | 'paid';      // payment captured and released to traveler

const STEPS: { id: TimelineStep; label: string; shortLabel: string }[] = [
  { id: 'booked',     label: 'Réservation confirmée', shortLabel: 'Réservé' },
  { id: 'picked_up',  label: 'Remise effectuée',       shortLabel: 'Remis' },
  { id: 'in_transit', label: 'En transport',           shortLabel: 'Transport' },
  { id: 'delivered',  label: 'Livré',                  shortLabel: 'Livré' },
  { id: 'paid',       label: 'Paiement versé',         shortLabel: 'Payé' },
];

/**
 * Derive which step is current from booking state. Keeps the timeline
 * stateless — pass the booking flags, it figures out the rest.
 *
 * Order of checks goes from latest to earliest so we always land on
 * the most advanced state.
 */
export function deriveTimelineStep(booking: {
  status: string;
  pickup_confirmed_at?: string | null;
  delivery_proof_url?: string | null;
  received_confirmed_at?: string | null;
  payment_status?: string | null;
  // The trip's departure date — used to know "in transit"
  trip_departure_date?: string | null;
}): TimelineStep {
  if (booking.payment_status === 'captured') return 'paid';
  if (booking.received_confirmed_at) return 'paid';
  if (booking.delivery_proof_url) return 'delivered';

  // If the pickup is confirmed AND the trip date has passed, we're
  // "in transit" or beyond. Before the trip date, "picked up" is the
  // right state.
  if (booking.pickup_confirmed_at) {
    const today = new Date().toISOString().slice(0, 10);
    const dep = booking.trip_departure_date ?? null;
    if (dep && dep <= today) return 'in_transit';
    return 'picked_up';
  }

  return 'booked';
}

export function BookingTimeline({
  current,
  compact = false,
}: {
  current: TimelineStep;
  /**
   * Compact: smaller dots, no labels under them — for embedding inside
   * cards where space is tight. Defaults to full with labels.
   */
  compact?: boolean;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="w-full">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;
          return (
            <div key={step.id} className="flex-1 flex items-center first:flex-none last:flex-none">
              {/* Step dot */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`
                    ${compact ? 'w-6 h-6' : 'w-7 h-7'}
                    rounded-full flex items-center justify-center transition-colors
                    ${isDone
                      ? 'bg-mint-500 text-cream-50'
                      : isCurrent
                        ? 'bg-lavender-500 text-cream-50 ring-4 ring-lavender-500/20'
                        : 'bg-ink-50 text-ink-300'}
                  `}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : (
                    <CircleDashed className="w-3 h-3" strokeWidth={2} />
                  )}
                </div>
                {!compact && (
                  <span
                    className={`
                      text-[10px] font-semibold tracking-wide text-center max-w-[60px] leading-tight
                      ${isDone
                        ? 'text-mint-700'
                        : isCurrent
                          ? 'text-lavender-700'
                          : 'text-ink-300'}
                    `}
                  >
                    {step.shortLabel}
                  </span>
                )}
              </div>

              {/* Connector line (except after last step) */}
              {i < STEPS.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-1 -mt-5 transition-colors
                    ${i < currentIdx ? 'bg-mint-500' : 'bg-ink-100'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reassuring caption shown below the timeline. Same copy as the design
 * brief: payment is held until delivery is confirmed.
 */
export function PaymentSafetyCaption() {
  return (
    <p className="text-[11px] text-ink-400 text-center mt-3 leading-relaxed">
      🔒 Votre paiement est conservé en sécurité jusqu&apos;à la confirmation
      de la livraison.
    </p>
  );
}
