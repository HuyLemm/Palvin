import { useState } from 'react';
import { useApp } from '../context';
import AddExpenseForm from '../components/forms/AddExpenseForm';
import type { Bill } from '../types';

type Tab = 'expenses' | 'goals' | 'stats' | 'bills';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'expenses', label: 'Thu chi', icon: '💸' },
  { key: 'goals', label: 'Quỹ', icon: '💰' },
  { key: 'stats', label: 'Thống kê', icon: '📊' },
  { key: 'bills', label: 'Hóa đơn', icon: '🧾' },
];

const CAT_COLORS: Record<string, string> = {
  Food: '#E67F9A', Coffee: '#C48A52', Entertainment: '#8B6FD4',
  Home: '#4AAEAA', Transportation: '#4A8AE8', Gifts: '#E8844A',
  Shopping: '#D4A028', Health: '#5AC26A', Other: '#A0A0A0',
};

const MONTHS = ['2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03'];
const MONTH_LABELS: Record<string, string> = {
  '2026-08': 'Tháng 8', '2026-07': 'Tháng 7', '2026-06': 'Tháng 6',
  '2026-05': 'Tháng 5', '2026-04': 'Tháng 4', '2026-03': 'Tháng 3',
};

const VND = (n: number) => n >= 1000000
  ? `${(n / 1000000).toFixed(1)}M ₫`
  : n >= 1000
  ? `${(n / 1000).toFixed(0)}K ₫`
  : `${n} ₫`;

const BILL_CAT_LABELS: Record<string, string> = {
  rent: 'Tiền nhà',
  utilities: 'Điện / Nước',
  internet: 'Internet',
  subscription: 'Subscription',
  other: 'Khác',
};

export default function Money() {
  const { state, deleteExpense, addToGoal, addBill, toggleBillPaid, deleteBill, toggleBillReminder } = useApp();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Tab bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3,
        background: 'var(--bg)', borderRadius: 16, padding: 4, marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--white)' : 'transparent',
            color: tab === t.key ? 'var(--sakura-deep)' : 'var(--ink-2)',
            boxShadow: tab === t.key ? '0 1px 4px rgba(51,42,45,0.10)' : 'none',
            transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="screen-transition">
        {tab === 'expenses' && <ExpensesTab expenses={state.expenses} onAdd={() => setShowAddExpense(true)} onDelete={deleteExpense} />}
        {tab === 'goals' && <GoalsTab goals={state.savingsGoals} addToGoal={addToGoal} />}
        {tab === 'stats' && <StatsTab expenses={state.expenses} />}
        {tab === 'bills' && <BillsTab bills={state.bills} onAdd={addBill} onTogglePaid={toggleBillPaid} onDelete={deleteBill} onToggleReminder={toggleBillReminder} />}
      </div>

      {showAddExpense && <AddExpenseForm onClose={() => setShowAddExpense(false)} />}
    </div>
  );
}

