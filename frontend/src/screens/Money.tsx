import { useState } from 'react';
import { useApp } from '../context';
import AddExpenseForm from '../components/forms/AddExpenseForm';
import AddIncomeForm from '../components/forms/AddIncomeForm';
import EditExpenseForm from '../components/forms/EditExpenseForm';
import AddGoalForm from '../components/forms/AddGoalForm';
import EditGoalForm from '../components/forms/EditGoalForm';
import EditBillForm from '../components/forms/EditBillForm';
import AmountInput from '../components/AmountInput';
import Icon from '../components/Icon';
import type { Bill, Expense, SavingsGoal } from '../types';

type Tab = 'expenses' | 'goals' | 'stats' | 'bills';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'expenses', label: 'Thu chi', icon: '💸' },
  { key: 'goals', label: 'Quỹ', icon: '💰' },
  { key: 'bills', label: 'Hóa đơn', icon: '🧾' },
  { key: 'stats', label: 'Thống kê', icon: '📊' },
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

const VND = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} VND`;

const BILL_CAT_LABELS: Record<string, string> = {
  rent: 'Tiền nhà',
  utilities: 'Điện / Nước',
  internet: 'Internet',
  subscription: 'Subscription',
  other: 'Khác',
};

const FREQUENCY_PRESETS = [1, 2, 3, 6, 12];
function frequencyLabel(n: number): string {
  if (n === 1) return 'Hàng tháng';
  if (n === 12) return 'Hàng năm';
  return `${n} tháng/lần`;
}

export default function Money() {
  const { state, addToGoal, withdrawFromGoal, addBill, toggleBillPaid } = useApp();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

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
            <Icon emoji={t.icon} size={16} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div key={tab} className="screen-transition">
        {tab === 'expenses' && <ExpensesTab expenses={state.expenses} onAdd={() => setShowAddExpense(true)} onAddIncome={() => setShowAddIncome(true)} />}
        {tab === 'goals' && <GoalsTab goals={state.savingsGoals} addToGoal={addToGoal} withdrawFromGoal={withdrawFromGoal} />}
        {tab === 'stats' && <StatsTab expenses={state.expenses} />}
        {tab === 'bills' && <BillsTab bills={state.bills} onAdd={addBill} onTogglePaid={toggleBillPaid} />}
      </div>

      {showAddExpense && <AddExpenseForm onClose={() => setShowAddExpense(false)} />}
      {showAddIncome && <AddIncomeForm onClose={() => setShowAddIncome(false)} />}
    </div>
  );
}

/* ─── Thu chi tab ─────────────────────────────────── */
function ExpensesTab({ expenses, onAdd, onAddIncome }: { expenses: Expense[]; onAdd: () => void; onAddIncome: () => void }) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [month, setMonth] = useState('all');
  const [editing, setEditing] = useState<Expense | null>(null);

  const filtered = expenses.filter(e => {
    const typeOk = filter === 'all' || (filter === 'income' ? e.type === 'income' : e.type !== 'income');
    const monthOk = month === 'all' || e.date.startsWith(month);
    return typeOk && monthOk;
  });

  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = filtered.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;

  // Group by date
  const byDate: Record<string, Expense[]> = {};
  for (const e of filtered) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <style>{`
        @keyframes moneyIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .money-in { animation: moneyIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .money-row { transition: background 0.15s; }
        .money-row:active { background: var(--bg); }
      `}</style>

      {/* Net balance hero */}
      <div key={`net-${filter}-${month}`} className="money-in" style={{
        background: net >= 0 ? 'linear-gradient(135deg, #5AC26A, #3D8A4E)' : 'linear-gradient(135deg, #E67F9A, #C95F7C)',
        borderRadius: 20, padding: '18px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Còn lại</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: 'white', lineHeight: 1.1 }}>{VND(net)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Thu {VND(totalIncome)} · Chi {VND(totalExpense)}</p>
      </div>

      {/* Summary strip */}
      <div key={`sum-${filter}-${month}`} className="money-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, animationDelay: '0.04s' }}>
        <div style={{ background: 'linear-gradient(135deg, #5AC26A, #38a853)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Thu nhập</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 19, color: 'white', lineHeight: 1 }}>{VND(totalIncome)}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #E67F9A, #C95F7C)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Chi tiêu</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 19, color: 'white', lineHeight: 1 }}>{VND(totalExpense)}</p>
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
              transition: 'all 0.2s ease',
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

      {/* Add buttons — income and expense are different things, so two distinct entry points */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={onAddIncome} style={{
          flex: 1, padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #5AC26A, #3D8A4E)',
          color: 'white', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(90,194,106,0.3)',
          transition: 'transform 0.15s ease',
        }}>+ Khoản thu</button>
        <button onClick={onAdd} style={{
          flex: 1, padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
          color: 'white', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
          transition: 'transform 0.15s ease',
        }}>+ Khoản chi</button>
      </div>

      {/* Grouped list */}
      {dates.length === 0
        ? <EmptyState icon="💸" title="Chưa có giao dịch" sub="Thêm thu nhập hoặc chi tiêu đầu tiên." />
        : dates.map((date, gi) => (
          <div key={`${date}-${filter}-${month}`} className="money-in" style={{ marginBottom: 16, animationDelay: `${0.08 + gi * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)' }}>{formatDate(date)}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                {VND(byDate[date].filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0))}
              </p>
            </div>
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {byDate[date].map((e, i) => (
                <div
                  key={e.id}
                  className="money-row"
                  onClick={() => setEditing(e)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                >
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
                </div>
              ))}
            </div>
          </div>
        ))
      }

      {editing && <EditExpenseForm expense={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ─── Quỹ tab ─────────────────────────────────────── */
function GoalsTab({ goals, addToGoal, withdrawFromGoal }: { goals: SavingsGoal[]; addToGoal: (id: string, n: number) => void; withdrawFromGoal: (id: string, n: number) => void }) {
  const [activeAction, setActiveAction] = useState<{ id: string; mode: 'deposit' | 'withdraw' } | null>(null);
  const [addAmt, setAddAmt] = useState('');
  const [amtError, setAmtError] = useState('');
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
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
          <div style={{ height: '100%', width: `${totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%`, background: 'white', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Add goal */}
      <button onClick={() => setShowAddGoal(true)} style={{
        width: '100%', padding: '11px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #E67F9A, #C95F7C)',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
      }}>+ Tạo quỹ mới</button>

      {goals.length === 0 && <EmptyState icon="💰" title="Chưa có quỹ nào" sub="Tạo quỹ đầu tiên để bắt đầu tiết kiệm." />}

      {/* Goals list */}
      {goals.map(g => {
        const pct = Math.round((g.current / g.target) * 100);
        return (
          <div key={g.id} className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={g.emoji} size={22} /></div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{g.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Mục tiêu: {g.deadline}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{pct}%</p>
                <button
                  onClick={() => setEditingGoal(g)}
                  style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                ><Icon emoji="✏️" size={12} /></button>
              </div>
            </div>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#5AC26A' : undefined }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{VND(g.current)}</span>
              <span>/ {VND(g.target)}</span>
            </div>
            {activeAction?.id === g.id ? (
              <div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AmountInput
                    placeholder="Số tiền (VND)" value={addAmt}
                    onChange={v => { setAddAmt(v); setAmtError(''); }}
                    style={{ flex: 1, padding: '8px 12px' }}
                  />
                  <button
                    onClick={() => {
                      const n = +addAmt;
                      if (!addAmt || isNaN(n) || n <= 0) { setAmtError('Nhập số tiền hợp lệ.'); return; }
                      if (activeAction.mode === 'withdraw' && n > g.current) { setAmtError('Số dư quỹ không đủ.'); return; }
                      if (activeAction.mode === 'deposit') addToGoal(g.id, n); else withdrawFromGoal(g.id, n);
                      setActiveAction(null); setAddAmt(''); setAmtError('');
                    }}
                    style={{ background: activeAction.mode === 'deposit' ? 'var(--sakura-accent)' : '#E8524A', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >{activeAction.mode === 'deposit' ? 'Nạp' : 'Rút'}</button>
                  <button
                    onClick={() => { setActiveAction(null); setAddAmt(''); setAmtError(''); }}
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center' }}
                  ><Icon emoji="✕" size={14} /></button>
                </div>
                {amtError && <p style={{ color: 'var(--sakura-deep)', fontSize: 12, marginTop: 6 }}>{amtError}</p>}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setActiveAction({ id: g.id, mode: 'deposit' })}
                  style={{ flex: 1, padding: '9px', background: 'var(--sakura-light)', border: 'none', borderRadius: 10, color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >+ Nạp tiền</button>
                <button
                  onClick={() => g.current > 0 && setActiveAction({ id: g.id, mode: 'withdraw' })}
                  disabled={g.current <= 0}
                  style={{ flex: 1, padding: '9px', background: g.current > 0 ? 'rgba(232,82,74,0.1)' : 'var(--bg)', border: 'none', borderRadius: 10, color: g.current > 0 ? '#E8524A' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: g.current > 0 ? 'pointer' : 'not-allowed', opacity: g.current > 0 ? 1 : 0.5 }}
                >− Rút quỹ</button>
              </div>
            )}
          </div>
        );
      })}

      {showAddGoal && <AddGoalForm onClose={() => setShowAddGoal(false)} />}
      {editingGoal && <EditGoalForm goal={editingGoal} onClose={() => setEditingGoal(null)} />}
    </div>
  );
}

/* ─── Thống kê helpers: 6 tháng động, tính theo tháng đang chọn ── */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthShortLabel(month: string): string {
  return `Th ${Number(month.slice(5, 7))}`;
}
function lastNMonths(anchor: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(anchor, -i));
  return out;
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

  const prevMonth = shiftMonth(month, -1);
  const prevMonthExp = expenses.filter(e => e.date.startsWith(prevMonth) && e.type !== 'income');
  const prevTotal = prevMonthExp.reduce((s: number, e: any) => s + e.amount, 0);
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  // Category breakdown, each with its share of the month and change vs last month
  const catMap: Record<string, { emoji: string; amount: number; count: number }> = {};
  for (const e of monthExp) {
    if (!catMap[e.category]) catMap[e.category] = { emoji: e.categoryEmoji, amount: 0, count: 0 };
    catMap[e.category].amount += e.amount;
    catMap[e.category].count += 1;
  }
  const prevCatMap: Record<string, number> = {};
  for (const e of prevMonthExp) prevCatMap[e.category] = (prevCatMap[e.category] || 0) + e.amount;
  const categories = Object.entries(catMap)
    .map(([cat, v]) => ({ cat, ...v, prevAmount: prevCatMap[cat] || 0 }))
    .sort((a, b) => b.amount - a.amount);
  const maxCat = categories[0]?.amount || 1;

  // Last 6 months ending at the selected month — computed dynamically, not from a fixed list
  const monthlyData = lastNMonths(month, 6).map(key => ({
    key,
    label: monthShortLabel(key),
    exp: expenses.filter(e => e.date.startsWith(key) && e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0),
  }));
  const sixMonthAvg = monthlyData.reduce((s, d) => s + d.exp, 0) / monthlyData.length;

  const topExpenses = [...monthExp].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Net amount moved to/from savings this month, broken down per Hũ (the auto-linked
  // "Nạp vào quỹ X" / "Rút từ quỹ X" transactions carry the jar's name in their title).
  const jarMap: Record<string, { emoji: string; net: number }> = {};
  for (const e of monthExp) {
    if (e.category !== 'Tiết kiệm') continue;
    const name = e.title.replace(/^Nạp vào quỹ /, '');
    if (!jarMap[name]) jarMap[name] = { emoji: e.categoryEmoji, net: 0 };
    jarMap[name].net += e.amount;
  }
  for (const e of monthInc) {
    if (e.category !== 'Tiết kiệm') continue;
    const name = e.title.replace(/^Rút từ quỹ /, '');
    if (!jarMap[name]) jarMap[name] = { emoji: e.categoryEmoji, net: 0 };
    jarMap[name].net -= e.amount;
  }
  const jarEntries = Object.entries(jarMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const savedThisMonth = jarEntries.reduce((s, j) => s + j.net, 0);

  // A few automatic, plain-language insights — only the ones that actually apply
  const insights: { icon: string; text: string }[] = [];
  if (categories.length > 0 && total > 0) {
    const top = categories[0];
    insights.push({ icon: top.emoji, text: `${top.cat} là danh mục chi nhiều nhất — ${VND(top.amount)} (${Math.round((top.amount / total) * 100)}% tổng chi).` });
  }
  const risers = categories
    .filter(c => c.prevAmount > 0 && c.amount > c.prevAmount)
    .map(c => ({ ...c, changePct: ((c.amount - c.prevAmount) / c.prevAmount) * 100 }))
    .sort((a, b) => b.changePct - a.changePct);
  if (risers[0] && risers[0].changePct >= 20) {
    insights.push({ icon: risers[0].emoji, text: `${risers[0].cat} tăng ${Math.round(risers[0].changePct)}% so với tháng trước.` });
  }
  if (sixMonthAvg > 0) {
    const avgDiff = ((total - sixMonthAvg) / sixMonthAvg) * 100;
    if (Math.abs(avgDiff) < 8) insights.push({ icon: '💡', text: `Chi tiêu tháng này xấp xỉ mức trung bình 6 tháng (${VND(sixMonthAvg)}).` });
    else insights.push({ icon: avgDiff > 0 ? '📈' : '📉', text: `Chi tiêu tháng này ${avgDiff > 0 ? 'cao hơn' : 'thấp hơn'} ${Math.round(Math.abs(avgDiff))}% so với trung bình 6 tháng (${VND(sixMonthAvg)}).` });
  }

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

      {/* Hero — tổng chi tiêu, % so tháng trước, thu nhập */}
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{MONTH_LABELS[month]} · Chi tiêu</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, color: 'white', lineHeight: 1.1, marginBottom: 6 }}>{VND(total)}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {change !== null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: change > 0 ? 'rgba(255,100,100,0.25)' : 'rgba(100,220,140,0.25)', borderRadius: 99, padding: '3px 10px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon emoji={change > 0 ? '↑' : '↓'} size={11} /> {Math.abs(change).toFixed(0)}% so tháng trước</span>
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

      {/* Ai đã chi? — gộp đóng góp từng người + tỉ lệ */}
      {total > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Ai đã chi?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {[
              { name: 'Alvin', amount: alvinT, color: '#4A8AE8' },
              { name: 'Paoi', amount: paoiT, color: '#E67F9A' },
              ...(bothT > 0 ? [{ name: 'Cả hai', amount: bothT, color: '#8B6FD4' }] : []),
            ].map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{p.name}</span>
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{VND(p.amount)}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-2)', marginLeft: 6 }}>{Math.round((p.amount / total) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1, background: 'var(--bg)' }}>
            {alvinT > 0 && <div style={{ width: `${(alvinT / total) * 100}%`, background: '#4A8AE8', transition: 'width 0.5s' }} />}
            {paoiT > 0 && <div style={{ width: `${(paoiT / total) * 100}%`, background: '#E67F9A', transition: 'width 0.5s' }} />}
            {bothT > 0 && <div style={{ flex: 1, background: '#8B6FD4', transition: 'width 0.5s' }} />}
          </div>
        </div>
      )}

      {/* Chi tiêu theo danh mục — % tổng chi + % so tháng trước */}
      {categories.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Chi tiêu theo danh mục</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categories.map(c => {
              const pctOfTotal = total > 0 ? Math.round((c.amount / total) * 100) : 0;
              const catChange = c.prevAmount > 0 ? ((c.amount - c.prevAmount) / c.prevAmount) * 100 : null;
              return (
                <div key={c.cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={c.emoji} size={14} /></div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.cat}</span>
                      <span style={{ fontSize: 10, color: 'var(--ink-2)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 99 }}>{c.count}x</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{VND(c.amount)}</span>
                      <span style={{ fontSize: 10, color: 'var(--ink-2)', marginLeft: 6 }}>{pctOfTotal}%</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg)', borderRadius: 99, overflow: 'hidden', marginBottom: catChange !== null ? 4 : 0 }}>
                    <div style={{ width: `${(c.amount / maxCat) * 100}%`, height: '100%', background: CAT_COLORS[c.cat] || '#A0A0A0', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                  {catChange !== null && (
                    <p style={{ fontSize: 10, color: catChange > 0 ? '#E8524A' : '#5AC26A', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Icon emoji={catChange > 0 ? '↑' : '↓'} size={10} /> {Math.abs(Math.round(catChange))}% so tháng trước
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tiết kiệm tháng này — ròng nạp/rút quỹ, ghi rõ cho từng Hũ */}
      {jarEntries.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Tiết kiệm tháng này</p>
            <span style={{ fontSize: 13, fontWeight: 700, color: savedThisMonth >= 0 ? '#5AC26A' : '#E8524A' }}>
              {savedThisMonth >= 0 ? '+' : '−'}{VND(Math.abs(savedThisMonth))}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jarEntries.map(j => (
              <div key={j.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon emoji={j.emoji} size={15} />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>{j.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: j.net >= 0 ? '#5AC26A' : '#E8524A' }}>
                  {j.net >= 0 ? '+' : '−'}{VND(Math.abs(j.net))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Đáng chú ý */}
      {insights.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Đáng chú ý</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.map((ins, i) => (
              <p key={i} style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon emoji={ins.icon} size={14} /><span>{ins.text}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 6 tháng gần nhất — tính động theo tháng đang chọn, + mức trung bình */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>6 tháng gần nhất</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>TB: <strong style={{ color: 'var(--ink)' }}>{VND(sixMonthAvg)}</strong></p>
        </div>
        <MonthlyBar data={monthlyData} avg={sixMonthAvg} />
      </div>

      {/* Top 5 khoản chi lớn nhất */}
      {topExpenses.length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Top 5 khoản chi lớn nhất</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topExpenses.map((e, i) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ width: 32, height: 32, background: 'var(--sakura-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{e.categoryEmoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
                  <p style={{ fontSize: 10, color: 'var(--ink-2)' }}>{formatDate(e.date)}</p>
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--sakura-deep)', flexShrink: 0 }}>{VND(e.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyBar({ data, avg }: { data: { key: string; label: string; exp: number }[]; avg: number }) {
  const max = Math.max(...data.map(d => d.exp), avg, 1);
  const avgPct = (avg / max) * 100;
  return (
    <div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 6, height: 68 }}>
        {avg > 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${avgPct}%`, borderTop: '1.5px dashed var(--ink-2)', opacity: 0.5 }} />
        )}
        {data.map(d => (
          <div key={d.key} style={{
            flex: 1, height: `${Math.max((d.exp / max) * 68, d.exp > 0 ? 6 : 0)}px`,
            background: 'linear-gradient(to top, var(--sakura-accent), var(--sakura-light))',
            borderRadius: '4px 4px 2px 2px', transition: 'height 0.4s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {data.map(d => (
          <p key={d.key} style={{ flex: 1, fontSize: 9, color: 'var(--ink-2)', textAlign: 'center', lineHeight: 1 }}>{d.label}</p>
        ))}
      </div>
    </div>
  );
}

/* ─── Hóa đơn tab ─────────────────────────────────── */
function BillsTab({ bills, onAdd, onTogglePaid }: {
  bills: Bill[];
  onAdd: (b: Omit<Bill, 'id' | 'seriesId' | 'billMonth'>) => void;
  onTogglePaid: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const today = new Date();
  const currentDay = today.getDate();

  // Recurring bills auto-roll into the current month (see rollBillsForward),
  // so only that month's instances are relevant here — past months stay in
  // the DB as paid history but aren't shown in this list.
  const currentMonth = today.toISOString().slice(0, 7);
  const monthBills = bills.filter(b => b.billMonth === currentMonth);

  const unpaid = monthBills.filter(b => !b.paid);
  const paid = monthBills.filter(b => b.paid);
  const totalUnpaid = unpaid.reduce((s, b) => s + b.amount, 0);
  const totalMonth = monthBills.reduce((s, b) => s + b.amount, 0);

  const getDueStatus = (dueDay: number, isPaid: boolean) => {
    if (isPaid) return { label: 'Đã trả', color: '#5AC26A', bg: 'rgba(90,194,106,0.1)' };
    const daysLeft = dueDay - currentDay;
    if (daysLeft < 0) return { label: 'Quá hạn', color: '#E8524A', bg: 'rgba(232,82,74,0.1)' };
    if (daysLeft <= 3) return { label: `Còn ${daysLeft} ngày`, color: '#E8844A', bg: 'rgba(232,132,74,0.1)' };
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
            {unpaid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onEdit={setEditingBill} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Đã thanh toán</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onEdit={setEditingBill} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {monthBills.length === 0 && <EmptyState icon="🧾" title="Chưa có hóa đơn" sub="Thêm các khoản cố định hàng tháng." />}

      {showForm && <AddBillForm onClose={() => setShowForm(false)} onAdd={onAdd} />}
      {editingBill && <EditBillForm bill={editingBill} onClose={() => setEditingBill(null)} />}
    </div>
  );
}

function BillCard({ bill: b, onTogglePaid, onEdit, getDueStatus }: {
  bill: Bill;
  onTogglePaid: (id: string) => void;
  onEdit: (bill: Bill) => void;
  getDueStatus: (dueDay: number, isPaid: boolean) => { label: string; color: string; bg: string };
}) {
  const status = getDueStatus(b.dueDay, b.paid);
  return (
    <div className="card" style={{ padding: '14px 16px', opacity: b.paid ? 0.7 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, background: b.paid ? 'rgba(90,194,106,0.1)' : 'rgba(139,111,212,0.1)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={b.emoji} size={22} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: b.paid ? 'var(--ink-2)' : 'var(--ink)', textDecoration: b.paid ? 'line-through' : 'none' }}>{b.title}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, padding: '2px 7px', borderRadius: 99 }}>{status.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>{BILL_CAT_LABELS[b.category]}</span>
            {b.frequencyMonths !== 1 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6FD4', background: 'rgba(139,111,212,0.1)', padding: '1px 6px', borderRadius: 99 }}>{frequencyLabel(b.frequencyMonths)}</span>
            )}
            {b.note && <span style={{ fontSize: 10, color: 'var(--ink-2)', opacity: 0.7 }}>· {b.note}</span>}
          </div>
          {b.paid && b.paidDate && (
            <p style={{ fontSize: 10, color: '#5AC26A', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}><Icon emoji="✓" size={10} /> Đã trả {formatDate(b.paidDate)}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: b.paid ? 'var(--ink-2)' : '#8B6FD4' }}>{VND(b.amount)}</p>
            <button
              onClick={() => onEdit(b)}
              style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 22, height: 22, flexShrink: 0, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            ><Icon emoji="✏️" size={10} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
    </div>
  );
}

function AddBillForm({ onClose, onAdd }: { onClose: () => void; onAdd: (b: Omit<Bill, 'id' | 'seriesId' | 'billMonth'>) => void }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🧾');
  const [category, setCategory] = useState<Bill['category']>('other');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [note, setNote] = useState('');
  const [frequencyMonths, setFrequencyMonths] = useState(1);

  const EMOJIS = ['🏠', '⚡', '💧', '📡', '🎬', '🎵', '🚗', '📱', '🏋️', '🛡️', '🧾'];
  const CAT_OPTIONS: { key: Bill['category']; label: string }[] = [
    { key: 'rent', label: 'Tiền nhà' },
    { key: 'utilities', label: 'Điện / Nước' },
    { key: 'internet', label: 'Internet' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'other', label: 'Khác' },
  ];

  const handleSubmit = () => {
    if (!title || !amount || !dueDay) return;
    onAdd({ title, emoji, category, amount: +amount, dueDay: +dueDay, paid: false, reminder: true, note, frequencyMonths });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Thêm hóa đơn</p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
        </div>

        {/* Emoji picker */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8 }}>ICON</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              width: 38, height: 38, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)',
              borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Icon emoji={e} size={18} /></button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input-field" placeholder="Tên hóa đơn" value={title} onChange={e => setTitle(e.target.value)} />

          <select className="input-field" value={category} onChange={e => setCategory(e.target.value as Bill['category'])}>
            {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Chu kỳ lặp lại</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {FREQUENCY_PRESETS.map(f => (
                <button key={f} onClick={() => setFrequencyMonths(f)} style={{
                  padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  border: frequencyMonths === f ? 'none' : '1.5px solid var(--border)',
                  background: frequencyMonths === f ? '#8B6FD4' : 'var(--bg)',
                  color: frequencyMonths === f ? 'white' : 'var(--ink-2)',
                }}>{frequencyLabel(f)}</button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input className="input-field" type="number" min="1" max="60" value={frequencyMonths}
                onChange={e => setFrequencyMonths(Math.min(60, Math.max(1, +e.target.value || 1)))}
                style={{ width: 90 }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>tháng / lần (tùy chỉnh)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AmountInput placeholder="Số tiền (VND)" value={amount} onChange={setAmount} />
            <input className="input-field" type="number" placeholder="Ngày đến hạn" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>

          <input className="input-field" placeholder="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} />

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
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji={icon} size={40} /></div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{sub}</p>
    </div>
  );
}
