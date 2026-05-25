/**
 * Whoop API helpers.
 * Docs: https://developer.whoop.com/api
 *
 * Public-API endpoints used:
 *   - GET /v1/cycle?limit=N            → strain, kilojoules, avg/max HR per day
 *   - GET /v1/recovery?limit=N         → recovery %, HRV, resting HR per cycle
 *   - GET /v1/activity/sleep?limit=N   → sleep performance, stages
 *   - GET /v1/activity/workout?limit=N → individual workouts (future use)
 */

export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';

// Scopes we need for the data we display
export const WHOOP_SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement',
  'offline', // required to receive a refresh_token
].join(' ');

export type WhoopTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  scope?: string;
  token_type?: string;
};

/** Build the OAuth authorization URL */
export function buildAuthUrl(state: string): string {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !redirectUri) throw new Error('Whoop env vars not set');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: WHOOP_SCOPES,
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

/** Exchange authorization code for tokens */
export async function exchangeCode(code: string): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token exchange failed: ${await res.text()}`);
  return res.json();
}

/** Refresh access token using refresh_token */
export async function refreshAccessToken(refreshToken: string): Promise<WhoopTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: WHOOP_SCOPES,
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token refresh failed: ${await res.text()}`);
  return res.json();
}

/** Authed GET to Whoop API */
export async function whoopGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Whoop API ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// === Domain types (subset of Whoop's response shape) ===

export type WhoopCycle = {
  id: number;
  start: string; // ISO
  end?: string;
  score?: {
    strain?: number;
    kilojoule?: number;
    average_heart_rate?: number;
    max_heart_rate?: number;
  };
};

export type WhoopRecovery = {
  cycle_id: number;
  sleep_id: number;
  score?: {
    recovery_score?: number;
    resting_heart_rate?: number;
    hrv_rmssd_milli?: number;
  };
};

export type WhoopSleep = {
  id: number;
  start: string;
  end: string;
  score?: {
    stage_summary?: {
      total_in_bed_time_milli?: number;
      total_awake_time_milli?: number;
      total_light_sleep_time_milli?: number;
      total_slow_wave_sleep_time_milli?: number;
      total_rem_sleep_time_milli?: number;
    };
    sleep_performance_percentage?: number;
    sleep_efficiency_percentage?: number;
  };
};

/** Convert ms → minutes (rounded) */
function ms2min(ms?: number): number | null {
  if (ms == null) return null;
  return Math.round(ms / 60000);
}

/** Convert kilojoules → kilocalories */
function kj2kcal(kj?: number): number | null {
  if (kj == null) return null;
  return Math.round(kj * 0.239006);
}

/**
 * Aggregate Whoop API responses into our `whoop_data` row shape, one per date.
 * A "cycle" in Whoop spans roughly a 24h day; we use cycle.start (date portion) as the key.
 */
export function aggregateWhoopByDate(
  cycles: WhoopCycle[],
  recoveries: WhoopRecovery[],
  sleeps: WhoopSleep[],
): Record<string, {
  date: string;
  strain: number | null;
  calories: number | null;
  recovery_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  sleep_performance: number | null;
  deep_sleep_min: number | null;
  rem_min: number | null;
  light_sleep_min: number | null;
  awake_min: number | null;
}> {
  const recByCycle = new Map<number, WhoopRecovery>();
  for (const r of recoveries) recByCycle.set(r.cycle_id, r);

  const sleepById = new Map<number, WhoopSleep>();
  for (const s of sleeps) sleepById.set(s.id, s);

  const out: ReturnType<typeof aggregateWhoopByDate> = {};

  for (const c of cycles) {
    const date = c.start.split('T')[0];
    const rec = recByCycle.get(c.id);
    const sleep = rec ? sleepById.get(rec.sleep_id) : undefined;
    const ss = sleep?.score?.stage_summary;

    out[date] = {
      date,
      strain: c.score?.strain != null ? Math.round(c.score.strain * 10) / 10 : null,
      calories: kj2kcal(c.score?.kilojoule),
      recovery_score: rec?.score?.recovery_score ?? null,
      hrv: rec?.score?.hrv_rmssd_milli != null ? Math.round(rec.score.hrv_rmssd_milli) : null,
      resting_hr: rec?.score?.resting_heart_rate ?? null,
      sleep_performance: sleep?.score?.sleep_performance_percentage ?? null,
      deep_sleep_min: ms2min(ss?.total_slow_wave_sleep_time_milli),
      rem_min: ms2min(ss?.total_rem_sleep_time_milli),
      light_sleep_min: ms2min(ss?.total_light_sleep_time_milli),
      awake_min: ms2min(ss?.total_awake_time_milli),
    };
  }

  return out;
}
