import { supabase } from './lib/supabaseClient';
import type { FavCategory, FavPlace } from './types';

export interface Favorites {
  song: string;
  food: string;
  movie: string;
  cafe: string;
  place: string;
}

const FAV_COLUMNS: Record<keyof Favorites, string> = {
  song: 'favorite_song',
  food: 'favorite_food',
  movie: 'favorite_movie',
  cafe: 'favorite_cafe',
  place: 'favorite_place',
};

export async function fetchCoupleSettings(coupleId: string): Promise<{ favorites: Favorites; darkMode: boolean; relationshipStart: string | null } | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('favorite_song, favorite_food, favorite_movie, favorite_cafe, favorite_place, dark_mode, relationship_start')
    .eq('id', coupleId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    favorites: {
      song: data.favorite_song ?? '',
      food: data.favorite_food ?? '',
      movie: data.favorite_movie ?? '',
      cafe: data.favorite_cafe ?? '',
      place: data.favorite_place ?? '',
    },
    darkMode: !!data.dark_mode,
    relationshipStart: data.relationship_start ?? null,
  };
}

export async function updateFavoriteField(coupleId: string, key: string, value: string) {
  const column = FAV_COLUMNS[key as keyof Favorites];
  if (!column) return { error: new Error(`Unknown favorite key: ${key}`) };
  return supabase.from('couples').update({ [column]: value }).eq('id', coupleId);
}

export async function updateDarkMode(coupleId: string, darkMode: boolean) {
  return supabase.from('couples').update({ dark_mode: darkMode }).eq('id', coupleId);
}

export async function updateRelationshipStart(coupleId: string, date: string) {
  return supabase.from('couples').update({ relationship_start: date }).eq('id', coupleId);
}

interface FavPlaceRow {
  id: string;
  category: FavCategory;
  name: string;
  note: string | null;
}

export async function fetchFavPlaces(): Promise<Record<FavCategory, FavPlace[]>> {
  const result: Record<FavCategory, FavPlace[]> = { food: [], cafe: [], bida: [], gaming: [] };
  const { data, error } = await supabase.from('fav_places').select('id, category, name, note');
  if (error || !data) return result;
  for (const row of data as FavPlaceRow[]) {
    result[row.category].push({ id: row.id, name: row.name, note: row.note ?? undefined });
  }
  return result;
}

export async function createFavPlace(category: FavCategory, place: { name: string; note?: string }) {
  return supabase.from('fav_places').insert({ category, name: place.name, note: place.note || null });
}

export async function deleteFavPlace(id: string) {
  return supabase.from('fav_places').delete().eq('id', id);
}
