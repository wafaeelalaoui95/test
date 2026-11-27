'use client';

import type { ReactNode } from 'react';
import { Check, Package, Plane, Flag } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import { intlLocale, type Translations } from '@/lib/i18n/translations';
import { useI18n } from '@/lib/i18n/context';

type Role = 'sender' | 'traveler';

type JourneyBooking = {
  pickup_confirmed_at?: string | null;
  delivery_proof_url?: string | null;
  received_confirmed_at?: string | null;
};

/**
 * Vertical progress "parcours" shown on each shipment card, role-aware.
 * Steps: accepted → handed over → trip → delivered. State is derived purely
 * from the booking's lifecycle timestamps, so it always reflects reality.
 *
 * Past steps are greyed (a filled grey check), so the eye goes to the purple
 * current step. Kept deliberately quiet: it says WHERE the shipment is, not what to do. The
 * one thing to do right now lives in the card's action block (enter the code,
 * show the code…), so the timeline never repeats it. Steps not reached yet show
 * their title only — the trip step keeps its date, the one useful fact there.
 */
export function ShipmentJourney({
  booking,
  role,
  otherFirstName,
  departureDate,
  activeContent,
  t,
}: {
  booking: JourneyBooking;
  role: Role;
  otherFirstName: string;
  departureDate?: string | null;
  /** The action for the current step (e.g. "enter the code"), shown right
   *  under it so what to do sits where the shipment is. */
  activeContent?: ReactNode;
  t: Translations;
}) {
  const picked = !!booking.pickup_confirmed_at;
  const arrived = !!booking.delivery_proof_url;
  const received = !!booking.received_confirmed_at;
  // Step 0 (accepted) is always done on a card that shows the journey.
  const done = [true, picked, arrived, received];
  const activeIndex = done.indexOf(false); // -1 once everything is done

  const dateStr = departureDate ? formatShortDate(departureDate) : '';
  const { locale } = useI18n();
  // "28 novembre" / "28 November" — written out in the trip sentence.
  const longDate = departureDate
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ? `${departureDate}T12:00:00` : departureDate)
        .toLocaleDateString(intlLocale(locale), { day: 'numeric', month: 'long' })
    : '';
  // While the trip is the current step, it says who carries the parcel and
  // when, in place of the generic "à faire" (and of the "Départ le…" line).
  const tripNow = longDate
    ? (role === 'sender' ? t.sj_voyage_now_sender : t.sj_voyage_now_traveler)
        .replace('{name}', otherFirstName)
        .replace('{date}', longDate)
    : '';
  const name = otherFirstName;

  const TRIP = 2;
  const steps: { icon: typeof Package; title: string; sub?: string }[] = [
    {
      icon: Check,
      title: t.sj_accepted,
      sub:
        role === 'sender'
          ? t.sj_accepted_sub_sender.replace('{name}', name)
          : t.sj_accepted_sub_traveler.replace('{name}', name),
    },
    {
      icon: Package,
      title: t.sj_pickup,
      sub: role === 'sender' ? t.sj_pickup_done_sender : t.sj_pickup_done_traveler,
    },
    {
      icon: Plane,
      title: t.sj_voyage,
      sub: dateStr ? t.sj_voyage_sub.replace('{date}', dateStr) : undefined,
    },
    {
      icon: Flag,
      title: t.sj_delivered,
      sub: t.sj_delivered_done,
    },
  ];

  return (
    <div className="mt-1">
      {steps.map((s, i) => {
        const state = done[i] ? 'done' : i === activeIndex ? 'active' : 'upcoming';
        const isLast = i === steps.length - 1;
        const Icon = state === 'done' ? Check : s.icon;
        // Past steps say what happened; the trip always shows its date.
        const tripActive = i === TRIP && state === 'active' && !!tripNow;
        const showSub = !!s.sub && (state === 'done' || (i === TRIP && !tripActive));
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center self-stretch">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state === 'done'
                    ? 'bg-ink-100 text-ink-400'
                    : state === 'active'
                      ? 'bg-lavender-500 text-white'
                      : 'bg-white border-2 border-ink-100 text-ink-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 rounded-full min-h-[14px] ${
                    done[i] ? 'bg-ink-200' : 'bg-ink-100'
                  }`}
                />
              )}
            </div>

            <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-3'}`}>
              <div
                className={`text-[14px] font-semibold ${
                  state === 'active' ? 'text-ink-600' : state === 'done' ? 'text-ink-400' : 'text-ink-300'
                }`}
              >
                {s.title}
                {state === 'active' && (
                  <span className={`font-medium text-lavender-600 ${tripActive ? 'text-[13px]' : 'text-[11px]'}`}> · {tripActive ? tripNow : t.sj_now}</span>
                )}
              </div>
              {state === 'active' && activeContent && <div className="mt-2">{activeContent}</div>}
              {showSub && (
                <div
                  className={`text-[12px] mt-0.5 ${
                    state === 'active' ? 'text-ink-400' : 'text-ink-300'
                  }`}
                >
                  {s.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
