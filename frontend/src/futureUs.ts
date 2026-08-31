import { supabase } from './lib/supabaseClient';
import type { Goal, User } from './types';

type ProfileNames = Record<string, User>;

interface GoalRow {
  id: string;
  title: string;
  emoji: string | null;
  completed: boolean;
  completed_date: string | null;
  target: number | null;
  current: number;
  deadline: string | null;
  owner_profile_id: string | null;
}

function rowToGoal(row: GoalRow, names: ProfileNames): Goal {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? '',
    completed: row.completed,
    completedDate: row.completed_date ?? undefined,
    target: row.target ?? undefined,
    current: row.target != null ? row.current : undefined,
    deadline: row.deadline ?? undefined,
    owner: row.owner_profile_id ? (names[row.owner_profile_id] ?? 'both') : 'both',
  };
}

export async function fetchGoals(names: ProfileNames): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, emoji, completed, completed_date, target, current, deadline, owner_profile_id')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as GoalRow[]).map(r => rowToGoal(r, names));
}

export async function createGoal(g: { title: string; emoji: string; target?: number; deadline?: string; ownerId: string | null }) {
  return supabase.from('goals').insert({ title: g.title, emoji: g.emoji, target: g.target ?? null, deadline: g.deadline || null, owner_profile_id: g.ownerId });
}

export async function setGoalCompleted(id: string, completed: boolean, completedDate: string | null) {
  return supabase.from('goals').update({ completed, completed_date: completedDate }).eq('id', id);
}

export async function setGoalCurrent(id: string, current: number) {
  return supabase.from('goals').update({ current }).eq('id', id);
}

export async function updateGoalRow(id: string, g: { title: string; emoji: string; target?: number; deadline?: string; ownerId: string | null }) {
  return supabase.from('goals').update({ title: g.title, emoji: g.emoji, target: g.target ?? null, deadline: g.deadline || null, owner_profile_id: g.ownerId }).eq('id', id);
}

export async function deleteGoalRow(id: string) {
  return supabase.from('goals').delete().eq('id', id);
}
