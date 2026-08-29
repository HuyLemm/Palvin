import { supabase } from './lib/supabaseClient';
import type { AppNotification, User } from './types';

type ProfileNames = Record<string, User>;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export async function fetchNotifications(names: ProfileNames, myId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, emoji, message, read, created_at, actor_profile_id, target_screen, target_id, preview_image_url, preview_text')
    // The actor already knows what they just did (they got their own local
    // toast at the time) — this feed is only for telling the OTHER person.
    .neq('actor_profile_id', myId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    emoji: r.emoji ?? '🔔',
    message: r.message,
    read: r.read,
    date: formatRelative(r.created_at),
    createdAt: r.created_at,
    actor: r.actor_profile_id ? names[r.actor_profile_id] : undefined,
    targetScreen: r.target_screen ?? undefined,
    targetId: r.target_id ?? undefined,
    previewImageUrl: r.preview_image_url ?? undefined,
    previewText: r.preview_text ?? undefined,
  }));
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead() {
  return supabase.from('notifications').update({ read: true }).eq('read', false);
}

export async function deleteNotificationRow(id: string) {
  return supabase.from('notifications').delete().eq('id', id);
}
