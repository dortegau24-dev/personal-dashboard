export type Supplement = {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  schedule_slot: 'morning' | 'lunch' | 'evening' | 'custom' | null;
  custom_time: string | null;
  quantity_remaining: number;
  low_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplementLog = {
  id: string;
  user_id: string;
  supplement_id: string;
  taken_at: string;
  date: string;
  created_at: string;
};

export type WaterProfile = {
  id: string;
  user_id: string;
  weight_kg: number | null;
  age: number | null;
  activity_level: 'sedentary' | 'moderate' | 'active' | 'very_active' | null;
  caffeine_servings: number;
  nicotine: boolean;
  adhd_meds: boolean;
  created_at: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  date: string;
};

export type NutritionLog = {
  id: string;
  user_id: string;
  date: string;
  meal_label: string;
  description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  created_at: string;
  updated_at: string;
};

export type NutritionTargets = {
  id: string;
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
  updated_at: string;
};

export const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'] as const;

export const SCHEDULE_SLOTS = ['morning', 'lunch', 'evening', 'custom'] as const;

export const SLOT_LABELS: Record<string, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  evening: 'Evening',
  custom: 'Custom time',
};
