import { supabase } from './lib/supabaseClient';
import type { GratitudeEntry, User } from './types';

type ProfileNames = Record<string, User>;

interface GratitudeRow {
  id: string;
  from_profile_id: string;
  text: string;
  entry_date: string;
}

function rowToEntry(row: GratitudeRow, names: ProfileNames, myName: string): GratitudeEntry {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? myName,
    text: row.text,
    date: row.entry_date,
  };
}

export async function fetchGratitude(names: ProfileNames, myName: string): Promise<GratitudeEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('id, from_profile_id, text, entry_date')
    .order('entry_date', { ascending: false });
  if (error || !data) return [];
  return (data as GratitudeRow[]).map(r => rowToEntry(r, names, myName));
}

export async function createGratitude(fromId: string, text: string, date: string) {
  return supabase.from('gratitude_entries').insert({ from_profile_id: fromId, text, entry_date: date });
}

export async function updateGratitudeRow(id: string, text: string) {
  return supabase.from('gratitude_entries').update({ text }).eq('id', id);
}

export async function deleteGratitudeRow(id: string) {
  return supabase.from('gratitude_entries').delete().eq('id', id);
}
