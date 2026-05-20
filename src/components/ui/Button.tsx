import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
};

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-gold to-bronze text-bg-base font-medium hover:brightness-110',
  secondary:
    'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.10] hover:border-gold/30',
  ghost:
    'text-silver-dim hover:text-white hover:bg-white/[0.04]',
  danger:
    'bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20',
};

export function Button({ variant = 'primary', loading, icon, size = 'md', className, children, disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition disabled:opacity-50',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
