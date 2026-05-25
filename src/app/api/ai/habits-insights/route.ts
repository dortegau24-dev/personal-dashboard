import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenRouter } from '@/lib/openrouter';
import { daysAgo, today } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/habits-insights
 * Pulls the last 30 days of habit logs and asks the model for behavioral insights:
 *   - Patterns (e.g. "you skip meditation on weekends")
 *   - Streaks at risk
 *   - Suggestions
 */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const since = daysAgo(29);

    const [habitsRes, logsRes, streaksRes] = await Promise.all([
      supabase.from('habits').select('id, name, type').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_logs').select('habit_id, date, completed').eq('user_id', user.id).gte('date', since),
      supabase.from('habit_streaks').select('habit_id, current_streak, longest_streak').eq('user_id', user.id),
    ]);

    const habits = habitsRes.data ?? [];
    const logs = logsRes.data ?? [];
    const streaks = streaksRes.data ?? [];

    if (habits.length === 0) {
      return NextResponse.json({
        summary: 'No active habits yet. Add some habits and check in for a few days to unlock insights.',
        patterns: [],
        risks: [],
        suggestions: [],
      });
    }

    // Build a compact per-habit payload the model can analyze
    const habitData = habits.map((h) => {
      const habitLogs = logs.filter((l) => l.habit_id === h.id);
      const completedDates = habitLogs.filter((l) => l.completed).map((l) => l.date);
      const streak = streaks.find((s) => s.habit_id === h.id);

      // Day-of-week pattern (Sun=0..Sat=6)
      const dowCounts = [0, 0, 0, 0, 0, 0, 0];
      const dowTotals = [0, 0, 0, 0, 0, 0, 0];
      for (const l of habitLogs) {
        const dow = new Date(l.date + 'T00:00:00').getDay();
        dowTotals[dow] += 1;
        if (l.completed) dowCounts[dow] += 1;
      }

      return {
        name: h.name,
        type: h.type,
        completionRate: habitLogs.length > 0
          ? Math.round((completedDates.length / habitLogs.length) * 100)
          : 0,
        currentStreak: streak?.current_streak ?? 0,
        longestStreak: streak?.longest_streak ?? 0,
        dayOfWeekRates: dowCounts.map((c, i) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          rate: dowTotals[i] > 0 ? Math.round((c / dowTotals[i]) * 100) : null,
        })),
        recentCompletedDays: completedDates.slice(-7),
      };
    });

    const systemPrompt = `You are a behavioral coach analyzing habit data. Find PATTERNS (e.g. "skips meditation on weekends"), STREAKS AT RISK, and give 2-3 specific actionable SUGGESTIONS.

Return strict JSON only:
{
  "summary": "2-3 sentence overview of how the user is doing.",
  "patterns": ["pattern 1", "pattern 2"],
  "risks": ["streak/habit at risk 1"],
  "suggestions": ["specific actionable tip 1", "tip 2"]
}

Keep each bullet concise (max 20 words). Reference habits by name. Be honest but encouraging.`;

    const userPrompt = `Analyze the last 30 days of habit data for ${today()}:\n\n${JSON.stringify(habitData, null, 2)}`;

    const raw = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.4, max_tokens: 700 });

    let result: { summary: string; patterns: string[]; risks: string[]; suggestions: string[] };
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('Habits insights error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
