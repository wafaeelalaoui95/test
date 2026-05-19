'use client';

import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, i) => {
          const isDone = i < current;
          const isActive = i === current;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2.5 relative">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-[13px] transition-colors ${
                    isDone
                      ? 'bg-ink-500 text-cream-50'
                      : isActive
                      ? 'bg-ink-500 text-cream-50'
                      : 'bg-white border border-ink-100 text-ink-300'
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
                </div>
                <span
                  className={`hidden sm:block text-[12px] font-medium whitespace-nowrap ${
                    isActive ? 'text-ink-600' : 'text-ink-300'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-ink-100 mx-3 relative -top-3 sm:-top-3.5">
                  <div
                    className="h-full bg-ink-500 transition-all duration-300"
                    style={{ width: isDone ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
