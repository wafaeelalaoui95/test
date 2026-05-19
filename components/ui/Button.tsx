'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-ink-500 text-cream-50 hover:bg-ink-600 active:bg-ink-600',
  secondary:
    'bg-lavender-500 text-white hover:bg-lavender-600 active:bg-lavender-700',
  ghost:
    'bg-transparent text-ink-500 hover:bg-ink-50',
  outline:
    'bg-transparent text-ink-500 border border-ink-200 hover:border-ink-400 hover:bg-ink-50',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-[14px] rounded-full',
  md: 'h-11 px-5 text-[15px] rounded-full',
  lg: 'h-12 px-6 text-base rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 focus-visible:ring-ink-400',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
