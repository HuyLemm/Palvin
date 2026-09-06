import { supabase } from './lib/supabaseClient';
import type { Todo, User } from './types';

type ProfileNames = Record<string, User>;

interface TodoRow {
  id: string;
  created_by_profile_id: string | null;
  owner: string;
  title: string;
  category: string;
  kind: 'daily' | 'once';
  task_date: string | null;
  completed: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// 'daily' tasks have no standing "done" state of their own — completedTodayIds
// (today's rows from todo_daily_completions) is what actually decides it.
function rowToTodo(row: TodoRow, names: ProfileNames, myName: string, completedTodayIds: Set<string>): Todo {
  return {
    id: row.id,
    owner: row.owner,
    title: row.title,
    category: row.category,
    kind: row.kind,
    date: row.task_date ?? undefined,
    completed: row.kind === 'daily' ? completedTodayIds.has(row.id) : row.completed,
    createdBy: row.created_by_profile_id ? (names[row.created_by_profile_id] ?? myName) : 'Both',
  };
}

export async function fetchTodos(names: ProfileNames, myName: string): Promise<Todo[]> {
  const today = todayISO();
  const [todosRes, completionsRes] = await Promise.all([
    supabase.from('todos').select('id, created_by_profile_id, owner, title, category, kind, task_date, completed').order('created_at', { ascending: true }),
    supabase.from('todo_daily_completions').select('todo_id').eq('completion_date', today),
  ]);
  if (todosRes.error || !todosRes.data) return [];
  const completedTodayIds = new Set((completionsRes.data ?? []).map(r => r.todo_id as string));
  return (todosRes.data as TodoRow[]).map(r => rowToTodo(r, names, myName, completedTodayIds));
}

// created_by_profile_id isn't passed — it defaults to auth.uid() in the
// table itself (just an audit field; `owner`, plain text, is the one that
// actually says who the task is for).
export async function createTodo(t: { owner: string; title: string; category: string; kind: 'daily' | 'once'; date?: string }) {
  return supabase.from('todos').insert({
    owner: t.owner, title: t.title, category: t.category, kind: t.kind,
    task_date: t.kind === 'once' ? (t.date || todayISO()) : null,
  });
}

export async function updateTodoRow(id: string, t: { owner: string; title: string; category: string; date?: string }) {
  return supabase.from('todos').update({
    owner: t.owner, title: t.title, category: t.category, task_date: t.date || null,
  }).eq('id', id);
}

// 'once': flips the row's own persisted flag. 'daily': adds/removes today's
// completion row instead — the task itself has no persisted done state.
export async function setTodoCompletedRow(todo: Todo, completed: boolean) {
  if (todo.kind === 'once') {
    return supabase.from('todos').update({ completed }).eq('id', todo.id);
  }
  if (completed) {
    return supabase.from('todo_daily_completions').insert({ todo_id: todo.id, completion_date: todayISO() });
  }
  return supabase.from('todo_daily_completions').delete().eq('todo_id', todo.id).eq('completion_date', todayISO());
}

export async function deleteTodoRow(id: string) {
  return supabase.from('todos').delete().eq('id', id);
}
