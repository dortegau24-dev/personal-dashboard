import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCode } from '@/lib/whoop';
import { syncWhoopForUser } from '@/lib/whoop-sync';

export const dynamic = 'force-dynamic';

/** GET /api/whoop/callback?code=...&state=... */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?whoop_error=${error}`, request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/settings?whoop_error=missing_code', request.url));
  }

  // Verify CSRF state
  const cookieState = request.headers.get('cookie')?.match(/whoop_oauth_state=([^;]+)/)?.[1];
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL('/settings?whoop_error=bad_state', request.url));
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  try {
    const tokens = await exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from('whoop_tokens').upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
    }, { onConflict: 'user_id' });

    // Initial sync
    await syncWhoopForUser(supabase, user.id, 30);

    const res = NextResponse.redirect(new URL('/settings?whoop_connected=1', request.url));
    res.cookies.delete('whoop_oauth_state');
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown';
    return NextResponse.redirect(new URL(`/settings?whoop_error=${encodeURIComponent(msg)}`, request.url));
  }
}
