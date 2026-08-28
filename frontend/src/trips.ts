import { supabase } from './lib/supabaseClient';
import type { Trip } from './types';

interface TripRow {
  id: string;
  title: string;
  emoji: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  checklist: Trip['checklist'];
  notes: string;
  status: Trip['status'];
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: row.budget,
    spent: row.spent,
    checklist: row.checklist,
    notes: row.notes,
    status: row.status,
  };
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, emoji, destination, start_date, end_date, budget, spent, checklist, notes, status')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as TripRow[]).map(rowToTrip);
}

export async function createTrip(t: Omit<Trip, 'id'>) {
  return supabase.from('trips').insert({
    title: t.title, emoji: t.emoji, destination: t.destination,
    start_date: t.startDate, end_date: t.endDate,
    budget: t.budget, spent: t.spent, checklist: t.checklist, notes: t.notes, status: t.status,
  });
}

export async function updateTripRow(id: string, t: Omit<Trip, 'id'>) {
  return supabase.from('trips').update({
    title: t.title, emoji: t.emoji, destination: t.destination,
    start_date: t.startDate, end_date: t.endDate,
    budget: t.budget, spent: t.spent, checklist: t.checklist, notes: t.notes, status: t.status,
  }).eq('id', id);
}

export async function deleteTripRow(id: string) {
  return supabase.from('trips').delete().eq('id', id);
}
