import { supabase } from './lib/supabaseClient';

export interface ChatMessageRow {
  id: string;
  sender_profile_id: string;
  text: string | null;
  image_url: string | null;
  audio_url: string | null;
  audio_duration: number | null;
  sticker: string | null;
  sticker_image_url: string | null;
  created_at: string;
  read_at: string | null;
}

const SELECT = 'id, sender_profile_id, text, image_url, audio_url, audio_duration, sticker, sticker_image_url, created_at, read_at';

export async function fetchChatMessages(limit = 300): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(SELECT)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as ChatMessageRow[];
}

export interface NewChatMessage {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  sticker?: string;
  stickerImageUrl?: string;
}

export async function sendChatMessageRow(senderProfileId: string, msg: NewChatMessage) {
  return supabase.from('chat_messages').insert({
    sender_profile_id: senderProfileId,
    text: msg.text ?? null,
    image_url: msg.imageUrl ?? null,
    audio_url: msg.audioUrl ?? null,
    audio_duration: msg.audioDuration ?? null,
    sticker: msg.sticker ?? null,
    sticker_image_url: msg.stickerImageUrl ?? null,
  }).select(SELECT).single();
}

// Marks every not-yet-read message from the partner as read — called when
// the chat screen is open and a new message arrives, or right when it mounts.
export async function markChatReadFrom(partnerProfileId: string) {
  return supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('sender_profile_id', partnerProfileId).is('read_at', null);
}

export async function fetchUnreadChatCount(partnerProfileId: string): Promise<number> {
  const { count } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_profile_id', partnerProfileId)
    .is('read_at', null);
  return count ?? 0;
}

// Reuses the same post-images bucket/RLS as feed.ts's uploadPostImage (path-
// prefix scoped, no mime-type restriction) under a chat/ subfolder — covers
// both photos and voice-message audio with zero new bucket or migration.
export async function uploadChatFile(coupleId: string, file: File | Blob, ext: string): Promise<string | null> {
  const path = `${coupleId}/chat/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('post-images').upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}
