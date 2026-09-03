import { supabase } from './lib/supabaseClient';
import type { User } from './types';

type ProfileNames = Record<string, User>;

export interface ActivityLogEntry {
  id: string;
  actor: User;
  action: 'edit' | 'delete';
  message: string;
  emoji: string;
  createdAt: string;
}

// Every edit/delete trigger writes messages containing one of these English
// verbs (see notify_* functions, translated in migration 0062) — classifying
// by that text is far simpler than adding an `action` column to every one of
// those ~50 trigger functions after the fact, and is good enough for an
// internal audit view.
function classify(message: string): 'edit' | 'delete' | null {
  if (message.includes(' deleted ') || message.includes(' removed ') || message.includes(' unliked ') || message.includes(' unsaved ')) return 'delete';
  if (message.includes(' edited ') || message.includes(' updated ')) return 'edit';
  return null;
}

// Unlike fetchNotifications (the partner-facing bell, which excludes your
// own actions), this pulls every row for the couple — including your own —
// since it's an audit log, not a "tell the other person" feed.
export async function fetchActivityLog(names: ProfileNames, myName: string): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, emoji, message, actor_profile_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  const out: ActivityLogEntry[] = [];
  for (const row of data) {
    const action = classify(row.message);
    if (!action) continue;
    out.push({
      id: row.id,
      actor: row.actor_profile_id ? (names[row.actor_profile_id] ?? myName) : myName,
      action,
      message: row.message,
      emoji: row.emoji ?? (action === 'delete' ? '🗑️' : '✏️'),
      createdAt: row.created_at,
    });
  }
  return out;
}
