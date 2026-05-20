'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, Activity, Flame, Heart, Droplets, Pill, SmilePlus, Zap, Loader2, Check, ShieldOff } from 'lucide-react';

type Props = {
  userName: string;
  dailyScore: { overall_score: number; daily_briefing: string; achievements: string[]; improvements: string[] } | null;
  habitPct: number;
  completedHabits: number;
  totalHabits: number;
  suppPct: number;
  takenSupps: number;
  totalSupps: number;
  waterTotal: number;
  waterTarget: number;
  longestStreak: number;
  whoop: { recovery_score: number | null; strain: number | null; hrv: number | null } | null;
  latestMood: { mood_score: number | null; energy_score: number | null } | null;
  recentScores: { date: string; overall_score: number }[];
  habits: { id: string; name: string; type: string; time_of_day: string | null }[];
  habitLogs: { habit_id: string; completed: boolean }[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeDashboard({
  userName, dailyScore, habitPct, completedHabits, totalHabits,
  suppPct, takenSupps, totalSupps, waterTotal, waterTarget,
  longestStreak, whoop, latestMood, recentScores, habits, habitLogs,
}: Props) {
  const router = useRouter();
  const [scoring, setScoring] = useState(false);

  async function triggerScore() {
    setScoring(true);
    try {
      await fetch('/api/ai/daily-score', { method: 'POST' });
      router.refresh();
    } finally {
      setScoring(false);
    }
  }

  const score = dailyScore?.overall_score;
  const waterPct = Math.min(100, Math.round((waterTotal / waterTarget) * 100));

  const STATS = [
    { label: 'AI Score', value: score != null ? score.toFixed(1) : '—', sub: '/ 10', tone: 'gold', icon: Sparkles },
    { label: 'Recovery', value: whoop?.recovery_score != null ? `${whoop.recovery_score}%` : '—', sub: whoop?.recovery_score != null ? (whoop.recovery_score >= 67 ? 'green' : whoop.recovery_score >= 34 ? 'yellow' : 'red') : '', tone: 'success', icon: Heart },
    { label: 'Strain', value: whoop?.strain != null ? whoop.strain.toFixed(1) : '—', sub: whoop?.strain != null ? (whoop.strain >= 14 ? 'high' : whoop.strain >= 7 ? 'moderate' : 'light') : '', tone: 'bronze', icon: Activity },
    { label: 'Top Streak', value: String(longestStreak), sub: 'days', tone: 'gold', icon: Flame },
    { label: 'Mood', value: latestMood?.mood_score != null ? String(latestMood.mood_score) : '—', sub: latestMood?.energy_score != null ? `⚡${latestMood.energy_score}` : '', tone: 'silver', icon: SmilePlus },
  ];

  const TONE_TEXT: Record<string, string> = { gold: 'text-gold-gradient', silver: 'text-silver', bronze: 'text-bronze', success: 'text-success' };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Today</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{greeting()}, {userName}</h1>
        </div>
        <span className="text-xs num text-silver-dim hidden md:block">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </header>

      {/* Key metrics */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STATS.map(({ label, value, sub, tone, icon: Icon }) => (
          <GlassCard key={label} hover className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-silver-dim">{label}</span>
              <Icon className="w-3.5 h-3.5 text-silver-dim" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`num text-3xl font-semibold ${TONE_TEXT[tone] ?? 'text-white'}`}>{value}</span>
              <span className="text-xs text-silver-dim num">{sub}</span>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* AI Briefing */}
      <GlassCard hover>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">AI Daily Briefing</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={scoring}
            onClick={triggerScore}
            icon={scoring ? undefined : <Sparkles className="w-3 h-3" />}
          >
            {dailyScore ? 'Rescore' : 'Generate score'}
          </Button>
        </div>
        {dailyScore ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-white/90">{dailyScore.daily_briefing}</p>
            {dailyScore.achievements?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold/70 mb-1">Achievements</p>
                {dailyScore.achievements.map((a, i) => (
                  <p key={i} className="text-xs text-gold/90 pl-3 border-l border-gold/20 mb-1">{a}</p>
                ))}
              </div>
            )}
            {dailyScore.improvements?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-silver-dim/70 mb-1">Improve</p>
                {dailyScore.improvements.map((a, i) => (
                  <p key={i} className="text-xs text-silver/70 pl-3 border-l border-silver/10 mb-1">{a}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-silver-dim">
            No score yet for today. Log some habits, water, and mood, then hit <strong>Generate score</strong>.
          </p>
        )}
      </GlassCard>

      {/* Middle cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Habits mini */}
        <GlassCard hover className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium">Today&apos;s habits</span>
            <span className="num text-xs"><span className="text-gold">{completedHabits}</span><span className="text-muted">/{totalHabits}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all" style={{ width: `${habitPct}%` }} />
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {habits.slice(0, 8).map((h) => {
              const done = habitLogs.find((l) => l.habit_id === h.id)?.completed ?? false;
              return (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <div className={cn('w-4 h-4 rounded border flex items-center justify-center', done ? 'bg-gold/20 border-gold/40' : 'border-white/10')}>
                    {done && (h.type === 'negative' ? <ShieldOff className="w-2.5 h-2.5 text-success" /> : <Check className="w-2.5 h-2.5 text-gold" />)}
                  </div>
                  <span className={cn(done ? 'text-white' : 'text-muted')}>{h.name}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Supplements */}
        <GlassCard hover className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium flex items-center gap-1.5"><Pill className="w-3 h-3" /> Supplements</span>
            <span className="num text-xs"><span className="text-success">{takenSupps}</span><span className="text-muted">/{totalSupps}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-success/60 to-success transition-all" style={{ width: `${suppPct}%` }} />
          </div>
          <p className="text-xs text-silver-dim mt-3 num">{suppPct}% compliance</p>
        </GlassCard>

        {/* Water */}
        <GlassCard hover className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium flex items-center gap-1.5"><Droplets className="w-3 h-3 text-blue-400" /> Water</span>
            <span className="num text-xs text-blue-400">{waterPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className={cn('h-full rounded-full transition-all bg-gradient-to-r', waterPct >= 66 ? 'from-success/60 to-success' : waterPct >= 33 ? 'from-warning/60 to-warning' : 'from-danger/60 to-danger')} style={{ width: `${waterPct}%` }} />
          </div>
          <p className="text-xs text-silver-dim mt-3 num">
            {(waterTotal / 1000).toFixed(1)}L / {(waterTarget / 1000).toFixed(1)}L
          </p>
        </GlassCard>
      </section>

      {/* 7-day score trend */}
      {recentScores.length > 0 && (
        <GlassCard>
          <span className="text-[10px] uppercase tracking-widest text-silver-dim mb-2 block">7-day AI score</span>
          <div className="flex items-end gap-2 h-16">
            {recentScores.map(({ date, overall_score }) => (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-md bg-gold/30" style={{ height: `${(overall_score / 10) * 100}%` }} />
                <span className="num text-[9px] text-muted mt-1">{overall_score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
