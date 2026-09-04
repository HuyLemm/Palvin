import { supabase } from './lib/supabaseClient';
import type { CustomSticker, User } from './types';

type ProfileNames = Record<string, User>;

interface CustomStickerRow {
  id: string;
  image_url: string;
  created_by_profile_id: string;
}

export async function fetchCustomStickers(names: ProfileNames, myName: string): Promise<CustomSticker[]> {
  const { data, error } = await supabase
    .from('custom_stickers')
    .select('id, image_url, created_by_profile_id')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as CustomStickerRow[]).map(r => ({
    id: r.id,
    imageUrl: r.image_url,
    createdBy: names[r.created_by_profile_id] ?? myName,
  }));
}

export async function createCustomSticker(createdByProfileId: string, imageUrl: string) {
  return supabase.from('custom_stickers').insert({
    image_url: imageUrl, created_by_profile_id: createdByProfileId,
  }).select('id').single();
}

export async function deleteCustomStickerRow(id: string) {
  return supabase.from('custom_stickers').delete().eq('id', id);
}

// Same bucket/RLS as the other couple-photo uploads, own subfolder.
export async function uploadCustomStickerImage(coupleId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${coupleId}/stickers/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
