import { supabase } from './lib/supabaseClient';
import type { CalendarEvent } from './types';

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  category: CalendarEvent['category'];
  location: string | null;
  notes: string | null;
}

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    time: row.event_time ? row.event_time.slice(0, 5) : '', // Postgres returns "HH:MM:SS"
    category: row.category,
    location: row.location ?? '',
    notes: row.notes ?? '',
  };
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, event_date, event_time, category, location, notes')
    .order('event_date', { ascending: true });
  if (error || !data) return [];
  return (data as EventRow[]).map(rowToEvent);
}

export async function createEvent(e: Omit<CalendarEvent, 'id'>) {
  return supabase.from('calendar_events').insert({
    title: e.title,
    event_date: e.date,
    event_time: e.time || null,
    category: e.category,
    location: e.location || null,
    notes: e.notes || null,
  });
}

export async function updateEventRow(id: string, e: Omit<CalendarEvent, 'id'>) {
  return supabase.from('calendar_events').update({
    title: e.title,
    event_date: e.date,
    event_time: e.time || null,
    category: e.category,
    location: e.location || null,
    notes: e.notes || null,
  }).eq('id', id);
}

export async function deleteEventRow(id: string) {
  return supabase.from('calendar_events').delete().eq('id', id);
}
