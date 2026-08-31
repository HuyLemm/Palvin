import { supabase } from './lib/supabaseClient';
import type { FavCategory, FavCategoryItem, FavPlace } from './types';

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

// The original 4 built-in tabs, seeded per-couple into fav_categories the
// first time fetchFavCategories sees zero rows for them — from then on
// they're just regular rows, editable/deletable like any category the user
// adds themselves.
const DEFAULT_CATEGORIES: { label: string; emoji: string; color: string }[] = [
  { label: 'Ăn uống', emoji: '🍜', color: '#E8844A' },
  { label: 'Cafe',    emoji: '☕', color: '#C48A52' },
  { label: 'Bida',    emoji: '🎱', color: '#4A8AE8' },
  { label: 'Gaming',  emoji: '🎮', color: '#8B6FD4' },
];

interface FavCategoryRow {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export async function fetchFavCategories(): Promise<FavCategoryItem[]> {
  const { data, error } = await supabase
    .from('fav_categories')
    .select('id, label, emoji, color')
    .order('created_at', { ascending: true });
  if (error) return [];
  if (data && data.length > 0) return data as FavCategoryRow[];

  // upsert + ignoreDuplicates (backed by the couple_id+label unique
  // constraint) rather than a plain insert — two concurrent first-time
  // fetches both seeing an empty table would otherwise both insert the
  // defaults and leave the couple with 8 duplicated categories.
  const { error: seedError } = await supabase
    .from('fav_categories')
    .upsert(DEFAULT_CATEGORIES, { onConflict: 'couple_id,label', ignoreDuplicates: true });
  if (seedError) return [];
  const { data: seeded } = await supabase
    .from('fav_categories')
    .select('id, label, emoji, color')
    .order('created_at', { ascending: true });
  return (seeded as FavCategoryRow[] | null) ?? [];
}

export async function createFavCategory(cat: { label: string; emoji: string; color: string }) {
  return supabase.from('fav_categories').insert(cat).select('id, label, emoji, color').single();
}

export async function updateFavCategoryRow(id: string, cat: { label: string; emoji: string; color: string }) {
  return supabase.from('fav_categories').update(cat).eq('id', id);
}

// Cascades: deleting a category deletes every place filed under it too
// (fav_places.category_id references fav_categories on delete cascade).
export async function deleteFavCategoryRow(id: string) {
  return supabase.from('fav_categories').delete().eq('id', id);
}

interface FavPlaceRow {
  id: string;
  category_id: string;
  name: string;
  note: string | null;
  image_url: string | null;
}

export async function fetchFavPlaces(): Promise<Record<FavCategory, FavPlace[]>> {
  const result: Record<FavCategory, FavPlace[]> = {};
  const { data, error } = await supabase.from('fav_places').select('id, category_id, name, note, image_url');
  if (error || !data) return result;
  for (const row of data as FavPlaceRow[]) {
    (result[row.category_id] ??= []).push({ id: row.id, name: row.name, note: row.note ?? undefined, image: row.image_url ?? undefined });
  }
  return result;
}

export async function createFavPlace(categoryId: FavCategory, place: { name: string; note?: string; image?: string }) {
  return supabase.from('fav_places').insert({ category_id: categoryId, name: place.name, note: place.note || null, image_url: place.image || null });
}

export async function updateFavPlaceRow(id: string, place: { name: string; note?: string; image?: string }) {
  return supabase.from('fav_places').update({ name: place.name, note: place.note || null, image_url: place.image || null }).eq('id', id);
}

export async function deleteFavPlace(id: string) {
  return supabase.from('fav_places').delete().eq('id', id);
}

// Reuses the same post-images bucket/RLS as feed.ts's uploadPostImage — its
// policy only checks the couple-id folder prefix, so a fav-places/ subfolder
// is covered with zero new bucket or migration.
export async function uploadFavPlaceImage(coupleId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${coupleId}/fav-places/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
