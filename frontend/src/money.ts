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

function rowToExpense(row: ExpenseRow, names: ProfileNames, myName: string): Expense {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryEmoji: row.category_emoji,
    amount: Number(row.amount),
    paidBy: row.paid_by_profile_id ? (names[row.paid_by_profile_id] ?? myName) : 'Both',
    date: row.occurred_on,
    note: row.note ?? '',
    type: row.type,
  };
}

export async function fetchExpenses(names: ProfileNames, myName: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, title, category, category_emoji, amount, paid_by_profile_id, occurred_on, note, type')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as ExpenseRow[]).map(r => rowToExpense(r, names, myName));
}

export async function createExpense(
  paidByProfileId: string | null,
  e: { title: string; category: string; categoryEmoji: string; amount: number; date: string; note?: string; type?: 'expense' | 'income'; billId?: string },
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
    bill_id: e.billId ?? null,
  });
}

export async function updateExpenseRow(
  id: string,
  paidByProfileId: string | null,
  e: { title: string; category: string; categoryEmoji: string; amount: number; date: string; note?: string; type?: 'expense' | 'income' },
) {
  return supabase.from('expenses').update({
    title: e.title,
    category: e.category,
    category_emoji: e.categoryEmoji,
    amount: e.amount,
    paid_by_profile_id: paidByProfileId,
    occurred_on: e.date,
    note: e.note || null,
    type: e.type ?? 'expense',
  }).eq('id', id);
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
  series_id: string;
  bill_month: string;
  frequency_months: number;
}

const BILL_COLUMNS = 'id, title, emoji, category, amount, due_day, paid, paid_date, reminder, note, series_id, bill_month, frequency_months';

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
    seriesId: row.series_id,
    billMonth: row.bill_month,
    frequencyMonths: row.frequency_months,
  };
}

export async function fetchBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select(BILL_COLUMNS)
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
    series_id: b.seriesId,
    bill_month: b.billMonth,
    frequency_months: b.frequencyMonths,
  }).select(BILL_COLUMNS).single();
}

export async function updateBillRow(id: string, b: { title: string; emoji: string; category: Bill['category']; amount: number; dueDay: number; reminder: boolean; note?: string; frequencyMonths: number }) {
  return supabase.from('bills').update({
    title: b.title,
    emoji: b.emoji,
    category: b.category,
    amount: b.amount,
    due_day: b.dueDay,
    reminder: b.reminder,
    note: b.note || null,
    frequency_months: b.frequencyMonths,
  }).eq('id', id);
}

export async function setBillPaid(id: string, paid: boolean, paidDate: string | null) {
  return supabase.from('bills').update({ paid, paid_date: paidDate }).eq('id', id);
}

export async function deleteBillRow(id: string) {
  return supabase.from('bills').delete().eq('id', id);
}

function monthIndex(m: string): number {
  const [y, mo] = m.split('-').map(Number);
  return y * 12 + (mo - 1);
}
function monthFromIndex(idx: number): string {
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${y}-${String(mo).padStart(2, '0')}`;
}

// Any recurring bill whose latest instance is due again by now gets rolled
// forward into a fresh unpaid row — respecting its own cadence, so a monthly
// bill renews every month but a quarterly/yearly one only renews every
// 3/12 months instead of spawning a new row every single month. When it
// catches up after a longer gap (app not opened in a while), it lands on the
// most recent cycle that's actually due — not literally "the current month"
// — so the cadence never drifts off its original anchor day/month.
export async function rollBillsForward(bills: Bill[], currentMonth: string): Promise<Bill[]> {
  const latestBySeries = new Map<string, Bill>();
  for (const b of bills) {
    const cur = latestBySeries.get(b.seriesId);
    if (!cur || b.billMonth > cur.billMonth) latestBySeries.set(b.seriesId, b);
  }
  const curIdx = monthIndex(currentMonth);
  const toCreate: { bill: Bill; nextBillMonth: string }[] = [];
  for (const b of latestBySeries.values()) {
    const freq = Math.max(1, b.frequencyMonths || 1);
    const diff = curIdx - monthIndex(b.billMonth);
    if (diff < freq) continue; // not due yet
    const cycles = Math.floor(diff / freq);
    toCreate.push({ bill: b, nextBillMonth: monthFromIndex(monthIndex(b.billMonth) + cycles * freq) });
  }
  if (toCreate.length === 0) return bills;

  const created: Bill[] = [];
  for (const { bill: b, nextBillMonth } of toCreate) {
    const { data, error } = await createBill({
      title: b.title, emoji: b.emoji, category: b.category, amount: b.amount, dueDay: b.dueDay,
      paid: false, reminder: b.reminder, note: b.note, seriesId: b.seriesId, billMonth: nextBillMonth,
      frequencyMonths: b.frequencyMonths,
    });
    if (!error && data) created.push(rowToBill(data as BillRow));
  }
  return [...bills, ...created];
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
    .order('created_at', { ascending: true });
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

export async function updateSavingsGoalRow(id: string, g: { title: string; emoji: string; target: number; deadline: string }) {
  return supabase.from('savings_goals').update({
    title: g.title, emoji: g.emoji, target: g.target, deadline: g.deadline,
  }).eq('id', id);
}

export async function deleteSavingsGoalRow(id: string) {
  return supabase.from('savings_goals').delete().eq('id', id);
}
