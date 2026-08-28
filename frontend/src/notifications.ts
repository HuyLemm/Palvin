import { supabase } from './lib/supabaseClient';
import type { AppNotification } from './types';

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

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, emoji, message, read, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map(r => ({
    id: r.id,
    emoji: r.emoji ?? '🔔',
    message: r.message,
    read: r.read,
    date: formatRelative(r.created_at),
  }));
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead() {
  return supabase.from('notifications').update({ read: true }).eq('read', false);
}
