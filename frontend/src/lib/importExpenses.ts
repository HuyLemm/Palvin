import type { Expense } from '../types';

// Reads expenses back from a file made by Settings > Your data (CSV or the JSON backup).
export interface ImportRow { date: string; type: 'expense' | 'income'; title: string; category: string; paidBy: string; amount: number; note: string }

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && src[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x !== ''));
}

// The CSV writer defuses spreadsheet formulas by prefixing "'"; undo it on the way back in.
const unquoteFormula = (s: string) => (/^'[=+\-@]/.test(s) ? s.slice(1) : s);

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

function toRow(o: Record<string, unknown>): ImportRow | null {
  const amount = Number(o.amount);
  if (!isDate(o.date) || !Number.isFinite(amount) || amount <= 0 || !String(o.title ?? '').trim()) return null;
  return {
    date: o.date, type: o.type === 'income' ? 'income' : 'expense', title: unquoteFormula(String(o.title)).trim(),
    category: String(o.category ?? ''), paidBy: String(o.paidBy ?? ''), amount, note: unquoteFormula(String(o.note ?? '')),
  };
}

export function parseExpenseFile(name: string, text: string): ImportRow[] {
  if (/\.json$/i.test(name) || text.trimStart().startsWith('{')) {
    const j = JSON.parse(text);
    return (Array.isArray(j.expenses) ? j.expenses : []).map((e: Record<string, unknown>) => toRow(e)).filter((r: ImportRow | null): r is ImportRow => !!r);
  }
  const [head, ...rest] = parseCSV(text);
  if (!head) return [];
  const idx = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
  if (idx.date == null || idx.title == null || idx.amount == null) throw new Error('This does not look like a PALVIN expenses file.');
  return rest.map(r => toRow(Object.fromEntries(Object.keys(idx).map(k => [k, r[idx[k]]])))).filter((r): r is ImportRow => !!r);
}

export const rowKey = (r: { date: string; title: string; amount: number; paidBy: string }) =>
  `${r.date}|${r.title.trim().toLowerCase()}|${r.amount}|${r.paidBy.trim().toLowerCase()}`;

/** Splits file rows into ones already in the app (same date, title, amount, payer) and new ones. */
export function splitNew(rows: ImportRow[], existing: Pick<Expense, 'date' | 'title' | 'amount' | 'paidBy'>[]) {
  const have = new Set(existing.map(e => rowKey({ date: e.date, title: e.title, amount: e.amount, paidBy: String(e.paidBy) })));
  const seen = new Set<string>();
  const fresh: ImportRow[] = []; let dupes = 0;
  for (const r of rows) {
    const k = rowKey(r);
    if (have.has(k) || seen.has(k)) { dupes++; continue; }
    seen.add(k); fresh.push(r);
  }
  return { fresh, dupes };
}
