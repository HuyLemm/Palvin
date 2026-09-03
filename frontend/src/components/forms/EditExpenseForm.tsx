import { useState } from 'react';
import { useApp } from '../../context';
import AmountInput from '../AmountInput';
import Icon from '../Icon';
import type { Expense } from '../../types';

const EXPENSE_CATEGORIES = [
  { label: 'Food', emoji: '🍜' }, { label: 'Transportation', emoji: '🚗' },
  { label: 'Entertainment', emoji: '🎬' }, { label: 'Gifts', emoji: '🎁' },
  { label: 'Coffee', emoji: '☕' }, { label: 'Home', emoji: '🏠' },
  { label: 'Travel', emoji: '✈️' }, { label: 'Other', emoji: '📦' },
];

const INCOME_CATEGORIES = [
  { label: 'Salary', emoji: '💵' }, { label: 'Bonus', emoji: '🎉' },
  { label: 'Gift', emoji: '🎁' }, { label: 'Investment', emoji: '📈' },
  { label: 'Selling Stuff', emoji: '🛍️' }, { label: 'Other', emoji: '📦' },
];

export default function EditExpenseForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const { updateExpense, deleteExpense, currentUser, partnerProfile } = useApp();
  const partnerName = partnerProfile?.displayName;
  const isIncome = expense.type === 'income';
  const CATEGORIES = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const accent = isIncome ? '#5AC26A' : 'var(--sakura-accent)';
  const accentDeep = isIncome ? '#3D8A4E' : 'var(--sakura-deep)';
  const accentBg = isIncome ? 'rgba(90,194,106,0.12)' : 'var(--sakura-light)';

  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(Math.round(expense.amount)));
  const [category, setCategory] = useState(CATEGORIES.find(c => c.label === expense.category) ?? CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState<string>(expense.paidBy);
  const [date, setDate] = useState(expense.date);
  const [note, setNote] = useState(expense.note);
  const [error, setError] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = () => {
    if (!title.trim())     { setError(isIncome ? 'Please enter the income source.' : 'Please enter a title.'); return; }
    if (!amount || isNaN(+amount)) { setError('Please enter a valid amount.'); return; }
    setConfirmSave(true);
  };

  const confirmSubmit = async () => {
    setBusy(true);
    await updateExpense(expense.id, {
      title, category: category.label, categoryEmoji: category.emoji, amount: parseFloat(amount),
      paidBy, date, note, type: expense.type,
    });
    setConfirmSave(false);
    onClose();
  };

  const confirmDeleteNow = async () => {
    setBusy(true);
    await deleteExpense(expense.id);
    setConfirmDelete(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '20px', width: '100%', maxWidth: 380, maxHeight: 'calc(var(--app-vh, 100vh) * 0.8)', overflowY: 'auto', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{isIncome ? 'Edit Income' : 'Edit Expense'} <Icon emoji={isIncome ? '💵' : '💰'} size={16} /></p>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon emoji="✕" size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input className="input-field" placeholder={isIncome ? "What's the income source?" : 'What was it for?'} value={title} onChange={e => setTitle(e.target.value)} />
          <AmountInput placeholder="Amount" value={amount} onChange={setAmount} />
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>Category</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => setCategory(cat)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 99, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: category.label === cat.label ? accentBg : 'var(--bg)', border: category.label === cat.label ? `1.5px solid ${accent}` : '1.5px solid var(--border)', color: category.label === cat.label ? accentDeep : 'var(--ink-2)', transition: 'all 0.15s' }}>
                  <Icon emoji={cat.emoji} size={14} /> {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8, fontWeight: 500 }}>{isIncome ? 'Received by' : 'Paid by'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[currentUser, ...(partnerName ? [partnerName] : []), 'Both'].map(u => (
                <button key={u} onClick={() => setPaidBy(u)} style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: paidBy === u ? accentBg : 'var(--bg)', border: paidBy === u ? `1.5px solid ${accent}` : '1.5px solid var(--border)', color: paidBy === u ? accentDeep : 'var(--ink-2)', transition: 'all 0.15s' }}>{u}</button>
              ))}
            </div>
          </div>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', maxWidth: 170 }} />
          <input className="input-field" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
          {error && <p style={{ color: 'var(--sakura-deep)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '13px 16px', borderRadius: 14, border: '1.5px solid #E8524A', background: 'var(--white)', color: '#E8524A', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Delete</button>
            <button onClick={handleSubmit} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${accent}, ${accentDeep})`, color: 'white', fontWeight: 700, fontSize: 15 }}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* Confirm save */}
      {confirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Save these changes?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This transaction's info will be updated.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmSave(false)} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmSubmit} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${accent}, ${accentDeep})`, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
          <div style={{ background: 'var(--white)', borderRadius: 20, padding: 24, maxWidth: 280, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>Delete this transaction?</p>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>This can't be undone once deleted.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--white)', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmDeleteNow} disabled={busy} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
