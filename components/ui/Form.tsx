'use client';

import { forwardRef, type InputHTMLAttributes, type MouseEvent, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Field types whose value comes from a browser picker rather than typing. */
const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week']);

/**
 * Open the native picker when the field is clicked.
 *
 * Safari opens a date picker wherever you tap the field. Chrome does not: it
 * opens only from the small calendar glyph at the right-hand edge, and a click
 * anywhere else just parks a caret between the day and the month. On a
 * transparent, borderless field that glyph is close to invisible, so travelers
 * kept reporting that the calendar "doesn't work in Chrome" — and it genuinely
 * didn't, for any click they would think to make. Switching to Safari fixed it
 * instantly, which is exactly what they told us.
 *
 * showPicker() is the standard way to ask for it, and it is a no-op when the
 * picker is already open, so clicking the glyph itself still behaves. It
 * throws rather than returns on an unsupported browser or outside a user
 * gesture; either way the native glyph remains, so swallowing it degrades to
 * the behaviour we have today instead of breaking the field.
 */
export function openPickerOnClick(e: MouseEvent<HTMLInputElement>): void {
  try {
    e.currentTarget.showPicker();
  } catch {
    /* older browser, or no user activation — the native glyph still works */
  }
}

const baseField =
  'w-full rounded-xl border border-ink-100 bg-white px-4 py-3 text-[15px] text-ink-600 placeholder:text-ink-300 transition-colors focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, id, onClick, ...props }, ref) => {
    const inputId = id || props.name;
    const usesPicker =
      typeof props.type === 'string' && PICKER_TYPES.has(props.type);
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-ink-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          onClick={(e) => {
            if (usesPicker) openPickerOnClick(e);
            onClick?.(e);
          }}
          className={cn(baseField, error && 'border-blush-400 focus:border-blush-500 focus:ring-blush-100', className)}
          {...props}
        />
        {hint && !error && <p className="text-[13px] text-ink-400">{hint}</p>}
        {error && <p className="text-[13px] text-blush-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={textareaId} className="block text-[13px] font-medium text-ink-500">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(baseField, 'min-h-[120px] resize-y leading-relaxed', error && 'border-blush-400 focus:border-blush-500 focus:ring-blush-100', className)}
          {...props}
        />
        {hint && !error && <p className="text-[13px] text-ink-400">{hint}</p>}
        {error && <p className="text-[13px] text-blush-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, className, children, id, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={selectId} className="block text-[13px] font-medium text-ink-500">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(baseField, 'appearance-none bg-no-repeat pr-10', error && 'border-blush-400', className)}
          style={{
            backgroundImage:
              'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3e%3cpath d=\'M1 1l5 5 5-5\' stroke=\'%238B8074\' stroke-width=\'1.75\' fill=\'none\' stroke-linecap=\'round\'/%3e%3c/svg%3e")',
            backgroundPosition: 'right 1rem center',
          }}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="text-[13px] text-ink-400">{hint}</p>}
        {error && <p className="text-[13px] text-blush-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const cbId = id || props.name;
    return (
      <label
        htmlFor={cbId}
        className={cn(
          'flex items-start gap-3 cursor-pointer',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          id={cbId}
          className="mt-0.5 h-4 w-4 rounded border-ink-200 text-ink-500 focus:ring-ink-200 cursor-pointer accent-ink-500"
          {...props}
        />
        <span className="text-[14px] text-ink-500 leading-relaxed">{label}</span>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
