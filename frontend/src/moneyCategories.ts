import { supabase } from './lib/supabaseClient';
import type { MoneyCategoryItem, MoneyCategoryKind } from './types';

// The three category pickers used across Money.tsx (couple expenses, couple
// income, Private Stash) used to be hardcoded arrays duplicated across
// AddExpenseForm/EditExpenseForm/AddIncomeForm/Money.tsx. Moved into their
// own per-couple, per-kind table so Settings can let the admin rename, add,
// and delete them — same lazy-seeding idea as fav_categories (0036): a
// couple's default set for a kind is created the first time the app fetches
// zero rows for that kind, covering both existing and future couples.
//
// Renaming/deleting here only changes the picker going forward — expenses
// store their category as a plain label+emoji snapshot at creation time
// (not a foreign key), so past transactions keep showing whatever they were
// logged under, same as changing a person's display name doesn't rewrite
// old chat messages.
export const DEFAULT_MONEY_CATEGORIES: Record<MoneyCategoryKind, { label: string; emoji: string }[]> = {
  expense: [
    { label: 'Food', emoji: '🍜' }, { label: 'Transportation', emoji: '🚗' },
    { label: 'Entertainment', emoji: '🎬' }, { label: 'Gifts', emoji: '🎁' },
    { label: 'Coffee', emoji: '☕' }, { label: 'Home', emoji: '🏠' },
    { label: 'Travel', emoji: '✈️' }, { label: 'Other', emoji: '📦' },
  ],
  income: [
    { label: 'Salary', emoji: '💵' }, { label: 'Bonus', emoji: '🎉' },
    { label: 'Gift', emoji: '🎁' }, { label: 'Investment', emoji: '📈' },
    { label: 'Selling Stuff', emoji: '🛍️' }, { label: 'Other', emoji: '📦' },
  ],
  private: [
    { label: 'Food', emoji: '🍜' }, { label: 'Coffee', emoji: '☕' },
    { label: 'Shopping', emoji: '🛍️' }, { label: 'Entertainment', emoji: '🎮' },
    { label: 'Transport', emoji: '🚗' }, { label: 'Other', emoji: '💰' },
  ],
};

const EMPTY_RESULT: Record<MoneyCategoryKind, MoneyCategoryItem[]> = { expense: [], income: [], private: [] };

interface MoneyCategoryRow { id: string; kind: MoneyCategoryKind; label: string; emoji: string }

function groupByKind(rows: MoneyCategoryRow[]): Record<MoneyCategoryKind, MoneyCategoryItem[]> {
  const result: Record<MoneyCategoryKind, MoneyCategoryItem[]> = { expense: [], income: [], private: [] };
  for (const row of rows) result[row.kind].push({ id: row.id, label: row.label, emoji: row.emoji });
  return result;
}

export async function fetchMoneyCategories(): Promise<Record<MoneyCategoryKind, MoneyCategoryItem[]>> {
  const { data, error } = await supabase.from('money_categories').select('id, kind, label, emoji').order('created_at', { ascending: true });
  if (error) return EMPTY_RESULT;
  const result = groupByKind((data ?? []) as MoneyCategoryRow[]);

  const missingKinds = (Object.keys(DEFAULT_MONEY_CATEGORIES) as MoneyCategoryKind[]).filter(k => result[k].length === 0);
  if (missingKinds.length === 0) return result;

  // upsert + ignoreDuplicates (backed by the couple_id+kind+label unique
  // constraint) rather than a plain insert — two concurrent first-time
  // fetches both seeing an empty kind would otherwise both insert its
  // defaults and leave the couple with duplicates.
  const seedRows = missingKinds.flatMap(kind => DEFAULT_MONEY_CATEGORIES[kind].map(c => ({ kind, label: c.label, emoji: c.emoji })));
  const { error: seedError } = await supabase.from('money_categories').upsert(seedRows, { onConflict: 'couple_id,kind,label', ignoreDuplicates: true });
  if (seedError) return result;
  const { data: seeded } = await supabase.from('money_categories').select('id, kind, label, emoji').order('created_at', { ascending: true });
  return groupByKind((seeded ?? []) as MoneyCategoryRow[]);
}

export async function createMoneyCategory(kind: MoneyCategoryKind, cat: { label: string; emoji: string }) {
  return supabase.from('money_categories').insert({ kind, ...cat }).select('id, kind, label, emoji').single();
}

export async function updateMoneyCategoryRow(id: string, cat: { label: string; emoji: string }) {
  return supabase.from('money_categories').update(cat).eq('id', id);
}

export async function deleteMoneyCategoryRow(id: string) {
  return supabase.from('money_categories').delete().eq('id', id);
}
