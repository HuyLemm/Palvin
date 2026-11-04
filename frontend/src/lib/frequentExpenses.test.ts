import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { frequentExpenses } from './frequentExpenses';

const ex = (date: string, title: string, amount: number, category = 'Food', type: 'expense' | 'income' = 'expense'): Expense =>
  ({ id: date + title, title, category, categoryEmoji: '🍜', amount, paidBy: 'Both', date, note: '', type } as Expense);
const now = new Date(2026, 10, 1);

describe('frequentExpenses', () => {
  it('returns repeated expenses, most frequent first', () => {
    const list = frequentExpenses([
      ex('2026-10-30', 'Coffee', 45_000), ex('2026-10-29', 'coffee', 45_000), ex('2026-10-20', 'Coffee', 45_000),
      ex('2026-10-28', 'Lunch', 60_000), ex('2026-10-10', 'Lunch', 60_000),
      ex('2026-10-25', 'Taxi', 90_000),
    ], now);
    expect(list.map(q => q.title)).toEqual(['Coffee', 'Lunch']);
    expect(list[0]).toMatchObject({ amount: 45_000, category: 'Food' });
  });
  it('ignores one-offs, income, old items and different amounts', () => {
    const list = frequentExpenses([
      ex('2026-10-30', 'Coffee', 45_000), ex('2026-10-29', 'Coffee', 50_000),
      ex('2026-10-30', 'Salary', 9_000_000, 'Salary', 'income'), ex('2026-10-29', 'Salary', 9_000_000, 'Salary', 'income'),
      ex('2026-03-01', 'Gym', 300_000), ex('2026-02-01', 'Gym', 300_000),
    ], now);
    expect(list).toEqual([]);
  });
  it('respects the limit', () => {
    const rows = ['A', 'B', 'C', 'D'].flatMap(t => [ex('2026-10-30', t, 10_000), ex('2026-10-29', t, 10_000)]);
    expect(frequentExpenses(rows, now, 2)).toHaveLength(2);
  });
});
