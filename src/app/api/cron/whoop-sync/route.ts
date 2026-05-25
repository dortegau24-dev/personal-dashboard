import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncWhoopForUser } from '@/lib/whoop-sync';

export const dynamic = 'force-dynamic';

/**
 * Vercel cron handler — runs every 8 hours.
 * Syncs Whoop data for every user with whoop_auto_sync = true.
 * Auth: requires CRON_SECRET as Bearer token (Vercel sets this automatically).
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase service role config' }, { status: 500 });
  }

  // Admin client (bypasses RLS) — only used in this trusted server context
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Find every user with auto-sync on AND a stored whoop token
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, whoop_auto_sync')
    .eq('whoop_auto_sync', true);

  const results: { user_id: string; ok: boolean; error?: string; synced?: number }[] = [];

  for (const p of profiles ?? []) {
    try {
      const r = await syncWhoopForUser(admin, p.user_id, 7);
      results.push({ user_id: p.user_id, ok: true, synced: r.synced });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      results.push({ user_id: p.user_id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
