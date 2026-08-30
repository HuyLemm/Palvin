import { supabase } from './lib/supabaseClient';
import type { Memory, User } from './types';

type ProfileNames = Record<string, User>;

interface MemoryRow {
  id: string;
  title: string;
  occurred_on: string;
  location: string | null;
  description: string | null;
  image_url: string;
  favorite: boolean;
  people: string[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function rowToMemory(row: MemoryRow, names: ProfileNames): Memory {
  const d = new Date(row.occurred_on);
  return {
    id: row.id,
    title: row.title,
    date: formatDate(row.occurred_on),
    year: d.getFullYear(),
    location: row.location ?? '',
    description: row.description ?? '',
    image: row.image_url,
    favorite: row.favorite,
    people: row.people.map(pid => names[pid]).filter((n): n is User => !!n),
  };
}

export async function fetchMemories(names: ProfileNames): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('id, title, occurred_on, location, description, image_url, favorite, people')
    .order('occurred_on', { ascending: false });
  if (error || !data) return [];
  return (data as MemoryRow[]).map(r => rowToMemory(r, names));
}

export async function createMemory(
  addedByProfileId: string,
  peopleIds: string[],
  data: { title: string; occurredOn: string; location?: string; description?: string; image: string },
) {
  return supabase.from('memories').insert({
    added_by_profile_id: addedByProfileId,
    title: data.title,
    occurred_on: data.occurredOn,
    location: data.location || null,
    description: data.description || null,
    image_url: data.image,
    people: peopleIds,
  });
}

export async function setMemoryFavorite(id: string, favorite: boolean) {
  return supabase.from('memories').update({ favorite }).eq('id', id);
}

// Reuses the same `post-images` bucket/RLS as feed.ts's uploadPostImage —
// its policy only checks the couple-id folder prefix, so a `memories/`
// subfolder is already covered without any new bucket or migration.
export async function uploadMemoryImage(coupleId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${coupleId}/memories/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
