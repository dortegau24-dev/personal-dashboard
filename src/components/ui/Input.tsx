import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const base =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40 transition text-white placeholder:text-muted';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, 'appearance-none', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'resize-none', className)} rows={3} {...props} />;
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      {children}
    </label>
  );
}

export function LabelText({ children }: { children: React.ReactNode }) {
  return <span className="block text-[10px] uppercase tracking-widest text-silver-dim mb-1.5">{children}</span>;
}
