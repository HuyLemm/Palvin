import { supabase } from './lib/supabaseClient';
import type { PlaylistItem, User } from './types';

type ProfileNames = Record<string, User>;

interface PlaylistRow {
  id: string;
  title: string;
  artist: string;
  emoji: string | null;
  image_url: string | null;
  duration_seconds: number | null;
  release_date: string | null;
  preview_url: string | null;
  note: string | null;
  added_by_profile_id: string;
}

function rowToItem(row: PlaylistRow, names: ProfileNames): PlaylistItem {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    emoji: row.emoji ?? '🎵',
    image: row.image_url ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    releaseDate: row.release_date ?? undefined,
    previewUrl: row.preview_url ?? undefined,
    note: row.note ?? '',
    addedBy: names[row.added_by_profile_id] ?? 'Alvin',
  };
}

export async function fetchPlaylist(names: ProfileNames): Promise<PlaylistItem[]> {
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id, title, artist, emoji, image_url, duration_seconds, release_date, preview_url, note, added_by_profile_id')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as PlaylistRow[]).map(r => rowToItem(r, names));
}

export async function createPlaylistItem(addedByProfileId: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string }) {
  return supabase.from('playlist_items').insert({
    added_by_profile_id: addedByProfileId, title: p.title, artist: p.artist, emoji: p.emoji,
    image_url: p.image || null, duration_seconds: p.durationSeconds ?? null, release_date: p.releaseDate || null,
    preview_url: p.previewUrl || null, note: p.note || null,
  });
}

export async function updatePlaylistItemRow(id: string, p: { title: string; artist: string; emoji: string; image?: string; durationSeconds?: number; releaseDate?: string; previewUrl?: string; note?: string }) {
  return supabase.from('playlist_items').update({
    title: p.title, artist: p.artist, emoji: p.emoji,
    image_url: p.image || null, duration_seconds: p.durationSeconds ?? null, release_date: p.releaseDate || null,
    preview_url: p.previewUrl || null, note: p.note || null,
  }).eq('id', id);
}

export async function deletePlaylistItemRow(id: string) {
  return supabase.from('playlist_items').delete().eq('id', id);
}
