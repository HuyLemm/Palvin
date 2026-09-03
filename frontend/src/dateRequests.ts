import { supabase } from './lib/supabaseClient';
import type { DateRequest, User } from './types';

type ProfileNames = Record<string, User>;

interface DateRequestRow {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  category: string;
  category_emoji: string;
  activity: string;
  location: string;
  request_date: string;
  request_time: string;
  reason: string;
  status: DateRequest['status'];
  response_note: string;
  created_at: string;
  responded_at: string | null;
}

function rowToRequest(row: DateRequestRow, names: ProfileNames, myName: string, partnerName: string): DateRequest {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? myName,
    to: names[row.to_profile_id] ?? partnerName,
    category: row.category,
    categoryEmoji: row.category_emoji,
    activity: row.activity,
    location: row.location,
    date: row.request_date,
    time: row.request_time.slice(0, 5), // Postgres returns "HH:MM:SS"
    reason: row.reason,
    status: row.status,
    responseNote: row.response_note,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
  };
}

export async function fetchDateRequests(names: ProfileNames, myName: string, partnerName: string): Promise<DateRequest[]> {
  const { data, error } = await supabase
    .from('date_requests')
    .select('id, from_profile_id, to_profile_id, category, category_emoji, activity, location, request_date, request_time, reason, status, response_note, created_at, responded_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as DateRequestRow[]).map(r => rowToRequest(r, names, myName, partnerName));
}

export async function createDateRequest(
  fromId: string, toId: string,
  req: { category: string; categoryEmoji: string; activity: string; location: string; date: string; time: string; reason: string },
) {
  return supabase.from('date_requests').insert({
    from_profile_id: fromId, to_profile_id: toId,
    category: req.category, category_emoji: req.categoryEmoji, activity: req.activity, location: req.location,
    request_date: req.date, request_time: req.time, reason: req.reason,
  });
}

export async function respondToDateRequest(id: string, status: 'approved' | 'rejected', note: string) {
  return supabase.from('date_requests').update({
    status, response_note: note, responded_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function updateDateRequestRow(
  id: string,
  req: { category: string; categoryEmoji: string; activity: string; location: string; date: string; time: string; reason: string },
) {
  return supabase.from('date_requests').update({
    category: req.category, category_emoji: req.categoryEmoji, activity: req.activity,
    location: req.location, request_date: req.date, request_time: req.time, reason: req.reason,
  }).eq('id', id);
}

export async function deleteDateRequestRow(id: string) {
  return supabase.from('date_requests').delete().eq('id', id);
}
