import { supabase } from './lib/supabaseClient';
import type { PlaylistItem, User } from './types';

type ProfileNames = Record<string, User>;

interface PlaylistRow {
  id: string;
  title: string;
  artist: string;
  emoji: string | null;
  note: string | null;
  added_by_profile_id: string;
}

function rowToItem(row: PlaylistRow, names: ProfileNames): PlaylistItem {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    emoji: row.emoji ?? '🎵',
    note: row.note ?? '',
    addedBy: names[row.added_by_profile_id] ?? 'Alvin',
  };
}

export async function fetchPlaylist(names: ProfileNames): Promise<PlaylistItem[]> {
  const { data, error } = await supabase
    .from('playlist_items')
    .select('id, title, artist, emoji, note, added_by_profile_id')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as PlaylistRow[]).map(r => rowToItem(r, names));
}

export async function createPlaylistItem(addedByProfileId: string, p: { title: string; artist: string; emoji: string; note?: string }) {
  return supabase.from('playlist_items').insert({
    added_by_profile_id: addedByProfileId, title: p.title, artist: p.artist, emoji: p.emoji, note: p.note || null,
  });
}

export async function deletePlaylistItemRow(id: string) {
  return supabase.from('playlist_items').delete().eq('id', id);
}
