import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callOpenRouter, type DailyScorePayload, type DailyScoreResult } from '@/lib/openrouter';
import { today } from '@/lib/dates';

export const dynamic = 'force-dynamic';

/** POST /api/ai/daily-score — generate today's AI daily score */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const todayDate = today();

    // Check rate limit (5 calls per day)
    const { count } = await supabase
      .from('daily_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('date', todayDate);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Daily limit reached (5 scores/day)' }, { status: 429 });
    }

    // Gather all data for today
    const [habits, habitLogs, supplements, suppLogs, waterLogs, waterProfile, moodEntries, whoopData, crossfitWods, jjSessions, triSessions, freezeDay] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('supplements').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('supplement_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('water_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('water_profile').select('*').eq('user_id', user.id).single(),
      supabase.from('mood_entries').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('whoop_data').select('*').eq('user_id', user.id).eq('date', todayDate).single(),
      supabase.from('crossfit_wods').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('jiujitsu_sessions').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('triathlon_sessions').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('freeze_days').select('*').eq('user_id', user.id).eq('date', todayDate).single(),
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
    const takenSupps = suppList.filter((s) => s.taken).length;

    const waterTotal = (waterLogs.data ?? []).reduce((sum, l) => sum + l.amount_ml, 0);
    const wp = waterProfile.data;
    const waterTarget = wp?.weight_kg ? Math.round(wp.weight_kg * 35 * (wp.activity_level === 'very_active' ? 1.35 : wp.activity_level === 'active' ? 1.2 : 1)) : 3000;

    const moodList = (moodEntries.data ?? []).map((e) => ({
      time: e.time_of_day ?? 'unknown',
      mood: e.mood_score ?? 3,
      energy: e.energy_score ?? 3,
      notes: e.notes ?? undefined,
    }));

    const training = [
      ...(crossfitWods.data ?? []).map((w) => ({ type: 'CrossFit', duration: undefined, notes: w.description })),
      ...(jjSessions.data ?? []).map((s) => ({ type: `Jiujitsu (${s.type})`, duration: s.duration_min, notes: s.notes })),
      ...(triSessions.data ?? []).map((s) => ({ type: s.discipline, duration: s.time_seconds ? Math.round(s.time_seconds / 60) : undefined, notes: s.notes })),
    ];

    const payload: DailyScorePayload = {
      date: todayDate,
      habits: habitList,
      habitsCompletionPct: habitList.length > 0 ? Math.round((completedHabits / habitList.length) * 100) : 0,
      supplements: suppList,
      supplementCompliancePct: suppList.length > 0 ? Math.round((takenSupps / suppList.length) * 100) : 0,
      waterIntakeMl: waterTotal,
      waterTargetMl: waterTarget,
      mood: moodList,
      whoop: whoopData.data ? {
        recovery: whoopData.data.recovery_score,
        strain: whoopData.data.strain,
        hrv: whoopData.data.hrv,
        sleepPerformance: whoopData.data.sleep_performance,
      } : null,
      training,
      isFreezeDay: !!freezeDay.data,
      freezeReason: freezeDay.data?.reason ?? undefined,
    };

    // Get scoring prompt
    const { data: promptRow } = await supabase
      .from('ai_prompts')
      .select('prompt_text')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('prompt_name', 'daily_score_default')
      .single();

    const systemPrompt = promptRow?.prompt_text ??
      'You are an AI life coach. Score the user\'s day from 1-10. Return strict JSON: {overall_score, category_scores:{training,health,discipline,recovery,productivity}, daily_briefing, notable_achievements:[], areas_for_improvement:[]}.';

    const raw = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is today's data:\n\n${JSON.stringify(payload, null, 2)}` },
    ]);

    let result: DailyScoreResult;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON', raw }, { status: 502 });
    }

    // Store in daily_scores
    const { data: score, error: insertError } = await supabase.from('daily_scores').upsert({
      user_id: user.id,
      date: todayDate,
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
    }, { onConflict: 'user_id,date' }).select().single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ score });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Daily score error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
