import { supabase } from './lib/supabaseClient';
import type { Trip } from './types';

interface TripRow {
  id: string;
  title: string;
  emoji: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  checklist: Trip['checklist'];
  itinerary: Trip['itinerary'];
  lodging: Trip['lodging'];
  notes: string;
  status: Trip['status'];
}

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    destination: row.destination,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    budget: row.budget,
    checklist: row.checklist,
    itinerary: row.itinerary ?? [],
    lodging: row.lodging ?? [],
    notes: row.notes,
    status: row.status,
  };
}

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id, title, emoji, destination, start_date, end_date, budget, checklist, itinerary, lodging, notes, status')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as TripRow[]).map(rowToTrip);
}

export async function createTrip(t: Omit<Trip, 'id'>) {
  return supabase.from('trips').insert({
    title: t.title, emoji: t.emoji, destination: t.destination,
    start_date: t.startDate || null, end_date: t.endDate || null,
    budget: t.budget, checklist: t.checklist,
    itinerary: t.itinerary, lodging: t.lodging, notes: t.notes, status: t.status,
  });
}

export async function updateTripRow(id: string, t: Omit<Trip, 'id'>) {
  return supabase.from('trips').update({
    title: t.title, emoji: t.emoji, destination: t.destination,
    start_date: t.startDate || null, end_date: t.endDate || null,
    budget: t.budget, checklist: t.checklist,
    itinerary: t.itinerary, lodging: t.lodging, notes: t.notes, status: t.status,
  }).eq('id', id);
}

export async function deleteTripRow(id: string) {
  return supabase.from('trips').delete().eq('id', id);
}
