import { useEffect, useState } from 'react';
import { useApp } from '../context';
import AddExpenseForm from '../components/forms/AddExpenseForm';
import AddIncomeForm from '../components/forms/AddIncomeForm';
import EditExpenseForm from '../components/forms/EditExpenseForm';
import AddGoalForm from '../components/forms/AddGoalForm';
import EditGoalForm from '../components/forms/EditGoalForm';
import EditBillForm from '../components/forms/EditBillForm';
import AmountInput from '../components/AmountInput';
import Icon from '../components/Icon';
import FilterCountBadge from '../components/FilterCountBadge';
import type { Bill, Debt, Expense, PrivateExpense, PrivateJar, SavingsGoal } from '../types';

type Tab = 'expenses' | 'goals' | 'stats' | 'bills' | 'debts' | 'private';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'expenses', label: 'Expenses', icon: '💸' },
  { key: 'goals', label: 'Goals', icon: '💰' },
  { key: 'bills', label: 'Bills', icon: '🧾' },
  { key: 'debts', label: 'Debts', icon: '📒' },
  { key: 'stats', label: 'Stats', icon: '📊' },
];
// Only ever added to the tab bar for Alvinne's account (see Money()) — a
// personal stash, not a couple feature.
const PRIVATE_TAB: { key: Tab; label: string; icon: string } = { key: 'private', label: 'Private Stash', icon: '🔐' };

const CAT_COLORS: Record<string, string> = {
  Food: 'var(--sakura-accent)', Coffee: '#C48A52', Entertainment: '#8B6FD4',
  Home: '#4AAEAA', Transportation: '#4A8AE8', Gifts: '#E8844A',
  Shopping: '#D4A028', Health: '#5AC26A', Other: '#A0A0A0',
};

// Was a hardcoded 6-entry array anchored to August 2026 — correct only for
// that one month, permanently "stuck" on it afterward instead of rolling
// forward. Computed from the real current date instead, so the dropdown/chip
// list and its default selection are always the actual last 6 months.
function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const d = new Date();
  d.setDate(1); // pin to day 1 first so setMonth() below can't skip/repeat a
  // month on a day that doesn't exist in the target month (e.g. the 31st).
  for (let i = 0; i < count; i++) {
    months.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}
const MONTHS = getRecentMonths(6);
function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

const VND = (n: number) => `${Math.round(n).toLocaleString('en-US')} VND`;

const BILL_CAT_LABELS: Record<string, string> = {
  rent: 'Rent',
  utilities: 'Electricity / Water',
  internet: 'Internet',
  subscription: 'Subscription',
  other: 'Other',
};

const FREQUENCY_PRESETS = [1, 2, 3, 6, 12];
function frequencyLabel(n: number): string {
  if (n === 1) return 'Monthly';
  if (n === 12) return 'Yearly';
  return `Every ${n} months`;
}

