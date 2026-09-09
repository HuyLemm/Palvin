import { supabase } from './lib/supabaseClient';
import type { Debt, User } from './types';

type ProfileNames = Record<string, User>;

interface DebtRow {
  id: string;
  created_by_profile_id: string | null;
  direction: 'they_owe' | 'i_owe';
  debtor_name: string;
  amount: number;
  note: string | null;
  lent_date: string;
  due_date: string | null;
  paid: boolean;
  paid_date: string | null;
  paid_amount: number;
}

function rowToDebt(row: DebtRow, names: ProfileNames, myName: string): Debt {
  return {
    id: row.id,
    direction: row.direction,
    debtorName: row.debtor_name,
    amount: Number(row.amount),
    note: row.note ?? undefined,
    date: row.lent_date,
    dueDate: row.due_date ?? undefined,
    paid: row.paid,
    paidDate: row.paid_date ?? undefined,
    paidAmount: Number(row.paid_amount),
    createdBy: row.created_by_profile_id ? (names[row.created_by_profile_id] ?? myName) : 'Both',
  };
}

export async function fetchDebts(names: ProfileNames, myName: string): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('id, created_by_profile_id, direction, debtor_name, amount, note, lent_date, due_date, paid, paid_date, paid_amount')
    .order('paid', { ascending: true })
    .order('lent_date', { ascending: false });
  if (error || !data) return [];
  return (data as DebtRow[]).map(r => rowToDebt(r, names, myName));
}

// Returns the new row's id (rather than the usual bare insert result) so a
// caller opting to also count the debt in Expenses right away can link
// that expense/income entry back to it via debt_id.
export async function createDebt(createdByProfileId: string | null, d: { direction: 'they_owe' | 'i_owe'; debtorName: string; amount: number; note?: string; date: string; dueDate?: string }) {
  return supabase.from('debts').insert({
    created_by_profile_id: createdByProfileId,
    direction: d.direction, debtor_name: d.debtorName, amount: d.amount, note: d.note || null, lent_date: d.date, due_date: d.dueDate || null,
  }).select('id').single();
}

export async function updateDebtRow(id: string, createdByProfileId: string | null, d: { direction: 'they_owe' | 'i_owe'; debtorName: string; amount: number; note?: string; date: string; dueDate?: string }) {
  return supabase.from('debts').update({
    created_by_profile_id: createdByProfileId,
    direction: d.direction, debtor_name: d.debtorName, amount: d.amount, note: d.note || null, lent_date: d.date, due_date: d.dueDate || null,
  }).eq('id', id);
}

export async function setDebtPaidRow(id: string, paid: boolean) {
  return supabase.from('debts').update({ paid, paid_date: paid ? new Date().toISOString().slice(0, 10) : null }).eq('id', id);
}

// For 'i_owe' debts specifically — logs actual progress toward paying it
// off (paidAmount can sit below amount), unlike setDebtPaidRow's plain
// all-or-nothing toggle used by 'they_owe' debts.
export async function payDebtRow(id: string, paidAmount: number, paid: boolean, paidDate: string | null) {
  return supabase.from('debts').update({ paid_amount: paidAmount, paid, paid_date: paidDate }).eq('id', id);
}

export async function deleteDebtRow(id: string) {
  return supabase.from('debts').delete().eq('id', id);
}
