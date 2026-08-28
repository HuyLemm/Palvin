import { supabase } from './lib/supabaseClient';
import type { Expense, Bill, SavingsGoal, User } from './types';

type ProfileNames = Record<string, User>;

/* ── Expenses ── */

interface ExpenseRow {
  id: string;
  title: string;
  category: string;
  category_emoji: string;
  amount: number;
  paid_by_profile_id: string | null;
  occurred_on: string;
  note: string | null;
  type: 'expense' | 'income';
}

function rowToExpense(row: ExpenseRow, names: ProfileNames): Expense {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryEmoji: row.category_emoji,
    amount: Number(row.amount),
    paidBy: row.paid_by_profile_id ? (names[row.paid_by_profile_id] ?? 'Alvin') : 'Both',
    date: row.occurred_on,
    note: row.note ?? '',
    type: row.type,
  };
}

export async function fetchExpenses(names: ProfileNames): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, title, category, category_emoji, amount, paid_by_profile_id, occurred_on, note, type')
    .order('occurred_on', { ascending: false });
  if (error || !data) return [];
  return (data as ExpenseRow[]).map(r => rowToExpense(r, names));
}

export async function createExpense(
  paidByProfileId: string | null,
  e: { title: string; category: string; categoryEmoji: string; amount: number; date: string; note?: string; type?: 'expense' | 'income' },
) {
  return supabase.from('expenses').insert({
    title: e.title,
    category: e.category,
    category_emoji: e.categoryEmoji,
    amount: e.amount,
    paid_by_profile_id: paidByProfileId,
    occurred_on: e.date,
    note: e.note || null,
    type: e.type ?? 'expense',
  });
}

export async function deleteExpenseRow(id: string) {
  return supabase.from('expenses').delete().eq('id', id);
}

/* ── Bills ── */

interface BillRow {
  id: string;
  title: string;
  emoji: string | null;
  category: Bill['category'];
  amount: number;
  due_day: number;
  paid: boolean;
  paid_date: string | null;
  reminder: boolean;
  note: string | null;
}

function rowToBill(row: BillRow): Bill {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? '',
    category: row.category,
    amount: Number(row.amount),
    dueDay: row.due_day,
    paid: row.paid,
    paidDate: row.paid_date ?? undefined,
    reminder: row.reminder,
    note: row.note ?? undefined,
  };
}

export async function fetchBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('id, title, emoji, category, amount, due_day, paid, paid_date, reminder, note')
    .order('due_day', { ascending: true });
  if (error || !data) return [];
  return (data as BillRow[]).map(rowToBill);
}

export async function createBill(b: Omit<Bill, 'id'>) {
  return supabase.from('bills').insert({
    title: b.title,
    emoji: b.emoji,
    category: b.category,
    amount: b.amount,
    due_day: b.dueDay,
    paid: b.paid,
    paid_date: b.paidDate ?? null,
    reminder: b.reminder,
    note: b.note ?? null,
  });
}

export async function setBillPaid(id: string, paid: boolean, paidDate: string | null) {
  return supabase.from('bills').update({ paid, paid_date: paidDate }).eq('id', id);
}

export async function deleteBillRow(id: string) {
  return supabase.from('bills').delete().eq('id', id);
}

export async function setBillReminder(id: string, reminder: boolean) {
  return supabase.from('bills').update({ reminder }).eq('id', id);
}

/* ── Savings goals ── */

interface GoalRow {
  id: string;
  title: string;
  emoji: string | null;
  current: number;
  target: number;
  deadline: string | null;
}

function rowToGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji ?? '',
    current: Number(row.current),
    target: Number(row.target),
    deadline: row.deadline ?? '',
  };
}

export async function fetchSavingsGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('id, title, emoji, current, target, deadline')
    .order('deadline', { ascending: true });
  if (error || !data) return [];
  return (data as GoalRow[]).map(rowToGoal);
}

export async function createSavingsGoal(g: Omit<SavingsGoal, 'id'>) {
  return supabase.from('savings_goals').insert({
    title: g.title, emoji: g.emoji, current: g.current, target: g.target, deadline: g.deadline,
  });
}

export async function updateSavingsGoalCurrent(id: string, current: number) {
  return supabase.from('savings_goals').update({ current }).eq('id', id);
}
