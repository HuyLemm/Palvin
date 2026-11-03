import type { Expense } from '../types';

const prevMonths = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (i + 1), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
};

/**
 * A starting limit for a category: its average spend over the (up to) 3 months before `month`
 * that had any spending in it, rounded up to the nearest 50,000. Null when there is no history.
 */
export function suggestBudget(expenses: Expense[], category: string, month: string): number | null {
  const months = prevMonths(month, 3);
  const totals = months.map(mo => expenses
    .filter(e => e.type !== 'income' && e.category.toLowerCase() === category.toLowerCase() && e.date.startsWith(mo))
    .reduce((s, e) => s + e.amount, 0)).filter(t => t > 0);
  if (!totals.length) return null;
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  return Math.ceil(avg / 50_000) * 50_000;
}
