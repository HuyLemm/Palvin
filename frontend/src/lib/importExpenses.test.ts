import { describe, expect, it } from 'vitest';
import { parseExpenseFile, splitNew } from './importExpenses';
import { toCSV } from './exportData';

const rows = [
  { date: '2026-10-31', type: 'expense', title: 'Đổ xăng, cho "Alvin"', category: 'Transportation', paidBy: 'Alvinne', amount: 100000, note: '' },
  { date: '2026-10-27', type: 'income', title: '=SUM(A1)', category: 'Salary', paidBy: 'Both', amount: 5000000, note: 'line' },
];

describe('importExpenses', () => {
  it('round-trips the CSV written by the exporter (quotes, commas, formula guard)', () => {
    const csv = toCSV(rows, ['date', 'type', 'title', 'category', 'paidBy', 'amount', 'note']);
    const back = parseExpenseFile('x.csv', csv);
    expect(back).toHaveLength(2);
    expect(back[0].title).toBe('Đổ xăng, cho "Alvin"');
    expect(back[1].title).toBe('=SUM(A1)');
    expect(back[1].type).toBe('income');
  });
  it('reads the JSON backup and skips invalid rows', () => {
    const json = JSON.stringify({ expenses: [rows[0], { date: 'bad', title: 'x', amount: 1 }, { ...rows[0], amount: -5 }] });
    expect(parseExpenseFile('backup.json', json)).toHaveLength(1);
  });
  it('rejects unrelated CSV files', () => {
    expect(() => parseExpenseFile('x.csv', 'a,b\n1,2')).toThrow(/PALVIN/);
  });
  it('separates new rows from ones that already exist, and de-duplicates the file itself', () => {
    const parsed = parseExpenseFile('x.json', JSON.stringify({ expenses: [rows[0], rows[1], rows[1]] }));
    const { fresh, dupes } = splitNew(parsed, [{ date: '2026-10-31', title: 'ĐỔ XĂNG, CHO "ALVIN"', amount: 100000, paidBy: 'alvinne' as never }]);
    expect(fresh).toHaveLength(1);
    expect(dupes).toBe(2);
  });
});
