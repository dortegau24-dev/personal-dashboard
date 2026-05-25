import type { SupabaseClient } from '@supabase/supabase-js';
import {
  aggregateWhoopByDate, refreshAccessToken, whoopGet,
  type WhoopCycle, type WhoopRecovery, type WhoopSleep,
} from './whoop';

type ListResp<T> = { records: T[]; next_token?: string };

/**
 * Sync the last `daysBack` days of Whoop data for a user.
 * Auto-refreshes the access token if expired.
 * Upserts one row per date into `whoop_data`.
 */
export async function syncWhoopForUser(
  supabase: SupabaseClient,
  userId: string,
  daysBack = 14,
): Promise<{ synced: number; lastDate: string | null }> {
  // Load token
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('whoop_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (tokenErr || !tokenRow) throw new Error('Whoop not connected');

  let accessToken = tokenRow.access_token as string;
  const expiresAt = new Date(tokenRow.expires_at as string);

  // Refresh if expired or about to expire (60s buffer)
  if (expiresAt.getTime() - Date.now() < 60_000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
    accessToken = refreshed.access_token;
    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase.from('whoop_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: newExpires,
    }).eq('user_id', userId);
  }

  // Fetch last N days
  const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const q = `?start=${encodeURIComponent(start)}&limit=25`;

  const [cyclesRes, recRes, sleepRes] = await Promise.all([
    whoopGet<ListResp<WhoopCycle>>(`/v1/cycle${q}`, accessToken),
    whoopGet<ListResp<WhoopRecovery>>(`/v1/recovery${q}`, accessToken),
    whoopGet<ListResp<WhoopSleep>>(`/v1/activity/sleep${q}`, accessToken),
  ]);

  const aggregated = aggregateWhoopByDate(
    cyclesRes.records,
    recRes.records,
    sleepRes.records,
  );

  const rows = Object.values(aggregated).map((r) => ({ user_id: userId, ...r }));
  if (rows.length > 0) {
    const { error: upErr } = await supabase
      .from('whoop_data')
      .upsert(rows, { onConflict: 'user_id,date' });
    if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);
  }

  // Update last-synced timestamp
  await supabase.from('profiles')
    .update({ whoop_last_sync: new Date().toISOString() })
    .eq('user_id', userId);

  const dates = rows.map((r) => r.date).sort();
  return { synced: rows.length, lastDate: dates[dates.length - 1] ?? null };
}
