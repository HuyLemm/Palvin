import { supabase } from './lib/supabaseClient';
import type { PrivateExpense, PrivateJar } from './types';

// Private Stash — a personal stash, private to whichever account is logged
// in (RLS-scoped by profile_id = auth.uid(), not couple_id — see
// 0085_private_quy_den.sql/0086_private_jars_multi.sql). The app only ever
// surfaces this to Alvinne's account (gated by isAdmin in Money.tsx), but
// the privacy itself lives at the database level, not just in the UI.

interface PrivateExpenseRow {
  id: string;
  title: string;
  category: string;
  category_emoji: string;
  amount: number;
  occurred_on: string;
  note: string | null;
  type: 'expense' | 'income';
}

function rowToPrivateExpense(row: PrivateExpenseRow): PrivateExpense {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryEmoji: row.category_emoji,
    amount: Number(row.amount),
    date: row.occurred_on,
    note: row.note ?? '',
    type: row.type,
  };
}

export async function fetchPrivateExpenses(): Promise<PrivateExpense[]> {
  const { data, error } = await supabase
    .from('private_expenses')
    .select('id, title, category, category_emoji, amount, occurred_on, note, type')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as PrivateExpenseRow[]).map(rowToPrivateExpense);
}

export async function createPrivateExpense(e: { title: string; category: string; categoryEmoji: string; amount: number; date: string; note?: string; type?: 'expense' | 'income' }) {
  return supabase.from('private_expenses').insert({
    title: e.title,
    category: e.category,
    category_emoji: e.categoryEmoji,
    amount: e.amount,
    occurred_on: e.date,
    note: e.note || null,
    type: e.type ?? 'expense',
  });
}

export async function deletePrivateExpenseRow(id: string) {
  return supabase.from('private_expenses').delete().eq('id', id);
}

interface PrivateJarRow {
  id: string;
  title: string;
  emoji: string;
  target: number | null;
  current: number;
}

function rowToPrivateJar(row: PrivateJarRow): PrivateJar {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    target: row.target != null ? Number(row.target) : undefined,
    current: Number(row.current),
  };
}

export async function fetchPrivateJars(): Promise<PrivateJar[]> {
  const { data, error } = await supabase
    .from('private_jars')
    .select('id, title, emoji, target, current')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as PrivateJarRow[]).map(rowToPrivateJar);
}

export async function createPrivateJar(j: { title: string; emoji: string; target?: number }) {
  return supabase.from('private_jars').insert({ title: j.title, emoji: j.emoji, target: j.target ?? null });
}

export async function updatePrivateJarRow(id: string, j: { title: string; emoji: string; target?: number }) {
  return supabase.from('private_jars').update({ title: j.title, emoji: j.emoji, target: j.target ?? null }).eq('id', id);
}

export async function setPrivateJarCurrentRow(id: string, next: number) {
  return supabase.from('private_jars').update({ current: next }).eq('id', id);
}

export async function deletePrivateJarRow(id: string) {
  return supabase.from('private_jars').delete().eq('id', id);
}
