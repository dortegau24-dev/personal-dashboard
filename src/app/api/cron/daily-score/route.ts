import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { callOpenRouter, type DailyScorePayload, type DailyScoreResult } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Vercel function timeout

/**
 * GET /api/cron/daily-score
 * Called by Vercel Cron at 5 AM UTC daily.
 * Uses service role key to act on behalf of the user since this runs without a session.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role for cron (bypasses RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  // Get yesterday's date (cron runs at 5 AM, scoring yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const scoringDate = yesterday.toISOString().split('T')[0];

  // Get all profiles (single-user app, but future-proof)
  const { data: profiles } = await supabase.from('profiles').select('user_id');
  if (!profiles?.length) {
    return NextResponse.json({ message: 'No users' });
  }

  const results = [];

  for (const { user_id } of profiles) {
    // Check if already scored
    const { data: existing } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', scoringDate)
      .single();
    if (existing) {
      results.push({ user_id, status: 'already_scored' });
      continue;
    }

    // Gather data
    const [habits, habitLogs, supplements, suppLogs, waterLogs, waterProfile, moodEntries, whoopData, crossfitWods, jjSessions, triSessions, freezeDay] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user_id).eq('is_active', true),
      supabase.from('habit_logs').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('supplements').select('*').eq('user_id', user_id).eq('is_active', true),
      supabase.from('supplement_logs').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('water_logs').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('water_profile').select('*').eq('user_id', user_id).single(),
      supabase.from('mood_entries').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('whoop_data').select('*').eq('user_id', user_id).eq('date', scoringDate).single(),
      supabase.from('crossfit_wods').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('jiujitsu_sessions').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('triathlon_sessions').select('*').eq('user_id', user_id).eq('date', scoringDate),
      supabase.from('freeze_days').select('*').eq('user_id', user_id).eq('date', scoringDate).single(),
    ]);

    const habitList = (habits.data ?? []).map((h) => {
      const log = (habitLogs.data ?? []).find((l) => l.habit_id === h.id);
      return { name: h.name, completed: log?.completed ?? false, type: h.type };
    });
    const completedHabits = habitList.filter((h) => h.completed).length;

    const suppList = (supplements.data ?? []).map((s) => ({
      name: s.name,
      taken: (suppLogs.data ?? []).some((l) => l.supplement_id === s.id),
    }));

    const waterTotal = (waterLogs.data ?? []).reduce((sum, l) => sum + l.amount_ml, 0);
    const wp = waterProfile.data;
    const waterTarget = wp?.weight_kg ? Math.round(wp.weight_kg * 35) : 3000;

    const training = [
      ...(crossfitWods.data ?? []).map((w) => ({ type: 'CrossFit', duration: undefined as number | undefined, notes: w.description as string | undefined })),
      ...(jjSessions.data ?? []).map((s) => ({ type: `Jiujitsu (${s.type})`, duration: s.duration_min as number | undefined, notes: s.notes as string | undefined })),
      ...(triSessions.data ?? []).map((s) => ({ type: s.discipline, duration: s.time_seconds ? Math.round(s.time_seconds / 60) : undefined, notes: s.notes as string | undefined })),
    ];

    const payload: DailyScorePayload = {
      date: scoringDate,
      habits: habitList,
      habitsCompletionPct: habitList.length > 0 ? Math.round((completedHabits / habitList.length) * 100) : 0,
      supplements: suppList,
      supplementCompliancePct: suppList.length > 0 ? Math.round((suppList.filter((s) => s.taken).length / suppList.length) * 100) : 0,
      waterIntakeMl: waterTotal,
      waterTargetMl: waterTarget,
      mood: (moodEntries.data ?? []).map((e) => ({ time: e.time_of_day ?? 'unknown', mood: e.mood_score ?? 3, energy: e.energy_score ?? 3 })),
      whoop: whoopData.data ? { recovery: whoopData.data.recovery_score, strain: whoopData.data.strain, hrv: whoopData.data.hrv, sleepPerformance: whoopData.data.sleep_performance } : null,
      training,
      isFreezeDay: !!freezeDay.data,
      freezeReason: freezeDay.data?.reason ?? undefined,
    };

    // Get prompt
    const { data: promptRow } = await supabase.from('ai_prompts').select('prompt_text').eq('user_id', user_id).eq('is_active', true).eq('prompt_name', 'daily_score_default').single();
    const systemPrompt = promptRow?.prompt_text ?? 'You are an AI life coach. Score the day 1-10. Return JSON: {overall_score, category_scores:{training,health,discipline,recovery,productivity}, daily_briefing, notable_achievements:[], areas_for_improvement:[]}.';

    try {
      const raw = await callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(payload) },
      ]);

      const result: DailyScoreResult = JSON.parse(raw);

      await supabase.from('daily_scores').insert({
        user_id,
        date: scoringDate,
        overall_score: result.overall_score,
        training_score: result.category_scores?.training,
        health_score: result.category_scores?.health,
        discipline_score: result.category_scores?.discipline,
        recovery_score: result.category_scores?.recovery,
        productivity_score: result.category_scores?.productivity,
        daily_briefing: result.daily_briefing,
        achievements: result.notable_achievements,
        improvements: result.areas_for_improvement,
        raw_payload: payload,
      });

      results.push({ user_id, status: 'scored', score: result.overall_score });
    } catch (err) {
      results.push({ user_id, status: 'error', error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  return NextResponse.json({ results });
}
