export type Habit = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  type: 'positive' | 'negative';
  frequency: string;
  active_days: number[];
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'anytime' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitStreak = {
  id: string;
  user_id: string;
  habit_id: string;
  current_streak: number;
  longest_streak: number;
  streak_freezes_used: number;
  total_freezes_used_year: number;
  last_completed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type FreezeDay = {
  id: string;
  user_id: string;
  date: string;
  reason: string | null;
  is_total_freeze: boolean;
  created_at: string;
  updated_at: string;
};

export const CATEGORIES = ['health', 'training', 'mental', 'business', 'personal'] as const;
export const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
