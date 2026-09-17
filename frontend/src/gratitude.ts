import { supabase } from './lib/supabaseClient';
import { compressImage } from './lib/imageCompress';
import type { GratitudeEntry, User } from './types';

type ProfileNames = Record<string, User>;

interface GratitudeRow {
  id: string;
  from_profile_id: string;
  text: string;
  entry_date: string;
  image_url: string | null;
}

function rowToEntry(row: GratitudeRow, names: ProfileNames, myName: string): GratitudeEntry {
  return {
    id: row.id,
    from: names[row.from_profile_id] ?? myName,
    text: row.text,
    date: row.entry_date,
    image: row.image_url ?? undefined,
  };
}

export async function fetchGratitude(names: ProfileNames, myName: string): Promise<GratitudeEntry[]> {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('id, from_profile_id, text, entry_date, image_url')
    .order('entry_date', { ascending: false });
  if (error || !data) return [];
  return (data as GratitudeRow[]).map(r => rowToEntry(r, names, myName));
}

export async function createGratitude(fromId: string, text: string, date: string, image?: string) {
  return supabase.from('gratitude_entries').insert({ from_profile_id: fromId, text, entry_date: date, image_url: image || null });
}

export async function updateGratitudeRow(id: string, data: { text: string; image: string | null }) {
  return supabase.from('gratitude_entries').update({ text: data.text, image_url: data.image }).eq('id', id);
}

export async function deleteGratitudeRow(id: string) {
  return supabase.from('gratitude_entries').delete().eq('id', id);
}

// Reuses the post-images bucket/RLS (couple-id-prefixed folders) same as
// memories.ts's uploadMemoryImage and favourites.ts's uploadFavPlaceImage.
export async function uploadGratitudeImage(coupleId: string, file: File): Promise<string | null> {
  const { blob, ext } = await compressImage(file, file.name.split('.').pop() || 'jpg');
  const path = `${coupleId}/gratitude/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, blob);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
