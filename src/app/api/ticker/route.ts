import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { today } from '@/lib/dates';
import type { TickerItem } from '@/lib/ticker-mock';

export const dynamic = 'force-dynamic';

/** GET /api/ticker — build live ticker items from across modules */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const todayDate = today();
  const items: TickerItem[] = [];
  let id = 1;

  // 1. Missed supplements (red)
  const [{ data: supplements }, { data: suppLogs }] = await Promise.all([
    supabase.from('supplements').select('id, name, schedule_slot').eq('user_id', user.id).eq('is_active', true),
    supabase.from('supplement_logs').select('supplement_id').eq('user_id', user.id).eq('date', todayDate),
  ]);
  const takenIds = new Set((suppLogs ?? []).map((l) => l.supplement_id));
  const currentHour = new Date().getHours();
  for (const s of supplements ?? []) {
    const slotHour = s.schedule_slot === 'morning' ? 10 : s.schedule_slot === 'lunch' ? 14 : s.schedule_slot === 'evening' ? 20 : 12;
    if (currentHour > slotHour + 1 && !takenIds.has(s.id)) {
      items.push({ id: String(id++), message: `${s.name} • missed ${s.schedule_slot} dose`, severity: 'red', href: '/health' });
    }
  }

  // 2. Low-stock supplements (amber)
  const { data: lowStock } = await supabase.from('supplements').select('name, quantity_remaining, low_threshold').eq('user_id', user.id).eq('is_active', true).gt('quantity_remaining', 0);
  for (const s of lowStock ?? []) {
    if (s.quantity_remaining <= s.low_threshold) {
      items.push({ id: String(id++), message: `${s.name} • ${s.quantity_remaining} doses left`, severity: 'amber', href: '/health' });
    }
  }

  // 3. Habit streaks (gold for milestones, amber for about-to-break)
  const { data: streaks } = await supabase.from('habit_streaks').select('habit_id, current_streak, last_completed_date').eq('user_id', user.id);
  const { data: habitsForStreaks } = await supabase.from('habits').select('id, name').eq('user_id', user.id).eq('is_active', true);
  const habitMap = new Map((habitsForStreaks ?? []).map((h) => [h.id, h.name]));
  const milestones = [7, 14, 30, 60, 90, 365];
  for (const s of streaks ?? []) {
    const name = habitMap.get(s.habit_id);
    if (!name) continue;
    if (milestones.includes(s.current_streak)) {
      items.push({ id: String(id++), message: `${s.current_streak}-day ${name} streak 🔥`, severity: 'gold', href: '/habits' });
    }
    // About to break: last completed was before yesterday and streak > 0
    if (s.current_streak > 0 && s.last_completed_date && s.last_completed_date < todayDate) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      if (s.last_completed_date <= yesterday.toISOString().split('T')[0]) {
        items.push({ id: String(id++), message: `${name} streak at risk • ${s.current_streak} days`, severity: 'amber', href: '/habits' });
      }
    }
  }

  // 4. Upcoming subscription renewals (next 7 days)
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: subs } = await supabase.from('subscriptions').select('name, cost_usd, renewal_date').eq('user_id', user.id).eq('status', 'active').gte('renewal_date', todayDate).lte('renewal_date', nextWeek.toISOString().split('T')[0]);
  for (const s of subs ?? []) {
    const daysUntil = Math.ceil((new Date(s.renewal_date).getTime() - new Date(todayDate).getTime()) / 86400000);
    items.push({ id: String(id++), message: `${s.name} renews in ${daysUntil}d • $${s.cost_usd}`, severity: 'amber', href: '/finance' });
  }

  // 5. Custom alerts
  const { data: alerts } = await supabase.from('custom_alerts').select('*').eq('user_id', user.id).lte('start_date', todayDate).gte('end_date', todayDate);
  for (const a of alerts ?? []) {
    items.push({ id: String(id++), message: a.message, severity: a.severity ?? 'white' });
  }

  // 6. Active ticker_items from database
  const { data: dbItems } = await supabase.from('ticker_items').select('*').eq('user_id', user.id).eq('is_active', true);
  for (const t of dbItems ?? []) {
    if (t.expires_at && new Date(t.expires_at) < new Date()) continue;
    items.push({ id: String(id++), message: t.message, severity: t.severity ?? 'white', href: t.link_url ?? undefined });
  }

  // 7. Water progress (informational)
  const { data: waterLogs } = await supabase.from('water_logs').select('amount_ml').eq('user_id', user.id).eq('date', todayDate);
  const waterTotal = (waterLogs ?? []).reduce((sum, l) => sum + l.amount_ml, 0);
  const { data: wp } = await supabase.from('water_profile').select('weight_kg, activity_level').eq('user_id', user.id).single();
  const waterTarget = wp?.weight_kg ? Math.round(wp.weight_kg * 35 * (wp.activity_level === 'very_active' ? 1.35 : wp.activity_level === 'active' ? 1.2 : 1)) : 3000;
  items.push({ id: String(id++), message: `Water ${(waterTotal / 1000).toFixed(1)}L / ${(waterTarget / 1000).toFixed(1)}L`, severity: waterTotal >= waterTarget ? 'gold' : 'white', href: '/health' });

  // Fallback if nothing
  if (items.length <= 1) {
    items.push({ id: String(id++), message: 'Dashboard operational — log habits, water, and mood to populate the ticker', severity: 'white' });
  }

  return NextResponse.json(items);
}
