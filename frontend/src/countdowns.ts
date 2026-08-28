import { supabase } from './lib/supabaseClient';
import type { Countdown } from './types';

interface CountdownRow {
  id: string;
  title: string;
  emoji: string;
  event_date: string;
  color: string;
}

function rowToCountdown(row: CountdownRow): Countdown {
  return { id: row.id, title: row.title, emoji: row.emoji, date: row.event_date, color: row.color };
}

export async function fetchCountdowns(): Promise<Countdown[]> {
  const { data, error } = await supabase
    .from('countdowns')
    .select('id, title, emoji, event_date, color')
    .order('event_date', { ascending: true });
  if (error || !data) return [];
  return (data as CountdownRow[]).map(rowToCountdown);
}

export async function createCountdown(c: Omit<Countdown, 'id'>) {
  return supabase.from('countdowns').insert({ title: c.title, emoji: c.emoji, event_date: c.date, color: c.color });
}

export async function deleteCountdownRow(id: string) {
  return supabase.from('countdowns').delete().eq('id', id);
}
