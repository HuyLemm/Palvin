import { supabase } from './lib/supabaseClient';
import type { LoveNote, LoveLetter, SecretNote, User } from './types';

type ProfileNames = Record<string, User>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ── Love notes ── */

interface LoveNoteRow {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  message: string;
  mood: string | null;
  read: boolean;
  created_at: string;
}

function rowToLoveNote(row: LoveNoteRow, names: ProfileNames): LoveNote {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? 'Alvin',
    to: names[row.to_profile_id] ?? 'Paoi',
    message: row.message,
    date: formatDate(row.created_at),
    mood: row.mood ?? '💕',
    read: row.read,
  };
}

export async function fetchLoveNotes(names: ProfileNames): Promise<LoveNote[]> {
  const { data, error } = await supabase
    .from('love_notes')
    .select('id, from_profile_id, to_profile_id, message, mood, read, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as LoveNoteRow[]).map(r => rowToLoveNote(r, names));
}

export async function createLoveNote(fromId: string, toId: string, message: string, mood: string) {
  return supabase.from('love_notes').insert({ from_profile_id: fromId, to_profile_id: toId, message, mood });
}

export async function markLoveNoteRead(id: string) {
  return supabase.from('love_notes').update({ read: true }).eq('id', id);
}

/* ── Love letters ── */

interface LoveLetterRow {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  title: string;
  body: string;
  stationery: string;
  font: string;
  created_at: string;
}

function rowToLoveLetter(row: LoveLetterRow, names: ProfileNames): LoveLetter {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? 'Alvin',
    to: names[row.to_profile_id] ?? 'Paoi',
    title: row.title,
    body: row.body,
    date: formatDate(row.created_at),
    stationery: row.stationery,
    font: row.font,
  };
}

export async function fetchLoveLetters(names: ProfileNames): Promise<LoveLetter[]> {
  const { data, error } = await supabase
    .from('love_letters')
    .select('id, from_profile_id, to_profile_id, title, body, stationery, font, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as LoveLetterRow[]).map(r => rowToLoveLetter(r, names));
}

export async function createLoveLetter(
  fromId: string, toId: string, data: { title: string; body: string; stationery: string; font: string },
) {
  return supabase.from('love_letters').insert({
    from_profile_id: fromId, to_profile_id: toId, title: data.title, body: data.body, stationery: data.stationery, font: data.font,
  });
}

export async function deleteLoveLetterRow(id: string) {
  return supabase.from('love_letters').delete().eq('id', id);
}

/* ── Secret notes ── */

interface SecretNoteRow {
  id: string;
  from_profile_id: string;
  message: string;
  unlock_date: string;
}

function rowToSecretNote(row: SecretNoteRow, names: ProfileNames): SecretNote {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? 'Alvin',
    message: row.message,
    unlockDate: row.unlock_date,
  };
}

export async function fetchSecretNotes(names: ProfileNames): Promise<SecretNote[]> {
  const { data, error } = await supabase
    .from('secret_notes')
    .select('id, from_profile_id, message, unlock_date')
    .order('unlock_date', { ascending: true });
  if (error || !data) return [];
  return (data as SecretNoteRow[]).map(r => rowToSecretNote(r, names));
}

export async function createSecretNote(fromId: string, message: string, unlockDate: string) {
  return supabase.from('secret_notes').insert({ from_profile_id: fromId, message, unlock_date: unlockDate });
}
