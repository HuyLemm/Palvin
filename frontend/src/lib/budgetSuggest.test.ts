import { describe, expect, it } from 'vitest';
import type { Expense } from '../types';
import { suggestBudget } from './budgetSuggest';

const ex = (date: string, category: string, amount: number, type: 'expense' | 'income' = 'expense'): Expense =>
  ({ id: date + category + amount, title: 't', category, categoryEmoji: '🍜', amount, paidBy: 'Both', date, note: '', type } as Expense);

describe('suggestBudget', () => {
  const data = [
    ex('2026-09-03', 'Food', 1_000_000), ex('2026-09-20', 'Food', 500_000),
    ex('2026-08-10', 'Food', 1_200_000),
    ex('2026-10-02', 'Food', 9_000_000), // current month: ignored
    ex('2026-09-05', 'Food', 300_000, 'income'), // income: ignored
  ];
  it('averages the earlier months that had spending and rounds up to 50k', () => {
    expect(suggestBudget(data, 'Food', '2026-10')).toBe(1_350_000); // (1.5m + 1.2m) / 2
  });
  it('matches the category case-insensitively', () => {
    expect(suggestBudget(data, 'food', '2026-10')).toBe(1_350_000);
  });
  it('returns null with no history', () => {
    expect(suggestBudget(data, 'Travel', '2026-10')).toBeNull();
    expect(suggestBudget(data, 'Food', '2026-01')).toBeNull();
  });
  it('crosses a year boundary', () => {
    expect(suggestBudget([ex('2025-12-15', 'Food', 400_000)], 'Food', '2026-01')).toBe(400_000);
  });
});
