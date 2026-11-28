'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

// =============================================================================
// DateField — our own calendar instead of the browser's
// =============================================================================
// iOS Safari's native date picker ignores `min` completely: every past day
// looks pickable, and snapping the value back afterwards still lets people
// tap yesterday. This calendar simply does not offer a day before `min`.
//
// On a phone it opens as a bottom sheet; on a wider screen it drops under the
// field. Both are portalled to <body>, so a modal's overflow or transform can
// never clip or misplace it.

type Props = {
  value: string; // YYYY-MM-DD or ''
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  label?: string; // rendered like <Input label>
  className?: string; // styles the trigger, so it can look like the field it replaces
  ariaLabel?: string;
};

const PANEL_W = 320;

function parse(v: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? { y: +m[1], m: +m[2] - 1, d: +m[3] } : null;
}
function iso(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m + 1)}-${p(d)}`;
}
function intlLocale(locale: string) {
  return locale === 'en' ? 'en-GB' : locale;
}

export function DateField({ value, onChange, min, label, className, ariaLabel }: Props) {
  const { t, locale } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const start = parse(value) ?? parse(min ?? '') ?? (() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  })();
  const [view, setView] = useState({ y: start.y, m: start.m });

  // A floor set after the value (e.g. a return date when the outbound moves
  // past it) clears the value instead of leaving an impossible date behind.
  useEffect(() => {
    if (value && min && value < min) onChange('');
  }, [value, min, onChange]);

  function openPanel() {
    const s = parse(value) ?? parse(min ?? '');
    if (s) setView({ y: s.y, m: s.m });
    const r = triggerRef.current?.getBoundingClientRect();
    if (r && window.innerWidth >= 640) {
      const left = Math.min(Math.max(r.left, 8), window.innerWidth - PANEL_W - 8);
      setPos({ top: r.bottom + 8, left });
    } else {
      setPos(null);
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    // The dropdown is fixed to where the field was; once the page moves it
    // would float away from it, so it closes instead.
    const onMove = () => pos && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, pos]);

  const fmtLocale = intlLocale(locale);
  const display = useMemo(() => {
    const p = parse(value);
    if (!p) return '';
    return new Intl.DateTimeFormat(fmtLocale, { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(p.y, p.m, p.d));
  }, [value, fmtLocale]);

  const monthTitle = new Intl.DateTimeFormat(fmtLocale, { month: 'long', year: 'numeric' })
    .format(new Date(view.y, view.m, 1));
  // Weeks start on Monday: 2024-01-01 was a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(fmtLocale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i))
  );

  const firstDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const minP = parse(min ?? '');
  const canGoBack = !minP || view.y > minP.y || (view.y === minP.y && view.m > minP.m);
  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const today = (() => {
    const n = new Date();
    return iso(n.getFullYear(), n.getMonth(), n.getDate());
  })();

  const panel = (
    <div className="fixed inset-0 z-[200]" onClick={() => setOpen(false)}>
      {/* Dimmed backdrop on a phone only */}
      <div className={cn('absolute inset-0', !pos && 'bg-ink-600/30')} />
      <div
        role="dialog"
        aria-label={label || ariaLabel}
        onClick={(e) => e.stopPropagation()}
        style={pos ? { top: pos.top, left: pos.left, width: PANEL_W } : undefined}
        className={cn(
          'absolute bg-white shadow-xl border border-ink-50 p-4',
          pos
            ? 'rounded-2xl'
            : 'inset-x-0 bottom-0 rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[15px] font-semibold text-ink-600 first-letter:uppercase">{monthTitle}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={!canGoBack}
              aria-label={t.date_prev_month}
              className="p-2 rounded-full hover:bg-cream-100 text-ink-500 disabled:text-ink-200 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={t.date_next_month}
              className="p-2 rounded-full hover:bg-cream-100 text-ink-500"
            >
              <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-ink-300 uppercase mb-1">
          {weekdays.map((w, i) => (
            <span key={i} className="py-1">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {cells.map((d, i) => {
            if (d == null) return <span key={i} />;
            const v = iso(view.y, view.m, d);
            const disabled = !!min && v < min;
            const selected = v === value;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(v);
                  setOpen(false);
                }}
                className={cn(
                  'mx-auto w-10 h-10 rounded-full text-[15px] num-display transition-colors',
                  disabled && 'text-ink-200 line-through cursor-not-allowed',
                  !disabled && !selected && 'text-ink-600 hover:bg-cream-100',
                  !disabled && !selected && v === today && 'font-bold',
                  selected && 'bg-ink-500 text-cream-50 font-semibold'
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={openPanel}
      aria-label={ariaLabel || label}
      aria-haspopup="dialog"
      className={cn('text-start', className, !display && 'text-ink-300')}
    >
      {display || t.date_pick}
    </button>
  );

  return (
    <>
      {label ? (
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-ink-500">{label}</span>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      {open && typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}
