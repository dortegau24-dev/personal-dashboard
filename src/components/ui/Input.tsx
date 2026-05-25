'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const base =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40 transition text-white placeholder:text-muted';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, className)} {...props} />;
}

/** @deprecated — use Select (now glass-styled) instead */
export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, 'appearance-none', className)} {...props} />;
}

type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children?: React.ReactNode;
  options?: SelectOption[];
  className?: string;
  placeholder?: string;
};

/**
 * Custom glass-styled dropdown that matches the dashboard aesthetic.
 * Accepts either `children` (<option> elements, for drop-in replacement)
 * or an `options` prop array.
 */
export function Select({ value, onChange, children, options: optionsProp, className, placeholder }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse options from children (React <option> elements) or from prop
  const options: SelectOption[] = optionsProp
    ? optionsProp
    : (() => {
        const result: SelectOption[] = [];
        const arr = Array.isArray(children) ? children : [children];
        const flatten = (nodes: React.ReactNode[]) => {
          for (const child of nodes) {
            if (!child || typeof child === 'string' || typeof child === 'number') continue;
            if (Array.isArray(child)) { flatten(child); continue; }
            if (typeof child === 'object' && 'props' in child) {
              const el = child as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
              if (el.props) {
                result.push({
                  value: String(el.props.value ?? el.props.children ?? ''),
                  label: String(el.props.children ?? el.props.value ?? ''),
                });
              }
            }
          }
        };
        flatten(arr);
        return result;
      })();

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? value;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          base,
          'flex items-center justify-between gap-2 text-left cursor-pointer',
          open && 'border-gold/40',
        )}
      >
        <span className={cn('truncate', !value && 'text-muted')}>{selectedLabel}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-silver-dim flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/[0.08] bg-[#141419] backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-gold/15 text-gold'
                    : 'text-white/80 hover:bg-white/[0.06] hover:text-white',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
