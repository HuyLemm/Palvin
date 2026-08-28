import { supabase } from './lib/supabaseClient';

export async function bumpStreak(): Promise<number> {
  const { data, error } = await supabase.rpc('bump_streak');
  if (error || typeof data !== 'number') return 0;
  return data;
}
