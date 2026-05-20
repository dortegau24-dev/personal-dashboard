import { GlassCard } from './GlassCard';
import { Sparkles } from 'lucide-react';

type Props = {
  title: string;
  phase: string;
  description?: string;
};

export function ComingSoon({ title, phase, description }: Props) {
  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Module</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        </div>
        <span className="text-xs num text-gold/70 border border-gold/20 rounded-full px-3 py-1">
          {phase}
        </span>
      </header>

      <GlassCard hover className="flex flex-col items-center text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/30 to-bronze/20 border border-gold/30 flex items-center justify-center mb-5">
          <Sparkles className="w-6 h-6 text-gold" />
        </div>
        <h2 className="text-xl font-medium mb-2">Coming soon</h2>
        <p className="text-silver-dim max-w-md text-sm leading-relaxed">
          {description ?? 'This module ships in a later phase. The schema and routes are already wired so the rest of the app keeps moving without restructure.'}
        </p>
      </GlassCard>
    </div>
  );
}
