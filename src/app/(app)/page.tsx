import { GlassCard } from '@/components/GlassCard';
import { Sparkles, TrendingUp, Activity, Flame, Heart } from 'lucide-react';

const STATS = [
  { label: 'AI Daily Score', value: '8.4', sub: '/ 10', tone: 'gold',   icon: Sparkles },
  { label: 'Net Worth',      value: '$142.7K', sub: '+2.1%',  tone: 'silver', icon: TrendingUp },
  { label: 'Recovery',       value: '78%',     sub: 'green',  tone: 'success', icon: Heart },
  { label: 'Strain',         value: '14.2',    sub: 'high',   tone: 'bronze', icon: Activity },
  { label: 'Top Streak',     value: '42',      sub: 'days',   tone: 'gold',   icon: Flame },
];

const TONE_TEXT: Record<string, string> = {
  gold: 'text-gold-gradient',
  silver: 'text-silver',
  bronze: 'text-bronze',
  success: 'text-success',
};

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Today</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Good morning, Andres</h1>
        </div>
        <span className="text-xs num text-silver-dim hidden md:block">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATS.map(({ label, value, sub, tone, icon: Icon }) => (
          <GlassCard key={label} hover className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-silver-dim">{label}</span>
              <Icon className="w-3.5 h-3.5 text-silver-dim" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`num text-3xl font-semibold ${TONE_TEXT[tone] ?? 'text-white'}`}>
                {value}
              </span>
              <span className="text-xs text-silver-dim num">{sub}</span>
            </div>
          </GlassCard>
        ))}
      </section>

      <GlassCard hover>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-silver-dim">AI Daily Briefing</span>
        </div>
        <p className="text-sm leading-relaxed text-white/90">
          Phase 1 placeholder. Once the AI engine is wired in Phase 2, this card will surface a
          3–5 sentence assessment with <span className="text-gold">achievements</span> and{' '}
          <span className="text-silver">areas for improvement</span> generated from today's
          aggregated data.
        </p>
      </GlassCard>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <GlassCard hover>
          <h3 className="text-sm font-medium mb-3">Today's habits</h3>
          <p className="text-xs text-silver-dim">Wired in Phase 2.</p>
        </GlassCard>
        <GlassCard hover>
          <h3 className="text-sm font-medium mb-3">Training</h3>
          <p className="text-xs text-silver-dim">Wired in Phase 3.</p>
        </GlassCard>
        <GlassCard hover>
          <h3 className="text-sm font-medium mb-3">Water</h3>
          <p className="text-xs text-silver-dim">Wired in Phase 2.</p>
        </GlassCard>
      </section>
    </div>
  );
}
