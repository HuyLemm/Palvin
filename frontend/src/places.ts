import { supabase } from './lib/supabaseClient';
import { compressImage } from './lib/imageCompress';
import type { Place } from './types';

interface PlaceRow {
  id: string;
  name: string;
  flag: string | null;
  images: string[] | null;
  visited_date: string | null;
  place_memories: { memory_id: string }[];
}

function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    flag: row.flag ?? '',
    images: row.images ?? [],
    visitedDate: row.visited_date ?? undefined,
    memoryIds: row.place_memories.map(pm => pm.memory_id),
  };
}

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, flag, images, visited_date, place_memories(memory_id)');
  if (error || !data) return [];
  return (data as PlaceRow[]).map(rowToPlace);
}

export async function createPlace(p: { name: string; flag?: string; images: string[]; visitedDate?: string }) {
  return supabase.from('places').insert({ name: p.name, flag: p.flag || null, images: p.images, visited_date: p.visitedDate || null });
}

export async function updatePlaceRow(id: string, p: { name: string; flag?: string; images: string[]; visitedDate?: string }) {
  return supabase.from('places').update({ name: p.name, flag: p.flag || null, images: p.images, visited_date: p.visitedDate || null }).eq('id', id);
}

export async function deletePlaceRow(id: string) {
  return supabase.from('places').delete().eq('id', id);
}

// Reuses the same `post-images` bucket/RLS as feed.ts's uploadPostImage —
// its policy only checks the couple-id folder prefix, so a `places/`
// subfolder is already covered without any new bucket or migration.
export async function uploadPlaceImage(coupleId: string, file: File): Promise<string | null> {
  const { blob, ext } = await compressImage(file, file.name.split('.').pop() || 'jpg');
  const path = `${coupleId}/places/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, blob);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