export default function Money() {
  const { state, screen, isAdmin, addToGoal, withdrawFromGoal, addBill, toggleBillPaid } = useApp();
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const tabs = isAdmin ? [...TABS, PRIVATE_TAB] : TABS;

  // A Bill/Savings-goal notification and the Money tab itself all land on
  // this same kept-alive screen (see App.tsx's ScreenRouter) — this is the
  // only way to tell them apart post-mount, since a repeat tap on any of
  // them doesn't remount the component. The bottom nav's own Money button
  // uses the plain 'money' screen value (no case here), so it always opens
  // on whichever tab was last showing — Expenses by default — rather than
  // being forced onto one tab every time.
  useEffect(() => {
    if (screen === 'bills') setTab('bills');
    else if (screen === 'goals') setTab('goals');
    else if (screen === 'debts') setTab('debts');
  }, [screen]);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Tab bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 3,
        background: 'var(--bg)', borderRadius: 16, padding: 4, marginBottom: 20,
        border: '1px solid var(--border)',
      }}>
        {tabs.map(t => (
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
        {tab === 'debts' && <DebtsTab />}
        {tab === 'private' && isAdmin && <PrivateFundTab />}
      </div>

      {showAddExpense && <AddExpenseForm onClose={() => setShowAddExpense(false)} />}
      {showAddIncome && <AddIncomeForm onClose={() => setShowAddIncome(false)} />}
    </div>
  );
}

/* ─── Private Stash — a personal fund, Alvinne's account only ───────── */

const PRIVATE_CATEGORIES: { key: string; emoji: string }[] = [
  { key: 'Food', emoji: '🍜' },
  { key: 'Coffee', emoji: '☕' },
  { key: 'Shopping', emoji: '🛍️' },
  { key: 'Entertainment', emoji: '🎮' },
  { key: 'Transport', emoji: '🚗' },
  { key: 'Other', emoji: '💰' },
];

function privateTodayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function PrivateFundTab() {
  const [subTab, setSubTab] = useState<'ledger' | 'jars'>('ledger');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg)', borderRadius: 12, padding: 4 }}>
        {([['ledger', 'Ledger'], ['jars', 'Jars']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: subTab === key ? 'var(--card)' : 'none', color: subTab === key ? 'var(--sakura-deep)' : 'var(--ink-2)', boxShadow: subTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>
      {subTab === 'ledger' ? <PrivateLedgerTab /> : <PrivateJarsTab />}
    </div>
  );
}

function PrivateLedgerTab() {
  const { state, addPrivateExpense, deletePrivateExpense } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(PRIVATE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(privateTodayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const openAdd = (t: 'expense' | 'income') => {
    setType(t); setTitle(''); setCategory(PRIVATE_CATEGORIES[0]); setAmount(''); setDate(privateTodayISO()); setNote(''); setError('');
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  const handleSubmit = () => {
    if (!title.trim()) { setError('Enter a title.'); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Enter a valid amount.'); return; }
    addPrivateExpense({ title: title.trim(), category: category.key, categoryEmoji: category.emoji, amount: +amount, date, note: note.trim(), type });
    closeForm();
  };

  const totalIncome = state.privateExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = state.privateExpenses.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpense;
  const confirming = state.privateExpenses.find(e => e.id === confirmDeleteId);

  const byDate: Record<string, PrivateExpense[]> = {};
  for (const e of state.privateExpenses) { (byDate[e.date] ??= []).push(e); }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div style={{ background: net >= 0 ? 'linear-gradient(135deg, #5AC26A, #3D8A4E)' : 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 20, padding: '18px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Balance</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 31, color: 'white', lineHeight: 1.1 }}>{VND(net)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Income {VND(totalIncome)} · Spent {VND(totalExpense)}</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => openAdd('income')} style={{ flex: 1, padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5AC26A, #3D8A4E)', color: 'white', fontWeight: 700, fontSize: 14 }}>+ Income</button>
        <button onClick={() => openAdd('expense')} style={{ flex: 1, padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 14 }}>+ Expense</button>
      </div>

      {dates.length === 0 ? (
        <EmptyState icon="🔐" title="No transactions yet" sub="Add your first private income or expense." />
      ) : dates.map(date => (
        <div key={date} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>{formatDate(date)}</p>
          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            {byDate[date].map((e, i) => (
              <div key={e.id} onClick={() => setConfirmDeleteId(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 40, height: 40, background: e.type === 'income' ? 'rgba(90,194,106,0.12)' : 'var(--sakura-light)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>{e.categoryEmoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{e.category}</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, flexShrink: 0, color: e.type === 'income' ? '#5AC26A' : 'var(--sakura-deep)' }}>{e.type === 'income' ? '+' : '-'}{VND(e.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showForm && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>{type === 'income' ? 'Add income' : 'Add expense'}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Category</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRIVATE_CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setCategory(c)} style={{ padding: '7px 11px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: category.key === c.key ? 'var(--sakura-light)' : 'var(--bg)', border: category.key === c.key ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: category.key === c.key ? 'var(--sakura-deep)' : 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon emoji={c.emoji} size={12} /> {c.key}
                    </button>
                  ))}
                </div>
              </div>
              <AmountInput placeholder="Amount (VND)" value={amount} onChange={setAmount} />
              <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
              {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
              <button onClick={handleSubmit} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this entry?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{confirming.title} — {VND(confirming.amount)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deletePrivateExpense(confirming.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const JAR_EMOJI_CHOICES = ['🫙', '🎯', '🏖️', '🎁', '📱', '🚗', '🏠', '✈️', '🎮', '👟'];

function PrivateJarsTab() {
  const { state, addPrivateJar, updatePrivateJar, deletePrivateJar, depositToPrivateJar, withdrawFromPrivateJar } = useApp();
  const jars = state.privateJars;
  const [activeAction, setActiveAction] = useState<{ id: string; mode: 'deposit' | 'withdraw' } | null>(null);
  const [addAmt, setAddAmt] = useState('');
  const [amtError, setAmtError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PrivateJar | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(JAR_EMOJI_CHOICES[0]);
  const [hasTarget, setHasTarget] = useState(false);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  const totalSaved = jars.reduce((s, j) => s + j.current, 0);

  const openAdd = () => {
    setTitle(''); setEmoji(JAR_EMOJI_CHOICES[0]); setHasTarget(false); setTarget(''); setError('');
    setShowForm(true);
  };
  const openEdit = (j: PrivateJar) => {
    setTitle(j.title); setEmoji(j.emoji); setHasTarget(j.target != null); setTarget(j.target != null ? String(Math.round(j.target)) : ''); setError('');
    setEditing(j);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = () => {
    if (!title.trim()) { setError('Enter a name for this jar.'); return; }
    if (hasTarget && (!target || isNaN(+target) || +target <= 0)) { setError('Enter a valid target amount.'); return; }
    const data = { title: title.trim(), emoji, target: hasTarget ? +target : undefined };
    if (editing) updatePrivateJar(editing.id, data);
    else addPrivateJar(data);
    closeForm();
  };

  const confirming = jars.find(j => j.id === confirmDeleteId);

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 24, padding: '24px 20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total saved</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, color: 'white', lineHeight: 1 }}>{VND(totalSaved)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{jars.length} jar{jars.length === 1 ? '' : 's'}</p>
      </div>

      <button onClick={openAdd} style={{ width: '100%', padding: '11px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 14 }}>+ New jar</button>

      {jars.length === 0 && <EmptyState icon="🫙" title="No jars yet" sub="Create a jar to start setting money aside." />}

      {jars.map(j => {
        const pct = j.target ? Math.round((j.current / j.target) * 100) : null;
        return (
          <div key={j.id} className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, background: 'var(--sakura-light)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={j.emoji} size={22} /></div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{j.title}</p>
                  {j.target != null && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Target: {VND(j.target)}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {pct != null && <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{pct}%</p>}
                <button onClick={() => openEdit(j)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={12} /></button>
                <button onClick={() => setConfirmDeleteId(j.id)} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 26, height: 26, cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={12} /></button>
              </div>
            </div>
            {pct != null && (
              <div className="progress-bar" style={{ marginBottom: 8 }}>
                <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 100 ? '#5AC26A' : undefined }} />
              </div>
            )}
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--sakura-deep)', marginBottom: 12 }}>{VND(j.current)}</p>
            {activeAction?.id === j.id ? (
              <div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <AmountInput
                    placeholder="Amount (VND)" value={addAmt}
                    onChange={v => { setAddAmt(v); setAmtError(''); }}
                    style={{ flex: 1, padding: '8px 12px' }}
                  />
                  <button
                    onClick={() => {
                      const n = +addAmt;
                      if (!addAmt || isNaN(n) || n <= 0) { setAmtError('Enter a valid amount.'); return; }
                      if (activeAction.mode === 'withdraw' && n > j.current) { setAmtError('Not enough left in this jar.'); return; }
                      if (activeAction.mode === 'deposit') depositToPrivateJar(j.id, n); else withdrawFromPrivateJar(j.id, n);
                      setActiveAction(null); setAddAmt(''); setAmtError('');
                    }}
                    style={{ background: activeAction.mode === 'deposit' ? 'var(--sakura-accent)' : '#E8524A', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >{activeAction.mode === 'deposit' ? 'Deposit' : 'Withdraw'}</button>
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
                  onClick={() => setActiveAction({ id: j.id, mode: 'deposit' })}
                  style={{ flex: 1, padding: '9px', background: 'var(--sakura-light)', border: 'none', borderRadius: 10, color: 'var(--sakura-deep)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >+ Deposit</button>
                <button
                  onClick={() => j.current > 0 && setActiveAction({ id: j.id, mode: 'withdraw' })}
                  disabled={j.current <= 0}
                  style={{ flex: 1, padding: '9px', background: j.current > 0 ? 'rgba(232,82,74,0.1)' : 'var(--bg)', border: 'none', borderRadius: 10, color: j.current > 0 ? '#E8524A' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: j.current > 0 ? 'pointer' : 'not-allowed', opacity: j.current > 0 ? 1 : 0.5 }}
                >− Withdraw</button>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, textAlign: 'center' }}>Deposits are deducted from the Ledger; withdrawals are added back.</p>

      {(showForm || editing) && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)' }}>{editing ? 'Edit jar' : 'New jar'}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input-field" placeholder="Jar name" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Icon</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {JAR_EMOJI_CHOICES.map(e => (
                    <button key={e} onClick={() => setEmoji(e)} style={{ width: 36, height: 36, border: emoji === e ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', borderRadius: 10, background: emoji === e ? 'var(--sakura-light)' : 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji={e} size={16} /></button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--bg)', cursor: 'pointer' }}>
                <input type="checkbox" checked={hasTarget} onChange={e => setHasTarget(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--sakura-accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Set a target amount</span>
              </label>
              {hasTarget && <AmountInput placeholder="Target (VND)" value={target} onChange={setTarget} />}
              {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
              <button onClick={handleSubmit} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>{editing ? 'Save changes' : 'Create jar'}</button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this jar?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{confirming.title} — {VND(confirming.current)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deletePrivateJar(confirming.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Expenses tab ─────────────────────────────────── */
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
        background: net >= 0 ? 'linear-gradient(135deg, #5AC26A, #3D8A4E)' : 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        borderRadius: 20, padding: '18px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Remaining</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 31, color: 'white', lineHeight: 1.1 }}>{VND(net)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>Income {VND(totalIncome)} · Spent {VND(totalExpense)}</p>
      </div>

      {/* Summary strip */}
      <div key={`sum-${filter}-${month}`} className="money-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, animationDelay: '0.04s' }}>
        <div style={{ background: 'linear-gradient(135deg, #5AC26A, #38a853)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Income</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'white', lineHeight: 1 }}>{VND(totalIncome)}</p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Expenses</p>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'white', lineHeight: 1 }}>{VND(totalExpense)}</p>
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
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expense'}
              <FilterCountBadge count={expenses.filter(e => (month === 'all' || e.date.startsWith(month)) && (f === 'all' || (f === 'income' ? e.type === 'income' : e.type !== 'income'))).length} />
            </button>
          ))}
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ink-2)', cursor: 'pointer' }}
        >
          <option value="all">All</option>
          {MONTHS.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
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
        }}>+ Income</button>
        <button onClick={onAdd} style={{
          flex: 1, padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
          color: 'white', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
          transition: 'transform 0.15s ease',
        }}>+ Expense</button>
      </div>

      {/* Grouped list */}
      {dates.length === 0
        ? <EmptyState icon="💸" title="No transactions yet" sub="Add your first income or expense to get started." />
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
                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0,
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
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', borderRadius: 24, padding: '24px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -24, right: -24, width: 100, height: 100, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total savings</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, color: 'white', lineHeight: 1, marginBottom: 6 }}>{VND(totalSaved)}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Target: {VND(totalTarget)} · {goals.length} goals</p>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0}%`, background: 'var(--white)', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
      </div>

      {/* Add goal */}
      <button onClick={() => setShowAddGoal(true)} style={{
        width: '100%', padding: '11px', marginBottom: 16, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        color: 'white', fontWeight: 700, fontSize: 14,
        boxShadow: '0 4px 12px rgba(201,95,124,0.3)',
      }}>+ Create new goal</button>

      {goals.length === 0 && <EmptyState icon="💰" title="No goals yet" sub="Create your first goal to start saving." />}

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
                  <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Target: {g.deadline}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: pct >= 100 ? '#5AC26A' : 'var(--sakura-deep)' }}>{pct}%</p>
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
                    placeholder="Amount (VND)" value={addAmt}
                    onChange={v => { setAddAmt(v); setAmtError(''); }}
                    style={{ flex: 1, padding: '8px 12px' }}
                  />
                  <button
                    onClick={() => {
                      const n = +addAmt;
                      if (!addAmt || isNaN(n) || n <= 0) { setAmtError('Enter a valid amount.'); return; }
                      if (activeAction.mode === 'withdraw' && n > g.current) { setAmtError('Not enough left in this goal.'); return; }
                      if (activeAction.mode === 'deposit') addToGoal(g.id, n); else withdrawFromGoal(g.id, n);
                      setActiveAction(null); setAddAmt(''); setAmtError('');
                    }}
                    style={{ background: activeAction.mode === 'deposit' ? 'var(--sakura-accent)' : '#E8524A', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}
                  >{activeAction.mode === 'deposit' ? 'Deposit' : 'Withdraw'}</button>
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
                >+ Add money</button>
                <button
                  onClick={() => g.current > 0 && setActiveAction({ id: g.id, mode: 'withdraw' })}
                  disabled={g.current <= 0}
                  style={{ flex: 1, padding: '9px', background: g.current > 0 ? 'rgba(232,82,74,0.1)' : 'var(--bg)', border: 'none', borderRadius: 10, color: g.current > 0 ? '#E8524A' : 'var(--ink-2)', fontWeight: 700, fontSize: 13, cursor: g.current > 0 ? 'pointer' : 'not-allowed', opacity: g.current > 0 ? 1 : 0.5 }}
                >− Withdraw</button>
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
  const abbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return abbr[Number(month.slice(5, 7)) - 1];
}
function lastNMonths(anchor: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(anchor, -i));
  return out;
}

// Same idea as getRecentMonths above, but for the Stats tab's Year mode —
// a "YYYY" key is still a valid prefix of a "YYYY-MM-DD" date string, so
// every `.date.startsWith(key)` filter below works unchanged whether `key`
// is a month or a full year.
function getRecentYears(count: number): string[] {
  const y = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => String(y - i));
}
const YEARS = getRecentYears(5);
function lastNYears(anchor: string, n: number): string[] {
  const anchorYear = Number(anchor);
  return Array.from({ length: n }, (_, i) => String(anchorYear - (n - 1 - i)));
}

/* ─── Thống kê tab ────────────────────────────────── */
function StatsTab({ expenses }: { expenses: any[] }) {
  const { currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [month, setMonth] = useState(MONTHS[0]);
  const [year, setYear] = useState(YEARS[0]);
  // Every filter/label below reads `period` (whichever picker is active),
  // not `month` directly — a "YYYY" key is still a valid prefix of a
  // "YYYY-MM-DD" date string, so the exact same `.startsWith(period)` calls
  // work unchanged for both a month and a full year.
  const period = mode === 'month' ? month : year;
  const periodLabel = mode === 'month' ? monthLabel(month) : year;
  const monthExp = expenses.filter(e => e.date.startsWith(period) && e.type !== 'income');
  const monthInc = expenses.filter(e => e.date.startsWith(period) && e.type === 'income');
  const total = monthExp.reduce((s: number, e: any) => s + e.amount, 0);
  const totalInc = monthInc.reduce((s: number, e: any) => s + e.amount, 0);
  const alvinT = monthExp.filter((e: any) => e.paidBy === currentUser).reduce((s: number, e: any) => s + e.amount, 0);
  const paoiT = partnerName ? monthExp.filter((e: any) => e.paidBy === partnerName).reduce((s: number, e: any) => s + e.amount, 0) : 0;
  const bothT = monthExp.filter((e: any) => e.paidBy === 'Both').reduce((s: number, e: any) => s + e.amount, 0);

  const prevPeriod = mode === 'month' ? shiftMonth(month, -1) : String(+year - 1);
  const prevPeriodLabel = mode === 'month' ? 'last month' : 'last year';
  const prevMonthExp = expenses.filter(e => e.date.startsWith(prevPeriod) && e.type !== 'income');
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

  // Last 6 months (or last 5 years, in Year mode) ending at the selected
  // period — computed dynamically, not from a fixed list.
  const trendKeys = mode === 'month' ? lastNMonths(month, 6) : lastNYears(year, 5);
  const monthlyData = trendKeys.map(key => ({
    key,
    label: mode === 'month' ? monthShortLabel(key) : key,
    exp: expenses.filter(e => e.date.startsWith(key) && e.type !== 'income').reduce((s: number, e: any) => s + e.amount, 0),
  }));
  const sixMonthAvg = monthlyData.reduce((s, d) => s + d.exp, 0) / monthlyData.length;

  const topExpenses = [...monthExp].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // Net amount moved to/from savings this month, broken down per fund (the auto-linked
  // "Deposit to X" / "Withdraw from X" transactions carry the fund's name in their title).
  const jarMap: Record<string, { emoji: string; net: number }> = {};
  for (const e of monthExp) {
    if (e.category !== 'Savings') continue;
    const name = e.title.replace(/^Deposit to /, '');
    if (!jarMap[name]) jarMap[name] = { emoji: e.categoryEmoji, net: 0 };
    jarMap[name].net += e.amount;
  }
  for (const e of monthInc) {
    if (e.category !== 'Savings') continue;
    const name = e.title.replace(/^Withdraw from /, '');
    if (!jarMap[name]) jarMap[name] = { emoji: e.categoryEmoji, net: 0 };
    jarMap[name].net -= e.amount;
  }
  const jarEntries = Object.entries(jarMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  const savedThisMonth = jarEntries.reduce((s, j) => s + j.net, 0);

  // A few automatic, plain-language insights — only the ones that actually apply
  const insights: { icon: string; text: string }[] = [];
  if (categories.length > 0 && total > 0) {
    const top = categories[0];
    insights.push({ icon: top.emoji, text: `${top.cat} is your biggest spending category — ${VND(top.amount)} (${Math.round((top.amount / total) * 100)}% of total spending).` });
  }
  const risers = categories
    .filter(c => c.prevAmount > 0 && c.amount > c.prevAmount)
    .map(c => ({ ...c, changePct: ((c.amount - c.prevAmount) / c.prevAmount) * 100 }))
    .sort((a, b) => b.changePct - a.changePct);
  if (risers[0] && risers[0].changePct >= 20) {
    insights.push({ icon: risers[0].emoji, text: `${risers[0].cat} is up ${Math.round(risers[0].changePct)}% from ${prevPeriodLabel}.` });
  }
  const trendLabel = mode === 'month' ? '6-month' : '5-year';
  const periodNoun = mode === 'month' ? "month's" : "year's";
  if (sixMonthAvg > 0) {
    const avgDiff = ((total - sixMonthAvg) / sixMonthAvg) * 100;
    if (Math.abs(avgDiff) < 8) insights.push({ icon: '💡', text: `This ${periodNoun} spending is about the same as your ${trendLabel} average (${VND(sixMonthAvg)}).` });
    else insights.push({ icon: avgDiff > 0 ? '📈' : '📉', text: `This ${periodNoun} spending is ${avgDiff > 0 ? 'higher' : 'lower'} than your ${trendLabel} average by ${Math.round(Math.abs(avgDiff))}% (${VND(sixMonthAvg)}).` });
  }

  return (
    <div>
      {/* Month/Year mode toggle */}
      <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 10, width: 'fit-content' }}>
        {(['month', 'year'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: mode === m ? 'var(--sakura-accent)' : 'transparent',
            color: mode === m ? 'white' : 'var(--ink-2)',
            transition: 'all 0.2s ease',
          }}>{m === 'month' ? 'By month' : 'By year'}</button>
        ))}
      </div>

      {/* Month/Year picker */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {(mode === 'month' ? MONTHS : YEARS).map(m => (
          <button key={m} onClick={() => mode === 'month' ? setMonth(m) : setYear(m)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 700,
            background: m === period ? 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))' : 'var(--white)',
            color: m === period ? 'white' : 'var(--ink-2)',
            border: m === period ? 'none' : '1px solid var(--border)',
            boxShadow: m === period ? '0 2px 8px rgba(201,95,124,0.3)' : 'none',
          }}>{mode === 'month' ? monthLabel(m) : m}</button>
        ))}
      </div>

      {/* Hero — tổng chi tiêu, % so tháng trước, thu nhập */}
      <div style={{ background: 'linear-gradient(135deg, var(--sakura-deep), #a8436a)', borderRadius: 20, padding: '20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{periodLabel} · Spending</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, color: 'white', lineHeight: 1.1, marginBottom: 6 }}>{VND(total)}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {change !== null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: change > 0 ? 'rgba(255,100,100,0.25)' : 'rgba(100,220,140,0.25)', borderRadius: 99, padding: '3px 10px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon emoji={change > 0 ? '↑' : '↓'} size={11} /> {Math.abs(change).toFixed(0)}% vs {prevPeriodLabel}</span>
            </div>
          )}
          {totalInc > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(90,194,106,0.25)', borderRadius: 99, padding: '3px 10px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>Income: {VND(totalInc)}</span>
            </div>
          )}
        </div>
        {monthExp.length === 0 && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6 }}>No transactions yet</p>}
      </div>

      {/* Ai đã chi? — gộp đóng góp từng người + tỉ lệ */}
      {total > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Who paid?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {[
              { name: currentUser, amount: alvinT, color: '#4A8AE8' },
              ...(partnerName ? [{ name: partnerName, amount: paoiT, color: 'var(--sakura-accent)' }] : []),
              ...(bothT > 0 ? [{ name: 'Both', amount: bothT, color: '#8B6FD4' }] : []),
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
            {paoiT > 0 && <div style={{ width: `${(paoiT / total) * 100}%`, background: 'var(--sakura-accent)', transition: 'width 0.5s' }} />}
            {bothT > 0 && <div style={{ flex: 1, background: '#8B6FD4', transition: 'width 0.5s' }} />}
          </div>
        </div>
      )}

      {/* Chi tiêu theo danh mục — % tổng chi + % so tháng trước */}
      {categories.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Spending by category</p>
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
                      <Icon emoji={catChange > 0 ? '↑' : '↓'} size={10} /> {Math.abs(Math.round(catChange))}% vs {prevPeriodLabel}
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
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Savings this month</p>
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
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Worth noting</p>
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
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{mode === 'month' ? 'Last 6 months' : 'Last 5 years'}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>Avg: <strong style={{ color: 'var(--ink)' }}>{VND(sixMonthAvg)}</strong></p>
        </div>
        <MonthlyBar data={monthlyData} avg={sixMonthAvg} />
      </div>

      {/* Top 5 khoản chi lớn nhất */}
      {topExpenses.length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Top 5 biggest expenses</p>
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
    if (isPaid) return { label: 'Paid', color: '#5AC26A', bg: 'rgba(90,194,106,0.1)' };
    const daysLeft = dueDay - currentDay;
    if (daysLeft < 0) return { label: 'Overdue', color: '#E8524A', bg: 'rgba(232,82,74,0.1)' };
    if (daysLeft <= 3) return { label: `${daysLeft} days left`, color: '#E8844A', bg: 'rgba(232,132,74,0.1)' };
    return { label: `Day ${dueDay}`, color: 'var(--ink-2)', bg: 'var(--bg)' };
  };

  return (
    <div>
      {/* Summary */}
      <div style={{ background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)', borderRadius: 20, padding: '20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Due this month</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, color: 'white', lineHeight: 1.1, marginBottom: 8 }}>{VND(totalUnpaid)}</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Unpaid</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{unpaid.length} bills</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Paid</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{paid.length} bills</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 1 }}>Total this month</p>
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
      }}>+ Add bill</button>

      {/* Unpaid */}
      {unpaid.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Unpaid</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {unpaid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onEdit={setEditingBill} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Paid</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {paid.map(b => <BillCard key={b.id} bill={b} onTogglePaid={onTogglePaid} onEdit={setEditingBill} getDueStatus={getDueStatus} />)}
          </div>
        </div>
      )}

      {monthBills.length === 0 && <EmptyState icon="🧾" title="No bills yet" sub="Add your recurring monthly bills." />}

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
            <p style={{ fontSize: 10, color: '#5AC26A', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}><Icon emoji="✓" size={10} /> Paid {formatDate(b.paidDate)}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: b.paid ? 'var(--ink-2)' : '#8B6FD4' }}>{VND(b.amount)}</p>
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
            >{b.paid ? 'Undo' : 'Paid'}</button>
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
    { key: 'rent', label: 'Rent' },
    { key: 'utilities', label: 'Electricity / Water' },
    { key: 'internet', label: 'Internet' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'other', label: 'Other' },
  ];

  const handleSubmit = () => {
    if (!title || !amount || !dueDay) return;
    onAdd({ title, emoji, category, amount: +amount, dueDay: +dueDay, paid: false, reminder: true, note, frequencyMonths });
    onClose();
  };

  return (
    <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 23, color: 'var(--ink)' }}>Add bill</p>
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
          <input className="input-field" placeholder="Bill name" value={title} onChange={e => setTitle(e.target.value)} />

          <select className="input-field" value={category} onChange={e => setCategory(e.target.value as Bill['category'])}>
            {CAT_OPTIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>

          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Repeats</p>
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
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>months (custom)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <AmountInput placeholder="Amount (VND)" value={amount} onChange={setAmount} />
            <input className="input-field" type="number" placeholder="Due day" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
          </div>

          <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />

          <button onClick={handleSubmit} style={{
            padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B6FD4, #6A4FB8)',
            color: 'white', fontWeight: 700, fontSize: 15,
          }}>Add bill</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Debt tracker ("Sổ nợ") — money owed between you and someone outside the couple ── */

function debtTodayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatShortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

function DebtsTab() {
  const { state, currentUser, partnerProfile, addDebt, updateDebt, payDebt, resetDebtPayments, deleteDebt } = useApp();
  const partnerName = partnerProfile?.displayName ?? '';
  // Just the two of you — no "All", since with only two people it's
  // always more useful to see one person's full picture (what they owe,
  // and what's owed to them) at a glance.
  const [filter, setFilter] = useState(currentUser);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [direction, setDirection] = useState<'they_owe' | 'i_owe'>('they_owe');
  const [debtorName, setDebtorName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(debtTodayISO());
  const [dueDate, setDueDate] = useState('');
  const [createdByChoice, setCreatedByChoice] = useState(currentUser);
  const [countInMoney, setCountInMoney] = useState(false);
  const [error, setError] = useState('');

  const openAdd = () => {
    setDirection('they_owe');
    setDebtorName(''); setAmount(''); setNote(''); setDate(debtTodayISO()); setDueDate(''); setCreatedByChoice(filter); setCountInMoney(false); setError('');
    setShowForm(true);
  };
  const openEdit = (d: Debt) => {
    setDirection(d.direction);
    setDebtorName(d.debtorName); setAmount(String(Math.round(d.amount))); setNote(d.note ?? ''); setDate(d.date); setDueDate(d.dueDate ?? ''); setCreatedByChoice(d.createdBy); setCountInMoney(d.countInMoney); setError('');
    setEditing(d);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = () => {
    if (!debtorName.trim()) { setError(direction === 'they_owe' ? "Enter the debtor's name." : 'Enter who you owe.'); return; }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Enter a valid amount.'); return; }
    const data = { direction, debtorName: debtorName.trim(), amount: +amount, note: note.trim() || undefined, date, dueDate: dueDate || undefined, createdBy: createdByChoice, countInMoney };
    if (editing) updateDebt(editing.id, data);
    else addDebt(data);
    closeForm();
  };

  const openPay = (d: Debt) => {
    setPaymentAmount(String(Math.round(d.amount - d.paidAmount)));
    setPaymentError('');
    setPayingDebt(d);
  };
  const handlePay = () => {
    if (!payingDebt) return;
    const n = +paymentAmount;
    if (!paymentAmount || isNaN(n) || n <= 0) { setPaymentError('Enter a valid amount.'); return; }
    payDebt(payingDebt.id, n);
    setPayingDebt(null);
  };

  // A debt logged as "Both" concerns either partner, so it shows up under
  // whichever of the two tabs you're looking at.
  const personDebts = state.debts.filter(d => d.createdBy === filter || d.createdBy === 'Both');
  const unpaidCount = personDebts.filter(d => !d.paid).length;
  const paidCount = personDebts.filter(d => d.paid).length;
  const confirmingDebt = state.debts.find(d => d.id === confirmDeleteId);
  const today = debtTodayISO();

  const sortDebts = (list: Debt[]) => [
    ...list.filter(d => !d.paid).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')),
    ...list.filter(d => d.paid),
  ];
  // "{filter} owes" — i_owe debts logged for them. "Owed to {filter}" —
  // they_owe debts logged for them (someone else owes this person).
  const iOweList = sortDebts(personDebts.filter(d => d.direction === 'i_owe'));
  const theyOweList = sortDebts(personDebts.filter(d => d.direction === 'they_owe'));
  const iOweUnpaidTotal = iOweList.filter(d => !d.paid).reduce((s, d) => s + (d.amount - d.paidAmount), 0);
  const theyOweUnpaidTotal = theyOweList.filter(d => !d.paid).reduce((s, d) => s + (d.amount - d.paidAmount), 0);

  function renderDebtCard(d: Debt) {
    const overdue = !d.paid && d.dueDate && d.dueDate < today;
    const remaining = d.amount - d.paidAmount;
    return (
      <div key={d.id} className="card" style={{ padding: '14px 16px', opacity: d.paid ? 0.6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: d.paid ? 'var(--bg)' : overdue ? '#FEE2E2' : 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon emoji={d.paid ? '✅' : overdue ? '⏰' : d.direction === 'they_owe' ? '📒' : '📤'} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', textDecoration: d.paid ? 'line-through' : 'none' }}>{d.debtorName}</p>
            {d.note && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{d.note}</p>}
            <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 3 }}>{d.direction === 'they_owe' ? 'Lent on' : 'Borrowed on'}: {formatShortDate(d.date)}{d.createdBy === 'Both' && ' · Both'}</p>
            {d.dueDate && !d.paid && (
              <p style={{ fontSize: 11, color: overdue ? '#DC2626' : 'var(--ink-2)', fontWeight: overdue ? 700 : 400, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                {overdue && <Icon emoji="⚠️" size={11} />} Due: {formatShortDate(d.dueDate)}{overdue ? ' — overdue' : ''}
              </p>
            )}
            {d.paidAmount > 0 && !d.paid && (
              <p style={{ fontSize: 11, color: d.direction === 'i_owe' ? 'var(--lavender)' : 'var(--sakura-deep)', fontWeight: 600, marginTop: 1 }}>Paid {VND(d.paidAmount)} of {VND(d.amount)} so far</p>
            )}
            {d.paid && d.paidDate && <p style={{ fontSize: 11, color: '#5AC26A', fontWeight: 600, marginTop: 1 }}>Paid on {formatShortDate(d.paidDate)}</p>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: d.paid ? 'var(--ink-2)' : 'var(--sakura-deep)' }}>{VND(d.paid ? d.amount : remaining)}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openEdit(d)} title="Edit" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✏️" size={13} /></button>
              <button onClick={() => setConfirmDeleteId(d.id)} title="Delete" style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 28, height: 28, color: 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={13} /></button>
            </div>
          </div>
        </div>
        {d.paid ? (
          <button onClick={() => resetDebtPayments(d.id)} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Undo — mark as unpaid</button>
        ) : (
          <button onClick={() => openPay(d)} style={{ width: '100%', marginTop: 10, padding: '8px', borderRadius: 10, border: 'none', background: d.direction === 'i_owe' ? 'linear-gradient(135deg, var(--lavender), #6B52B8)' : 'linear-gradient(135deg, #5AC26A, #3D8A4E)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>Log a payment <Icon emoji="💸" size={12} /></button>
        )}
      </div>
    );
  }

  function renderSection(label: string, icon: string, list: Debt[], unpaidTotal: number) {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 5 }}><Icon emoji={icon} size={12} /> {label}</p>
          {unpaidTotal > 0 && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--sakura-deep)' }}>{VND(unpaidTotal)}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(renderDebtCard)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Alvin / Paoi */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[currentUser, partnerName].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: filter === f ? '2px solid var(--sakura-accent)' : '1.5px solid var(--border)', background: filter === f ? 'var(--sakura-light)' : 'var(--bg)', color: filter === f ? 'var(--sakura-deep)' : 'var(--ink-2)', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {f}
            <FilterCountBadge count={state.debts.filter(d => d.createdBy === f || d.createdBy === 'Both').length} />
          </button>
        ))}
      </div>

      {/* Overview */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: unpaidCount > 0 ? 'var(--sakura-deep)' : 'var(--ink)' }}>{unpaidCount}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>Owing</p>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 8px' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: '#5AC26A' }}>{paidCount}</p>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, marginTop: 2 }}>Settled</p>
        </div>
      </div>

      <button onClick={openAdd} style={{
        width: '100%', padding: '11px', marginBottom: 20, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))',
        color: 'white', fontWeight: 700, fontSize: 14,
      }}>+ Log debt</button>

      {personDebts.length === 0 ? (
        <EmptyState icon="📒" title="No debts logged yet" sub={`Tap "+ Log debt" whenever ${filter} lends or borrows money.`} />
      ) : (
        <>
          {renderSection(`${filter} owes`, '📤', iOweList, iOweUnpaidTotal)}
          {renderSection(`Owed to ${filter}`, '📒', theyOweList, theyOweUnpaidTotal)}
        </>
      )}

      {(showForm || editing) && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={closeForm}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 20, width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="📒" size={18} /> {editing ? 'Edit debt' : 'Log a new debt'}</p>
              <button onClick={closeForm} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['they_owe', 'They owe you'], ['i_owe', 'You owe them']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setDirection(key)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: direction === key ? 'var(--sakura-light)' : 'var(--bg)', border: direction === key ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: direction === key ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{label}</button>
                ))}
              </div>
              <input className="input-field" placeholder={direction === 'they_owe' ? "Debtor's name" : 'Who do you owe?'} value={debtorName} onChange={e => setDebtorName(e.target.value)} autoFocus />
              <AmountInput placeholder="Amount (VND)" value={amount} onChange={setAmount} />
              <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Logged by</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
                    <button key={u} onClick={() => setCreatedByChoice(u)} style={{ flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: createdByChoice === u ? 'var(--sakura-light)' : 'var(--bg)', border: createdByChoice === u ? '1.5px solid var(--sakura-accent)' : '1.5px solid var(--border)', color: createdByChoice === u ? 'var(--sakura-deep)' : 'var(--ink-2)' }}>{u === 'Both' ? 'Both' : u}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>{direction === 'they_owe' ? 'Date lent' : 'Date borrowed'}</p>
                <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6, fontWeight: 500 }}>Due date (optional)</p>
                <input className="input-field" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
              </div>
              {/* A persisted preference, not a one-time action — logging or
                  editing the debt here never itself touches Expenses; this
                  only decides whether payments made on it afterward
                  (Log a payment) get mirrored there too. */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--bg)', cursor: 'pointer' }}>
                <input type="checkbox" checked={countInMoney} onChange={e => setCountInMoney(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: 'var(--sakura-accent)' }} />
                <span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block' }}>Also count payments in Expenses</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>
                    {direction === 'they_owe' ? 'Each payment logged toward this later will count as income.' : 'Each payment logged toward this later will count as an expense.'}
                  </span>
                </span>
              </label>
              {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
              <button onClick={handleSubmit} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', fontWeight: 700, fontSize: 15 }}>{editing ? 'Save changes' : 'Log debt'}</button>
            </div>
          </div>
        </div>
      )}

      {payingDebt && (
        <div className="kb-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setPayingDebt(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Icon emoji="💸" size={17} /> Log a payment</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>{payingDebt.direction === 'i_owe' ? `To ${payingDebt.debtorName}` : `From ${payingDebt.debtorName}`} — {VND(payingDebt.amount - payingDebt.paidAmount)} remaining</p>
            <AmountInput placeholder="Amount paid (VND)" value={paymentAmount} onChange={setPaymentAmount} />
            {paymentError && <p style={{ color: 'var(--sakura-deep)', fontSize: 13, marginTop: 8 }}>{paymentError}</p>}
            {payingDebt.countInMoney && (
              <p style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 8 }}>
                This will also be logged as {payingDebt.direction === 'i_owe' ? 'an expense' : 'income'} in the Expenses tab.
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setPayingDebt(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handlePay} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: payingDebt.direction === 'i_owe' ? 'linear-gradient(135deg, var(--lavender), #6B52B8)' : 'linear-gradient(135deg, #5AC26A, #3D8A4E)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Log payment</button>
            </div>
          </div>
        </div>
      )}

      {confirmingDebt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={() => setConfirmDeleteId(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 300, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Delete this debt?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20 }}>{confirmingDebt.debtorName} — {VND(confirmingDebt.amount)}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { deleteDebt(confirmingDebt.id); setConfirmDeleteId(null); }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', background: '#E8524A', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
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
