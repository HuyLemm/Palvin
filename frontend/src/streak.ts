import { supabase } from './lib/supabaseClient';

export interface StreakInfo {
  count: number;
  // True once couples.streak_last_active === today (UTC — matches Postgres's
  // current_date, which is what mark_active_today() compares against), i.e.
  // both partners have already qualified today and the flame can light up.
  litToday: boolean;
}

export async function fetchStreak(): Promise<StreakInfo> {
  const { data, error } = await supabase.from('couples').select('streak_count, streak_last_active').single();
  if (error || !data) return { count: 0, litToday: false };
  const today = new Date().toISOString().slice(0, 10);
  return { count: (data.streak_count as number) ?? 0, litToday: data.streak_last_active === today };
}

export async function markActiveToday(): Promise<number | null> {
  const { data, error } = await supabase.rpc('mark_active_today');
  if (error || typeof data !== 'number') return null;
  return data;
}
