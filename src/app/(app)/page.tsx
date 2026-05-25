import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HomeDashboard } from './HomeDashboard';
import { today, daysAgo } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const todayDate = today();

  const [
    { data: profile },
    { data: dailyScore },
    { data: habits },
    { data: habitLogs },
    { data: habitStreaks },
    { data: supplements },
    { data: supplementLogs },
    { data: waterLogs },
    { data: waterProfile },
    { data: moodEntries },
    { data: whoopToday },
    { data: recentScores },
    { data: timeBlocks },
    { data: accounts },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('daily_scores').select('*').eq('user_id', user.id).eq('date', todayDate).single(),
    supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('time_of_day').order('created_at'),
    supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
    supabase.from('habit_streaks').select('*').eq('user_id', user.id),
    supabase.from('supplements').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('supplement_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
    supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
    supabase.from('water_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('mood_entries').select('*').eq('user_id', user.id).eq('date', todayDate).order('created_at', { ascending: false }).limit(1),
    supabase.from('whoop_data').select('*').eq('user_id', user.id).eq('date', todayDate).single(),
    supabase.from('daily_scores').select('date, overall_score').eq('user_id', user.id).gte('date', daysAgo(6)).order('date'),
    supabase.from('time_blocks').select('*').eq('user_id', user.id).eq('date', todayDate),
    supabase.from('accounts').select('name, type, balance_usd').eq('user_id', user.id),
  ]);

  // Compute metrics
  const totalHabits = habits?.length ?? 0;
  const completedHabits = (habitLogs ?? []).filter((l) => l.completed).length;
  const habitPct = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  const totalSupps = supplements?.length ?? 0;
  const takenSupps = (supplements ?? []).filter((s) => (supplementLogs ?? []).some((l) => l.supplement_id === s.id)).length;
  const suppPct = totalSupps > 0 ? Math.round((takenSupps / totalSupps) * 100) : 0;

  const waterTotal = (waterLogs ?? []).reduce((sum, l) => sum + l.amount_ml, 0);
  const wp = waterProfile;
  const waterTarget = wp?.weight_kg ? Math.round(wp.weight_kg * 35 * (wp.activity_level === 'very_active' ? 1.35 : wp.activity_level === 'active' ? 1.2 : 1)) : 3000;

  const longestStreak = Math.max(0, ...(habitStreaks ?? []).map((s) => s.current_streak));

  const latestMood = moodEntries?.[0] ?? null;

  const netWorth = (accounts ?? []).reduce((sum, a) => sum + (Number(a.balance_usd) || 0), 0);

  return (
    <HomeDashboard
      userName={profile?.name ?? 'there'}
      dailyScore={dailyScore}
      habitPct={habitPct}
      completedHabits={completedHabits}
      totalHabits={totalHabits}
      suppPct={suppPct}
      takenSupps={takenSupps}
      totalSupps={totalSupps}
      waterTotal={waterTotal}
      waterTarget={waterTarget}
      longestStreak={longestStreak}
      whoop={whoopToday}
      latestMood={latestMood}
      recentScores={recentScores ?? []}
      habits={habits ?? []}
      habitLogs={habitLogs ?? []}
      timeBlocks={timeBlocks ?? []}
      netWorth={netWorth}
      accounts={accounts ?? []}
    />
  );
}
