import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context';
import AmountInput from './AmountInput';
import Icon from './Icon';
import { budgetRatio, deleteBudget, fetchBudgets, saveBudget, type Budget } from '../lib/serverFeatures';

const VND = (n: number) => `${Math.round(n).toLocaleString('en-US')} VND`;

// Monthly budgets per category (Money > Stats). Hidden entirely until the budgets table exists.
export default function BudgetsSection({ spentByCategory }: { month: string; spentByCategory: Record<string, number> }) {
  const { state, toast } = useApp();
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchBudgets();
    setMissing(r.missing);
    setBudgets(r.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (missing || budgets === null) return null;

  const free = state.moneyCategories.expense.filter(c => !budgets.some(b => b.category.toLowerCase() === c.label.toLowerCase()));
  const emoji = (name: string) => state.moneyCategories.expense.find(c => c.label.toLowerCase() === name.toLowerCase())?.emoji ?? '💰';

  const add = async () => {
    const n = Number(limit);
    if (!category || !Number.isFinite(n) || n <= 0) { toast('Pick a category and a limit', '⚠️'); return; }
    setBusy(true);
    const ok = await saveBudget(category, n);
    setBusy(false);
    if (!ok) { toast('Could not save the budget', '⚠️'); return; }
    setAdding(false); setCategory(''); setLimit('');
    toast('Budget saved', '💰');
    void load();
  };

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Budgets this month</p>
        {!adding && free.length > 0 && (
          <button onClick={() => { setAdding(true); setCategory(free[0].label); }} style={{ background: 'var(--area-light)', border: 'none', borderRadius: 99, padding: '5px 12px', color: 'var(--area-deep)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Add</button>
        )}
      </div>

      {budgets.length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Set a monthly limit for a category and you will both get a heads-up at 80% and when it is reached.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {budgets.map(b => {
          const spent = spentByCategory[b.category] ?? 0;
          const ratio = budgetRatio(spent, b.limit);
          const over = ratio >= 1, warn = ratio >= 0.8;
          const color = over ? 'var(--fill-strong)' : warn ? '#C27A1E' : 'var(--area)';
          return (
            <div key={b.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon emoji={emoji(b.category)} size={16} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{b.category}</span>
                <span style={{ fontSize: 12, color: over ? 'var(--fill-strong)' : 'var(--ink-2)', fontWeight: 700 }}>{Math.round(ratio * 100)}%</span>
                <button aria-label={`Remove ${b.category} budget`} onClick={async () => { if (await deleteBudget(b.id)) void load(); else toast('Could not remove it', '⚠️'); }}
                  style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon emoji="✕" size={12} />
                </button>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(ratio * 100))} aria-label={`${b.category} budget used`}
                style={{ height: 8, borderRadius: 99, background: 'var(--area-light)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{VND(spent)} of {VND(b.limit)}{over ? ` — ${VND(spent - b.limit)} over` : ''}</p>
            </div>
          );
        })}
      </div>

      {adding && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select className="input-field" aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}>
            {free.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
          </select>
          <AmountInput placeholder="Monthly limit (VND)" value={limit} onChange={setLimit} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setAdding(false)} style={{ flex: 1, padding: '10px' }}>Cancel</button>
            <button className="btn-primary" onClick={() => void add()} disabled={busy} style={{ flex: 2, padding: '10px' }}>Save budget</button>
          </div>
        </div>
      )}
    </div>
  );
}
