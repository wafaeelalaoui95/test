import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'wordmark' | 'mark';
}

/**
 * Jibly logo — uses the brand mark PNG (J fused with airplane) cropped into a
 * circle for a softer, more iconic feel. The wordmark variant pairs the
 * circular mark with "Jibly" in Manrope ExtraBold.
 */
export function Logo({ className = '', size = 'md', variant = 'wordmark' }: LogoProps) {
  const sizes = {
    sm: { mark: 'h-8 w-8', text: 'text-[22px]' },
    md: { mark: 'h-10 w-10', text: 'text-[26px]' },
    lg: { mark: 'h-14 w-14', text: 'text-[40px]' },
  };
  const s = sizes[size];

  const markEl = (
    <div
      className={cn(
        s.mark,
        'rounded-full overflow-hidden bg-lavender-500 flex-shrink-0 flex items-center justify-center'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        className="w-full h-full object-cover scale-110"
      />
    </div>
  );

  if (variant === 'mark') {
    return <div className={cn('inline-flex', className)} aria-label="Jibly">{markEl}</div>;
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {markEl}
      <span className={cn('font-extrabold tracking-[-0.035em] text-ink-600 leading-none', s.text)}>
        Jibly
      </span>
    </div>
  );
}
