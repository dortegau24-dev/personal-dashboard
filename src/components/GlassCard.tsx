import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  strong?: boolean;
};

export function GlassCard({ className, hover, strong, ...rest }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl p-5',
        strong ? 'glass-strong' : 'glass',
        hover && 'glass-hover',
        className,
      )}
      {...rest}
    />
  );
}
