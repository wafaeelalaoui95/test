'use client';

import { cn } from '@/lib/utils';
import { ShieldCheck, Mail, ShieldQuestion, BadgeCheck } from 'lucide-react';
import type { VerificationLevel } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'lavender' | 'butter' | 'sky' | 'mint' | 'blush' | 'ink' | 'subtle';
  className?: string;
  icon?: React.ReactNode;
}

const variants = {
  lavender: 'bg-lavender-50 text-lavender-700',
  butter:   'bg-butter-50 text-butter-600',
  sky:      'bg-sky-50 text-sky-500',
  mint:     'bg-mint-50 text-mint-500',
  blush:    'bg-blush-50 text-blush-500',
  ink:      'bg-ink-50 text-ink-500',
  subtle:   'bg-transparent text-ink-400',
};

export function Badge({ children, variant = 'subtle', className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium',
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function VerificationBadge({ level }: { level: VerificationLevel }) {
  const { t } = useI18n();
  switch (level) {
    case 'trusted':
      return (
        <Badge variant="mint" icon={<BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.5} />}>
          {t.verif_trusted}
        </Badge>
      );
    case 'id_verified':
      return (
        <Badge variant="lavender" icon={<ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />}>
          {t.verif_id}
        </Badge>
      );
    case 'email':
      return (
        <Badge variant="butter" icon={<Mail className="h-3.5 w-3.5" strokeWidth={2.5} />}>
          {t.verif_email}
        </Badge>
      );
    default:
      return (
        <Badge variant="ink" icon={<ShieldQuestion className="h-3.5 w-3.5" strokeWidth={2.5} />}>
          {t.verif_none}
        </Badge>
      );
  }
}
