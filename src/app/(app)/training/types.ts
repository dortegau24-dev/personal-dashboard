// ── CrossFit ────────────────────────────────────────────
export type CrossfitWod = {
  id: string;
  user_id: string;
  date: string;
  wod_type: string | null;        // AMRAP, For Time, EMOM, Chipper, Strength, Custom
  description: string | null;
  score: string | null;            // e.g. "12:34" or "5 rounds + 3 reps"
  time_cap_seconds: number | null;
  rounds: number | null;
  reps: number | null;
  whoop_workout_id: string | null;
  whoop_strain: number | null;
  whoop_avg_hr: number | null;
  whoop_max_hr: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CrossfitMovement = {
  id: string;
  user_id: string;
  wod_id: string;
  movement_name: string;
  weight_kg: number | null;
  reps: number | null;
  sets: number | null;
  created_at: string;
  updated_at: string;
};

export type CrossfitPR = {
  id: string;
  user_id: string;
  movement_name: string;
  value: number;
  unit: string | null;
  date: string;
  created_at: string;
  updated_at: string;
};

export const WOD_TYPES = ['AMRAP', 'For Time', 'EMOM', 'Chipper', 'Strength', 'Custom'] as const;

// ── Jiujitsu ────────────────────────────────────────────
export type JiujitsuSession = {
  id: string;
  user_id: string;
  date: string;
  duration_min: number | null;
  type: string | null;            // Gi, No-Gi, Open Mat, Competition
  intensity: string | null;       // Light, Moderate, Hard
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type JiujitsuTechnique = {
  id: string;
  user_id: string;
  name: string;
  times_drilled: number;
  times_in_sparring: number;
  created_at: string;
  updated_at: string;
};

export type JiujitsuTechniqueLog = {
  id: string;
  user_id: string;
  session_id: string;
  technique_id: string;
  context: string | null;
  created_at: string;
  updated_at: string;
};

export type JiujitsuSparring = {
  id: string;
  user_id: string;
  session_id: string;
  partner_name: string | null;
  rounds: number | null;
  submissions_hit: number;
  submissions_defended: number;
  dominant_positions: string[];
  created_at: string;
  updated_at: string;
};

export type JiujitsuBeltHistory = {
  id: string;
  user_id: string;
  belt: string;
  stripes: number;
  date_awarded: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const BJJ_TYPES = ['Gi', 'No-Gi', 'Sparring', 'Competition'] as const;
export const BJJ_INTENSITIES = ['Light', 'Moderate', 'Hard'] as const;
export const BJJ_BELTS = ['White', 'Blue', 'Purple', 'Brown', 'Black'] as const;
export const BJJ_BELT_COLORS: Record<string, string> = {
  White: '#e5e7eb',
  Blue: '#3b82f6',
  Purple: '#8b5cf6',
  Brown: '#CD7F32',
  Black: '#1f2937',
};

// ── Triathlon ───────────────────────────────────────────
export type TriathlonSession = {
  id: string;
  user_id: string;
  date: string;
  discipline: string;             // Swim, Bike, Run
  distance: number | null;
  time_seconds: number | null;
  pace: string | null;
  stroke_type: string | null;
  avg_speed: number | null;
  elevation_gain: number | null;
  terrain: string | null;
  indoor: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RacePlan = {
  id: string;
  user_id: string;
  race_name: string;
  race_date: string | null;
  target_time: string | null;
  plan_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export const TRI_DISCIPLINES = ['Swim', 'Bike', 'Run'] as const;
export const STROKE_TYPES = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Mixed'] as const;
export const TERRAIN_OPTIONS = ['Road', 'Trail', 'Track', 'Treadmill', 'Pool', 'Open Water', 'Trainer'] as const;

// ── Weight / Body Comp ──────────────────────────────────
export type WeightEntry = {
  id: string;
  user_id: string;
  weight_kg: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WhoopData = {
  id: string;
  user_id: string;
  date: string;
  recovery_score: number | null;
  hrv: number | null;
  resting_hr: number | null;
  strain: number | null;
  sleep_performance: number | null;
  deep_sleep_min: number | null;
  rem_min: number | null;
  light_sleep_min: number | null;
  awake_min: number | null;
  calories: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

// ── Helpers ─────────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function parseDuration(str: string): number {
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}
