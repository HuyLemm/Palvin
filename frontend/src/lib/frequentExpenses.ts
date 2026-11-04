import type { Expense } from '../types';

export interface QuickExpense { title: string; category: string; categoryEmoji: string; amount: number; paidBy: string }

/**
 * Expenses you keep repeating (same title, category and amount at least twice in the last
 * `windowDays`), most frequent first. Powers the one-tap "Quick add" chips on Home.
 */
export function frequentExpenses(expenses: Expense[], now = new Date(), limit = 3, windowDays = 90): QuickExpense[] {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - windowDays).toISOString().slice(0, 10);
  const groups = new Map<string, { count: number; last: string; sample: Expense }>();
  for (const e of expenses) {
    if (e.type === 'income' || e.date < since || !e.title.trim() || e.amount <= 0) continue;
    const key = `${e.title.trim().toLowerCase()}|${e.category.toLowerCase()}|${e.amount}`;
    const g = groups.get(key);
    if (!g) groups.set(key, { count: 1, last: e.date, sample: e });
    else { g.count++; if (e.date > g.last) { g.last = e.date; g.sample = e; } }
  }
  return [...groups.values()]
    .filter(g => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))
    .slice(0, limit)
    .map(g => ({ title: g.sample.title.trim(), category: g.sample.category, categoryEmoji: g.sample.categoryEmoji, amount: g.sample.amount, paidBy: g.sample.paidBy }));
}

// A one-shot hand-off from a Quick add chip to the expense form that opens next. The form peeks
// when it mounts (safe under React StrictMode's double render) and clears it afterwards.
let pending: QuickExpense | null = null;
export const setQuickExpense = (q: QuickExpense) => { pending = q; };
export const peekQuickExpense = () => pending;
export const clearQuickExpense = () => { pending = null; };
