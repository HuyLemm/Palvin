import { supabase } from './lib/supabaseClient';
import type { CycleLog } from './types';

interface CycleLogRow {
  id: string;
  start_date: string;
  end_date: string | null;
}

function rowToCycleLog(row: CycleLogRow): CycleLog {
  return { id: row.id, startDate: row.start_date, endDate: row.end_date ?? undefined };
}

export async function fetchCycleLogs(): Promise<CycleLog[]> {
  const { data, error } = await supabase
    .from('cycle_logs')
    .select('id, start_date, end_date')
    .order('start_date', { ascending: true });
  if (error || !data) return [];
  return (data as CycleLogRow[]).map(rowToCycleLog);
}

export async function createCycleLog(l: { startDate: string; endDate?: string }) {
  return supabase.from('cycle_logs').insert({ start_date: l.startDate, end_date: l.endDate || null });
}

export async function updateCycleLogRow(id: string, l: { startDate: string; endDate?: string }) {
  return supabase.from('cycle_logs').update({ start_date: l.startDate, end_date: l.endDate || null }).eq('id', id);
}

export async function deleteCycleLogRow(id: string) {
  return supabase.from('cycle_logs').delete().eq('id', id);
}
