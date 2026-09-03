import { supabase } from './lib/supabaseClient';
import type { MoodEntry, User } from './types';

type ProfileNames = Record<string, User>;

interface MoodRow {
  profile_id: string;
  entry_date: string;
  emoji: string;
  label: string;
}

function rowsToHistory(rows: MoodRow[], names: ProfileNames): MoodEntry[] {
  const byDate = new Map<string, MoodEntry>();
  for (const row of rows) {
    const user = names[row.profile_id];
    if (!user) continue;
    const entry = byDate.get(row.entry_date) ?? { date: row.entry_date, moods: {} };
    entry.moods[user] = { emoji: row.emoji, label: row.label };
    byDate.set(row.entry_date, entry);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchMoodHistory(names: ProfileNames): Promise<MoodEntry[]> {
  const { data, error } = await supabase
    .from('mood_entries')
    .select('profile_id, entry_date, emoji, label')
    .order('entry_date', { ascending: true });
  if (error || !data) return [];
  return rowsToHistory(data as MoodRow[], names);
}

export async function upsertMood(profileId: string, emoji: string, label: string) {
  const today = new Date().toISOString().slice(0, 10);
  return supabase.from('mood_entries')
    .upsert({ profile_id: profileId, entry_date: today, emoji, label }, { onConflict: 'profile_id,entry_date' });
}
