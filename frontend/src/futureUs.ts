import { supabase } from './lib/supabaseClient';
import type { Goal } from './types';

interface GoalRow {
  id: string;
  title: string;
  emoji: string | null;
  completed: boolean;
  completed_date: string | null;
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? '',
    completed: row.completed,
    completedDate: row.completed_date ?? undefined,
  };
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('id, title, emoji, completed, completed_date')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as GoalRow[]).map(rowToGoal);
}

export async function createGoal(g: { title: string; emoji: string }) {
  return supabase.from('goals').insert({ title: g.title, emoji: g.emoji });
}

export async function setGoalCompleted(id: string, completed: boolean, completedDate: string | null) {
  return supabase.from('goals').update({ completed, completed_date: completedDate }).eq('id', id);
}

export async function deleteGoalRow(id: string) {
  return supabase.from('goals').delete().eq('id', id);
}
