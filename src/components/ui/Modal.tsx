'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Modal({ open, onClose, title, children, className }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className="backdrop:bg-black/60 backdrop:backdrop-blur-sm bg-transparent p-0 open:flex items-center justify-center"
    >
      <div className={cn(
        'glass-strong rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto text-white',
        className,
      )}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-silver-dim hover:text-white transition p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
