'use client';

import { PARCEL_SIZES, MAX_DECLARED_VALUE_EUR } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import type { AvailableSpace } from '@/lib/types';

// =============================================================================
// ParcelSizeValue — how big it is and what it is worth
// =============================================================================
// One component rather than the same twenty lines in both send flows, because
// the two flows have drifted apart before and these particular fields are ones
// the Marketplace Terms now describe: a sender who is asked for a weight in the
// wizard and not in instant-book is a sender the Terms are wrong about half the
// time.
//
// The size options are the traveller's capacities, not a free number. A sender
// typing "2" into a weight box is describing a parcel nobody on the platform
// can carry, and the useful moment to say so is before they publish rather than
// after nobody answers.

export function ParcelSizeValue({
  size,
  onSize,
  value,
  onValue,
}: {
  size: AvailableSpace | null;
  onSize: (s: AvailableSpace) => void;
  /** Whole euros, or '' while the field is empty. */
  value: string;
  onValue: (v: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
          {t.send_size_label}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PARCEL_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onSize(s.value)}
              className={`rounded-2xl border px-3 py-3 text-center transition-colors ${
                size === s.value
                  ? 'bg-white border-ink-300'
                  : 'bg-white/60 border-ink-100 hover:border-ink-200'
              }`}
            >
              <div className="text-[20px] leading-none mb-1.5">{s.icon}</div>
              <div className="text-[13px] font-semibold text-ink-600">
                {t[s.labelKey] as string}
              </div>
              <div className="text-[11px] text-ink-400 mt-0.5">
                {t[s.sizeKey] as string}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">{t.send_size_hint}</p>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-ink-500 mb-2.5">
          {t.send_value_label}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-400">
            €
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DECLARED_VALUE_EUR}
            value={value}
            placeholder={t.send_value_ph}
            onChange={(e) => {
              // Digits only, and never above the cap — but the cap is NOT
              // stated anywhere on screen, deliberately. Naming a maximum next
              // to a value field anchors people to it: told the limit is €500,
              // a steady share of senders decide their parcel is worth exactly
              // €500. The field simply stops climbing, which teaches the same
              // rule to the few people it affects and suggests nothing to
              // everyone else. Do not "helpfully" add it back to the hint.
              const digits = e.target.value.replace(/[^0-9]/g, '');
              if (!digits) return onValue('');
              const n = Math.min(Number(digits), MAX_DECLARED_VALUE_EUR);
              onValue(String(n));
            }}
            className="w-full rounded-2xl border border-ink-100 bg-white ps-9 pe-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-lavender-500/30"
          />
        </div>
        <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">{t.send_value_hint}</p>
      </div>
    </div>
  );
}
