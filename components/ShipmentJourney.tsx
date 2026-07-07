'use client';

import { Check, Package, Plane, Flag, KeyRound, Users, Eye } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import type { Translations } from '@/lib/i18n/translations';

type Role = 'sender' | 'traveler';

type JourneyBooking = {
  pickup_confirmed_at?: string | null;
  delivery_proof_url?: string | null;
  received_confirmed_at?: string | null;
};

/**
 * Vertical progress "parcours" shown on each shipment card, role-aware.
 * Steps: accepted → handed over → trip → delivered. The step the user is
 * currently on carries reminders tailored to sender vs traveler; steps not
 * yet reached are greyed. State is derived purely from the booking's
 * lifecycle timestamps, so it always reflects reality.
 */
export function ShipmentJourney({
  booking,
  role,
  otherFirstName,
  departureDate,
  t,
}: {
  booking: JourneyBooking;
  role: Role;
  otherFirstName: string;
  departureDate?: string | null;
  t: Translations;
}) {
  const picked = !!booking.pickup_confirmed_at;
  const arrived = !!booking.delivery_proof_url;
  const received = !!booking.received_confirmed_at;
  // Step 0 (accepted) is always done on a card that shows the journey.
  const done = [true, picked, arrived, received];
  const activeIndex = done.indexOf(false); // -1 once everything is done

  const dateStr = departureDate ? formatShortDate(departureDate) : '';
  const name = otherFirstName;

  type Rem = { icon: typeof KeyRound; text: string };
  const steps: {
    icon: typeof Package;
    title: string;
    sub?: string;
    reminders: Rem[];
  }[] = [
    {
      icon: Check,
      title: t.sj_accepted,
      sub:
        role === 'sender'
          ? t.sj_accepted_sub_sender.replace('{name}', name)
          : t.sj_accepted_sub_traveler.replace('{name}', name),
      reminders: [],
    },
    {
      icon: Package,
      title: t.sj_pickup,
      sub: role === 'sender' ? t.sj_pickup_done_sender : t.sj_pickup_done_traveler,
      reminders:
        role === 'sender'
          ? [
              { icon: KeyRound, text: t.sj_pickup_rem_sender_code },
              { icon: Users, text: t.sj_pickup_rem_sender_thirdparty },
            ]
          : [{ icon: Eye, text: t.sj_pickup_rem_traveler }],
    },
    {
      icon: Plane,
      title: t.sj_voyage,
      sub: t.sj_voyage_sub.replace('{date}', dateStr),
      reminders: [],
    },
    {
      icon: Flag,
      title: t.sj_delivered,
      sub: t.sj_delivered_done,
      reminders:
        role === 'sender'
          ? [{ icon: KeyRound, text: t.sj_delivered_hint_sender }]
          : [{ icon: KeyRound, text: t.sj_delivered_hint_traveler }],
    },
  ];

  return (
    <div className="mt-1">
      {steps.map((s, i) => {
        const state = done[i] ? 'done' : i === activeIndex ? 'active' : 'upcoming';
        const isLast = i === steps.length - 1;
        const Icon = state === 'done' ? Check : s.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center self-stretch">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state === 'done'
                    ? 'bg-mint-500 text-white'
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
                    done[i] ? 'bg-mint-500' : 'bg-ink-100'
                  }`}
                />
              )}
            </div>

            <div className="pb-4 flex-1 min-w-0">
              <div
                className={`text-[14px] font-semibold ${
                  state === 'upcoming' ? 'text-ink-300' : 'text-ink-600'
                }`}
              >
                {s.title}
                {state === 'active' && (
                  <span className="text-[11px] font-medium text-lavender-600"> · {t.sj_now}</span>
                )}
              </div>

              {state === 'active' && s.reminders.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {s.reminders.map((r, j) => {
                    const RIcon = r.icon;
                    return (
                      <div
                        key={j}
                        className="flex gap-2 items-start bg-lavender-50 border border-lavender-200 rounded-xl px-2.5 py-2 text-[12.5px] text-lavender-700 leading-snug"
                      >
                        <RIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{r.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : s.sub ? (
                <div
                  className={`text-[12px] mt-0.5 ${
                    state === 'upcoming' ? 'text-ink-300' : 'text-ink-400'
                  }`}
                >
                  {s.sub}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