/* ─── Thu chi tab ─────────────────────────────────── */
function ExpensesTab({ expenses, onAdd, onDelete }: { expenses: any[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [month, setMonth] = useState('all');

  const filtered = expenses.filter(e => {
    const typeOk = filter === 'all' || (filter === 'income' ? e.type === 'income' : e.type !== 'income');
    const monthOk = month === 'all' || e.date.startsWith(month);
    return typeOk && monthOk;
  });

  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0);
  const totalExpense = filtered.filter(e => e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0);

  // Group by date
  const byDate: Record<string, any[]> = {};
  for (const e of filtered) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: 'linear-gradient(135deg, #5AC26A, #38a853)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Thu nhập</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'white', lineHeight: 1 }}>{VND(totalIncome)}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #E67F9A, #C95F7C)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Chi tiêu</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'white', lineHeight: 1 }}>{VND(totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', flex: 1 }}>
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: 1, padding: '7px 4px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: filter === f ? 'var(--sakura-accent)' : 'transparent',
              color: filter === f ? 'white' : 'var(--ink-2)',
              transition: 'all 0.15s',
            }}>{f === 'all' ? 'Tất cả' : f === 'income' ? 'Thu' : 'Chi'}</button>
          ))}
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}
        >
          <option value="all">Tất cả</option>
          {MONTHS.map(m => <option key={m} value={m}>{MONTH_LABELS[m]}</option>)}
        </select>
      </div>

      {/* Add button */}
      <button onClick={onAdd} style={{
        width: '100%', padding: '11px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
      }}>+ Thêm giao dịch</button>

      {/* Grouped list */}
      {dates.length === 0
        ? <EmptyState icon="💸" title="Chưa có giao dịch" sub="Thêm thu nhập hoặc chi tiêu đầu tiên." />
        : dates.map(date => (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>{formatDate(date)}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                {VND(byDate[date].filter(e => e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0))}
              </p>
            </div>
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {byDate[date].map((e, i) => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, background: e.type === 'income' ? 'rgba(90,194,106,0.12)' : 'var(--sakura-light)',
                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                  }}>{e.categoryEmoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{e.category} · {e.paidBy}</p>
                  </div>
                  <p style={{
                    fontSize: 15, fontWeight: 700, flexShrink: 0,
                    color: e.type === 'income' ? '#5AC26A' : 'var(--sakura-deep)',
                  }}>{e.type === 'income' ? '+' : '-'}{VND(e.amount)}</p>
                  <button onClick={() => onDelete(e.id)} style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--ink-2)', opacity: 0.4, marginLeft: 2 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ─── Quỹ tab ─────────────────────────────────────── */
function GoalsTab({ goals, addToGoal }: { goals: any[]; addToGoal: (id: string, n: number) => void }) {
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addAmt, setAddAmt] = useState('');
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #E67F9A, #C95F7C)', borderRadius: 24, padding: '24px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Tổng tiết kiệm</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: 'white', lineHeight: 1, marginBottom: 6 }}>{VND(totalSaved)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Mục tiêu: {VND(totalTarget)} · {goals.length} quỹ</p>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%`, background: 'white', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Goals list */}
      {goals.map(g => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={g.id} className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{g.emoji}</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{g.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Mục tiêu: {g.deadline}</p>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{pct}%</p>
            </div>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#5AC26A' : undefined }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{VND(g.current)}</span>
              <span>/ {VND(g.target)}</span>
            </div>
            {addingTo === g.id ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-field" type="number" placeholder="Số tiền (VND)" value={addAmt}
                  onChange={e => setAddAmt(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px' }}
                />
                <button
                  onClick={() => { addToGoal(g.id, +addAmt); setAddingTo(null); setAddAmt(''); }}
                  style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                >Thêm</button>
                <button
                  onClick={() => setAddingTo(null)}
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'var(--ink-2)' }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(g.id)}
                style={{ width: '100%', padding: '9px', background: 'var(--sakura-light)', border: 'none', borderRadius: 10, color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >+ Nạp tiền vào quỹ</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Thống kê tab ────────────────────────────────── */
function StatsTab({ expenses }: { expenses: any[] }) {
  const [month, setMonth] = useState('2026-08');
  const monthExp = expenses.filter(e => e.date.startsWith(month) && e.type !== 'income');
  const monthInc = expenses.filter(e => e.date.startsWith(month) && e.type === 'income');
  const total = monthExp.reduce((s: number, e: any) => s + e.amount, 0);
  const totalInc = monthInc.reduce((s: number, e: any) => s + e.amount, 0);
  const alvinT = monthExp.filter((e: any) => e.paidBy === 'Alvin').reduce((s: number, e: any) => s + e.amount, 0);
  const paoiT = monthExp.filter((e: any) => e.paidBy === 'Paoi').reduce((s: number, e: any) => s + e.amount, 0);
  const bothT = monthExp.filter((e: any) => e.paidBy === 'Both').reduce((s: number, e: any) => s + e.amount, 0);
  const diff = Math.abs(alvinT - paoiT);
  const whoOwes = alvinT > paoiT ? 'Paoi' : 'Alvin';
  const owedTo = alvinT > paoiT ? 'Alvin' : 'Paoi';

  const prevMonth = MONTHS[MONTHS.indexOf(month) + 1];
  const prevTotal = prevMonth ? expenses.filter(e => e.date.startsWith(prevMonth) && e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0) : 0;
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const catMap: Record<string, { emoji: string; amount: number; count: number }> = {};
  for (const e of monthExp) {
    if (!catMap[e.category]) catMap[e.category] = { emoji: e.categoryEmoji, amount: 0, count: 0 };
    catMap[e.category].amount += e.amount;
    catMap[e.category].count += 1;
  }
  const categories = Object.entries(catMap).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.amount - a.amount);
  const maxCat = categories[0]?.amount || 1;

  return (
    <div>
      {/* Month picker */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {MONTHS.map(m => (
          <button key={m} onClick={() => setMonth(m)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: m === month ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--white)',
            color: m === month ? 'white' : 'var(--ink-2)',
            border: m === month ? 'none' : '1px solid var(--border)',
            boxShadow: m === month ? '0 2px 8px rgba(201,95,124,0.3)' : 'none',
          }}>{MONTH_LABELS[m]}</button>
        ))}
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{MONTH_LABELS[month]} · Chi tiêu</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'white', lineHeight: 1.1, marginBottom: 6 }}>{VND(total)}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {change !== null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: change > 0 ? 'rgba(255,100,100,0.25)' : 'rgba(100,220,140,0.25)', borderRadius: 99, padding: '3px 10px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}% so tháng trước</span>
            </div>
          )}
          {totalInc > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(90,194,106,0.25)', borderRadius: 99, padding: '3px 10px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>Thu: {VND(totalInc)}</span>
            </div>
          )}
        </div>
        {monthExp.length === 0 && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 }}>Chưa có giao dịch</p>}
      </div>

      {/* Contribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[{ name: 'Alvin', amount: alvinT, color: '#4A8AE8' }, { name: 'Paoi', amount: paoiT, color: '#E67F9A' }].map(p => (
          <div key={p.name} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
              <p style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 700 }}>{p.name}</p>
            </div>
            <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>{VND(p.amount)}</p>
            {total > 0 && <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>{((p.amount / total) * 100).toFixed(0)}% tổng</p>}
          </div>
        ))}
      </div>

      {/* Settlement */}
      {diff > 0.01 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 12, borderLeft: '3px solid var(--sakura-accent)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <div>
            <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 2 }}>Cân bằng chi tiêu</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--sakura-deep)' }}>{whoOwes}</span> nợ <span style={{ color: 'var(--sakura-deep)' }}>{owedTo}</span> &nbsp;
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>{VND(diff / 2)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Split bar */}
      {total > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Tỉ lệ đóng góp</p>
          <div style={{ height: 12, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1, background: 'var(--bg)' }}>
            {alvinT > 0 && <div style={{ width: `${(alvinT / total) * 100}%`, background: '#4A8AE8', transition: 'width 0.5s', borderRadius: '99px 0 0 99px' }} />}
            {paoiT > 0 && <div style={{ width: `${(paoiT / total) * 100}%`, background: '#E67F9A', transition: 'width 0.5s', borderRadius: bothT > 0 ? 0 : '0 99px 99px 0' }} />}
            {bothT > 0 && <div style={{ flex: 1, background: '#8B6FD4', borderRadius: '0 99px 99px 0' }} />}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {[{ l: 'Alvin', c: '#4A8AE8', v: alvinT }, { l: 'Paoi', c: '#E67F9A', v: paoiT }, ...(bothT > 0 ? [{ l: 'Cả hai', c: '#8B6FD4', v: bothT }] : [])].map(x => (
              <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />
                <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{x.l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{VND(x.v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories breakdown */}
      {categories.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Theo danh mục</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categories.map(c => (
              <div key={c.cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 28, height: 28, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{c.emoji}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.cat}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-2)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 99 }}>{c.count}x</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{VND(c.amount)}</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.amount / maxCat) * 100}%`, height: '100%', background: CAT_COLORS[c.cat] || '#A0A0A0', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly bar chart (last 6 months) */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>6 tháng gần nhất</p>
        <MonthlyBar expenses={expenses} />
      </div>
    </div>
  );
}

function MonthlyBar({ expenses }: { expenses: any[] }) {
  const data = MONTHS.slice().reverse().map(m => {
    const exp = expenses.filter(e => e.date.startsWith(m) && e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0);
    return { m, exp };
  });
  const max = Math.max(...data.map(d => d.exp), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
      {data.map(d => (
        <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', height: `${Math.max((d.exp / max) * 68, d.exp > 0 ? 6 : 0)}px`,
            background: 'linear-gradient(to top, var(--sakura-accent), var(--sakura-light))',
            borderRadius: '4px 4px 2px 2px', transition: 'height 0.4s',
          }} />
          <p style={{ fontSize: 9, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1 }}>{MONTH_LABELS[d.m]}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Hóa đơn tab ─────────────────────────────────── */
function BillsTab({ bills, onAdd, onTogglePaid, onDelete, onToggleReminder }: {
  bills: Bill[];
  onAdd: (b: Omit<Bill, 'id'>) => void;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleReminder: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const today = new Date();
  const currentDay = today.getDate();

  const unpaid = bills.filter(b => !b.paid);
  const paid = bills.filter(b => b.paid);
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);
  const totalMonth = bills.reduce((s, b) => s + b.amount, 0);

  const getDueStatus = (dueDay: number, isPaid: boolean) => {
    if (isPaid) return { label: 'Đã trả', color: '#5AC26A', bg: 'rgba(90,194,106,0.1)' };
    const daysLeft = dueDay - currentDay;
    if (daysLeft < 0) return { label: 'Quá hạn', color: '#E8524A', bg: 'rgba(232,82,74,0.1)' };
    if (daysLeft <= 3) return { label: `${daysLeft}d`, color: '#E8844A', bg: 'rgba(232,132,74,0.1)' };
    return { label: `Ngày ${dueDay}`, color: 'var(--ink-2)', bg: 'var(--bg)' };
  };

  return (
    <div>
      {/* Summary */}
      <div style={{ background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tháng này cần thanh toán</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'white', lineHeight: 1.1, marginBottom: 8 }}>{VND(totalUnpaid)}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Chưa trả</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{unpaid.length} khoản</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Đã trả</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{paid.length} khoản</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Tổng tháng</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{VND(totalMonth)}</p>
          </div>
        </div>
      </div>

      {/* Add button */}
      <button onClick={() => setShowForm(true)} style={{
        width: '100%', padding: '11px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(139,111,212,0.35)',
      }}>+ Thêm hóa đơn</button>

      {/* Unpaid */}
      {unpaid.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Chưa thanh toán</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unpaid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onDelete={onDelete} onToggleReminder={onToggleReminder} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Đã thanh toán</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onDelete={onDelete} onToggleReminder={onToggleReminder} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {bills.length === 0 && <EmptyState icon="🧾" title="Chưa có hóa đơn" sub="Thêm các khoản cố định hàng tháng." />}

      {showForm && <AddBillForm onClose={() => setShowForm(false)} onAdd={onAdd} />}
    </div>
  );
}

function BillCard({ bill: b, onTogglePaid, onDelete, onToggleReminder, getDueStatus }: {
  bill: Bill;
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleReminder: (id: string) => void;
  getDueStatus: (dueDay: number, isPaid: boolean) => { label: string; color: string; bg: string };
}) {
  const status = getDueStatus(b.dueDay, b.paid);
  return (
    <div className="card" style={{ padding: '14px 16px', opacity: b.paid ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, background: b.paid ? 'rgba(90,194,106,0.1)' : 'rgba(139,111,212,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{b.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: b.paid ? 'var(--ink-2)' : 'var(--ink)', textDecoration: b.paid ? 'line-through' : 'none' }}>{b.title}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, padding: '2px 7px', borderRadius: 99 }}>{status.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{BILL_CAT_LABELS[b.category]}</span>
            {b.note && <span style={{ fontSize: 10, color: 'var(--ink-2)', opacity: 0.7 }}>· {b.note}</span>}
          </div>
          {b.paid && b.paidDate && (
            <p style={{ fontSize: 10, color: '#5AC26A', marginTop: 2 }}>✓ Đã trả {formatDate(b.paidDate)}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: b.paid ? 'var(--ink-2)' : '#8B6FD4', marginBottom: 4 }}>{VND(b.amount)}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              onClick={() => onToggleReminder(b.id)}
              title={b.reminder ? 'Tắt nhắc nhở' : 'Bật nhắc nhở'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: b.reminder ? 1 : 0.35, padding: '2px' }}
            >🔔</button>
            <button
              onClick={() => onTogglePaid(b.id)}
              style={{
                background: b.paid ? 'var(--bg)' : '#5AC26A', color: b.paid ? 'var(--ink-2)' : 'white',
                border: b.paid ? '1.5px solid var(--border)' : 'none', borderRadius: 8,
                padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >{b.paid ? 'Hủy' : 'Đã trả'}</button>
          </div>
        </div>
      </div>
      <button
        onClick={() => onDelete(b.id)}
        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)', opacity: 0.3 }}
      />
    </div>
  );
}

function AddBillForm({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Omit<Bill, 'id'>) => void }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🧾');
  const [category, setCategory] = useState<Bill['category']>('other');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('15');
  const [reminder, setReminder] = useState(true);
  const [note, setNote] = useState('');

  const EMOJIS = ['🏠', '⚡', '💧', '📡', '🎬', '🎵', '🚗', '📱', '🏋️', '🛡️', '🧾'];
  const CAT_OPTIONS: { key: Bill['category']; label: string }[] = [
    { key: 'rent', label: 'Tiền nhà' },
    { key: 'utilities', label: 'Điện / Nước' },
    { key: 'internet', label: 'Internet' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'other', label: 'Khác' },
  ];

  const handleSubmit = () => {
    if (!title || !amount) return;
    onAdd({ title, emoji, category, amount: +amount, dueDay: +dueDay, paid: false, reminder, note });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'var(--white)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 430, animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Thêm hóa đơn</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Emoji picker */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>ICON</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              width: 38, height: 38, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)',
              borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)',
              fontSize: 18, cursor: 'pointer',
            }}>{e}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input-field" placeholder="Tên hóa đơn" value={title} onChange={e => setTitle(e.target.value)} />

          <select className="input-field" value={category} onChange={e => setCategory(e.target.value as Bill['category'])}>
            {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input className="input-field" type="number" placeholder="Số tiền (VND)" value={amount} onChange={e => setAmount(e.target.value)} />
            <input className="input-field" type="number" placeholder="Ngày đến hạn (1-31)" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>

          <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} />

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'var(--bg)', borderRadius: 12 }}>
            <input type="checkbox" checked={reminder} onChange={e => setReminder(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--sakura-accent)' }} />
            <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>🔔 Nhắc nhở trước ngày đến hạn</span>
          </label>

          <button onClick={handleSubmit} style={{
            padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)',
            color: 'white', fontWeight: 700, fontSize: 15,
          }}>Thêm hóa đơn</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{sub}</p>
    </div>
  );
}
