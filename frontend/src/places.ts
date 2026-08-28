import { supabase } from './lib/supabaseClient';
import type { Place } from './types';

interface PlaceRow {
  id: string;
  name: string;
  flag: string | null;
  image_url: string;
  place_memories: { memory_id: string }[];
}

function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    flag: row.flag ?? '',
    image: row.image_url,
    memoryIds: row.place_memories.map(pm => pm.memory_id),
  };
}

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, flag, image_url, place_memories(memory_id)');
  if (error || !data) return [];
  return (data as PlaceRow[]).map(rowToPlace);
}

export async function createPlace(p: { name: string; flag?: string; image: string }) {
  return supabase.from('places').insert({ name: p.name, flag: p.flag || null, image_url: p.image });
}

export async function deletePlaceRow(id: string) {
  return supabase.from('places').delete().eq('id', id);
}
