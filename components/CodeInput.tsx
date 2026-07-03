'use client';

import { useEffect, useRef, useState, useCallback, KeyboardEvent, ClipboardEvent } from 'react';

/**
 * Confirmation code input, OTP style (default 4 digits).
 *
 * Behaviour modelled after iOS / Stripe OTP inputs:
 *   - one single-character box per digit
 *   - Auto-focus advance on input, backspace goes to previous box
 *   - Paste handler: pasting the full code fills all boxes at once
 *   - Numeric keyboard hint on mobile (inputMode + pattern)
 *   - autocomplete="one-time-code" so iOS Mail / SMS suggestions work
 *
 * Calls `onComplete(code)` when all digits are filled. `onChange` is called
 * on every keystroke with the current partial value, useful for disabling
 * the submit button until complete.
 *
 * Error state highlights all boxes in blush — used after a wrong code
 * attempt. Clear it by the parent when the user starts typing again.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
  disabled = false,
  length = 4,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState<number | null>(autoFocus ? 0 : null);
  const last = length - 1;

  // Split the controlled `value` into single-char positions. We don't hold
  // per-cell state — the parent's `value` is the source of truth.
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    // Fire onComplete exactly once when the value reaches `length` digits.
    if (value.length === length && new RegExp(`^\\d{${length}}$`).test(value) && onComplete) {
      onComplete(value);
    }
  }, [value, onComplete, length]);

  const setDigit = useCallback(
    (idx: number, digit: string) => {
      // Strip non-digits, take the LAST character if multiple were typed
      // (handles autocomplete spitting a whole code into one cell).
      const clean = digit.replace(/\D/g, '');
      if (!clean) {
        // Backspace path — clear this cell
        const next = (value.padEnd(length, ' ').slice(0, idx) + ' ' + value.padEnd(length, ' ').slice(idx + 1)).trimEnd();
        onChange(next);
        return;
      }

      // Multi-char paste-like: distribute across cells starting from idx
      if (clean.length > 1) {
        const chars = clean.slice(0, length - idx).split('');
        const padded = value.padEnd(length, ' ').split('');
        chars.forEach((c, i) => { padded[idx + i] = c; });
        const next = padded.join('').trimEnd();
        onChange(next);
        // Focus the cell after the last one filled
        const lastIdx = Math.min(idx + chars.length, last);
        refs.current[lastIdx]?.focus();
        return;
      }

      // Single char path — set and advance
      const padded = value.padEnd(length, ' ').split('');
      padded[idx] = clean;
      const next = padded.join('').trimEnd();
      onChange(next);
      if (idx < last) refs.current[idx + 1]?.focus();
    },
    [value, onChange, length, last]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      // If the current cell is empty, move focus back and clear there.
      const padded = value.padEnd(length, ' ');
      if (padded[idx] === ' ' && idx > 0) {
        e.preventDefault();
        refs.current[idx - 1]?.focus();
        setDigit(idx - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < last) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, idx: number) => {
    const text = e.clipboardData.getData('text');
    const digitsOnly = text.replace(/\D/g, '').slice(0, length);
    if (digitsOnly.length === 0) return;
    e.preventDefault();
    setDigit(idx, digitsOnly);
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, i) => i).map((i) => {
        const char = digits[i] === ' ' ? '' : digits[i];
        const isFilled = char.length > 0;
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            disabled={disabled}
            value={char}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e, i)}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(null)}
            // Bigger touch target on mobile, tighter on desktop — feels
            // like the iOS OTP UI.
            className={`
              w-11 h-14 sm:w-12 sm:h-14
              text-center text-[22px] font-bold text-ink-600 num-display
              rounded-xl border-2 transition-all
              ${error
                ? 'border-blush-400 bg-blush-50/40 text-blush-600'
                : focused === i
                  ? 'border-lavender-500 bg-white ring-4 ring-lavender-500/15'
                  : isFilled
                    ? 'border-ink-200 bg-cream-50'
                    : 'border-ink-100 bg-white'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              focus:outline-none
            `}
          />
        );
      })}
    </div>
  );
}
